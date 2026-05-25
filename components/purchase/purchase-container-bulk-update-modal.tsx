"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import type { PurchaseOrderContainer, PurchaseOrderContainerEditPatchInput } from "@/types/purchase";

type BulkFieldKey =
  | "yom"
  | "estimatedOfflineDate"
  | "offlineDate"
  | "machineType"
  | "tareWeight"
  | "maximumWeight"
  | "cscNumber";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemKey: string;
  allowEstimatedOfflineDate: boolean;
  allowNumberOnlyAssignment: boolean;
  allowedFields: BulkFieldKey[];
  onResolveRows: (containerNumbers: string[]) => Promise<PurchaseOrderContainer[]>;
  assignableRows: PurchaseContainerBulkAssignableRow[];
  itemRows: PurchaseContainerBulkAssignableRow[];
  onApply: (patches: PurchaseOrderContainerEditPatchInput[]) => void;
};

export type PurchaseContainerBulkAssignableRow = {
  id: string;
  itemKey: string;
  containerNumber: string | null;
  persistedContainerNumber: string | null;
};

const FIELD_OPTIONS: Array<{ key: BulkFieldKey; label: string }> = [
  { key: "yom", label: "YOM" },
  { key: "estimatedOfflineDate", label: "Estimated Offline Date" },
  { key: "offlineDate", label: "Offline Date / Release Date" },
  { key: "machineType", label: "Machine Type" },
  { key: "tareWeight", label: "Tare Weight" },
  { key: "maximumWeight", label: "Maximum Weight" },
  { key: "cscNumber", label: "CSC Number" },
];

const HEADER_ALIASES: Record<string, BulkFieldKey | "containerNumber"> = {
  containernumber: "containerNumber",
  container: "containerNumber",
  containerno: "containerNumber",
  boxnumber: "containerNumber",
  boxno: "containerNumber",
  yom: "yom",
  yearofmanufacture: "yom",
  estimatedofflinedate: "estimatedOfflineDate",
  estimatedoffline: "estimatedOfflineDate",
  estofflinedate: "estimatedOfflineDate",
  offlinedate: "offlineDate",
  releasedate: "offlineDate",
  offlinedatereleasedate: "offlineDate",
  machinetype: "machineType",
  tareweight: "tareWeight",
  maximumweight: "maximumWeight",
  maxweight: "maximumWeight",
  cscnumber: "cscNumber",
  cscno: "cscNumber",
};

const MANUAL_CONTAINER_NUMBER_PATTERN = /^[A-Z]{4}\d{7}$/;

function parseGrid(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split("\t").map((cell) => cell.trim()));
}

function normalizeContainerNumber(value: string) {
  return value.trim().toUpperCase();
}

function isValidContainerNumber(value: string) {
  return MANUAL_CONTAINER_NUMBER_PATTERN.test(value);
}

function isAssignableBlankRow(row: PurchaseContainerBulkAssignableRow) {
  return (
    !normalizeContainerNumber(row.persistedContainerNumber ?? "") &&
    !normalizeContainerNumber(row.containerNumber ?? "")
  );
}

function buildNumberOnlyAssignmentPlan(args: {
  pastedNumbers: string[];
  itemRows: PurchaseContainerBulkAssignableRow[];
  assignableRows: PurchaseContainerBulkAssignableRow[];
}) {
  const duplicates = new Set<string>();
  const seen = new Set<string>();
  for (const containerNumber of args.pastedNumbers) {
    if (seen.has(containerNumber)) {
      duplicates.add(containerNumber);
    }
    seen.add(containerNumber);
  }
  if (duplicates.size > 0) {
    return {
      validCount: 0,
      assignableCount: 0,
      targetRows: [] as PurchaseContainerBulkAssignableRow[],
      error: `Duplicate container numbers found: ${Array.from(duplicates).join(", ")}.`,
    };
  }

  const invalid = args.pastedNumbers.find((containerNumber) => !isValidContainerNumber(containerNumber));
  if (invalid) {
    return {
      validCount: 0,
      assignableCount: 0,
      targetRows: [] as PurchaseContainerBulkAssignableRow[],
      error: `${invalid}: Container Number must match 4 letters followed by 7 digits.`,
    };
  }

  const targetRows = args.assignableRows.filter(isAssignableBlankRow);
  if (args.pastedNumbers.length > targetRows.length) {
    return {
      validCount: 0,
      assignableCount: targetRows.length,
      targetRows,
      error: `Pasted ${args.pastedNumbers.length} container numbers, but only ${targetRows.length} blank container lines are available.`,
    };
  }

  const simulatedAssignments = new Map<string, string>();
  targetRows.slice(0, args.pastedNumbers.length).forEach((row, index) => {
    const nextValue = args.pastedNumbers[index];
    if (nextValue) {
      simulatedAssignments.set(row.id, nextValue);
    }
  });

  const finalSeen = new Set<string>();
  const conflictingValue = args.itemRows.find((row) => {
    const nextValue = normalizeContainerNumber(
      simulatedAssignments.get(row.id) ?? row.containerNumber ?? ""
    );
    if (!nextValue) return false;
    if (finalSeen.has(nextValue)) return true;
    finalSeen.add(nextValue);
    return false;
  });

  if (conflictingValue) {
    const conflictingNextValue = normalizeContainerNumber(
      simulatedAssignments.get(conflictingValue.id) ?? conflictingValue.containerNumber ?? ""
    );
    return {
      validCount: 0,
      assignableCount: targetRows.length,
      targetRows,
      error: `${conflictingNextValue}: Container Number already exists on another line in this item.`,
    };
  }

  return {
    validCount: args.pastedNumbers.length,
    assignableCount: targetRows.length,
    targetRows,
    error: null as string | null,
  };
}

function normalizeHeaderKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function resolveHeaderAlias(rawValue: string) {
  const normalized = normalizeHeaderKey(rawValue);
  if (!normalized) return null;
  return HEADER_ALIASES[normalized] ?? null;
}

function isDateLikeValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) || /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed);
}

function normalizeDateValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const normalized = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    const parsed = new Date(`${normalized}T00:00:00Z`);
    return Number.isNaN(parsed.getTime()) ? null : normalized;
  }

  const usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const [, month, day, year] = usMatch;
    const normalized = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    const parsed = new Date(`${normalized}T00:00:00Z`);
    return Number.isNaN(parsed.getTime()) ? null : normalized;
  }

  return null;
}

function validateFieldValue(field: BulkFieldKey, value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return { valid: true as const, touched: false as const, normalized: null as string | number | null };
  }

  switch (field) {
    case "yom": {
      const parsed = Number(trimmed);
      if (!Number.isInteger(parsed) || parsed < 1900 || parsed > 2100) {
        return { valid: false as const, reason: "YOM must be a valid year between 1900 and 2100." };
      }
      return { valid: true as const, touched: true as const, normalized: parsed };
    }
    case "tareWeight":
    case "maximumWeight": {
      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed)) {
        return { valid: false as const, reason: "Weight fields must be numeric." };
      }
      return { valid: true as const, touched: true as const, normalized: parsed };
    }
    case "estimatedOfflineDate":
    case "offlineDate": {
      const normalized = normalizeDateValue(trimmed);
      if (!normalized) {
        return { valid: false as const, reason: "Date fields must be a valid date." };
      }
      return { valid: true as const, touched: true as const, normalized };
    }
    case "machineType":
    case "cscNumber":
      return { valid: true as const, touched: true as const, normalized: trimmed };
  }
}

function inferFallbackMappings(
  rows: string[][],
  allowedFields: BulkFieldKey[],
  allowEstimatedOfflineDate: boolean
) {
  const nextDateFields = allowedFields.filter(
    (field) =>
      field === "offlineDate" || (field === "estimatedOfflineDate" && allowEstimatedOfflineDate)
  );
  const nextNumericFields = allowedFields.filter(
    (field) => field === "tareWeight" || field === "maximumWeight"
  );
  const nextTextFields = allowedFields.filter(
    (field) => field === "machineType" || field === "cscNumber"
  );
  const allowYom = allowedFields.includes("yom");

  let dateIndex = 0;
  let numericIndex = 0;
  let textIndex = 0;
  let usedYom = false;

  return (rows[0] ?? []).map((_, index) => {
    if (index === 0) return null;

    const values = rows
      .map((row) => String(row[index] ?? "").trim())
      .filter(Boolean);

    if (values.length === 0) return null;

    if (values.every((value) => isDateLikeValue(value))) {
      const mapped = nextDateFields[dateIndex] ?? null;
      if (mapped) dateIndex += 1;
      return mapped;
    }

    if (values.every((value) => Number.isFinite(Number(value)))) {
      const numericValues = values.map((value) => Number(value));
      const looksLikeYom =
        !usedYom &&
        allowYom &&
        numericValues.every(
          (value) => Number.isInteger(value) && value >= 1900 && value <= 2100
        );
      if (looksLikeYom) {
        usedYom = true;
        return "yom";
      }
      const mapped = nextNumericFields[numericIndex] ?? null;
      if (mapped) numericIndex += 1;
      return mapped;
    }

    const mapped = nextTextFields[textIndex] ?? null;
    if (mapped) textIndex += 1;
    return mapped;
  });
}

function inferHeaderMappings(
  headerRow: string[],
  allowedFields: BulkFieldKey[],
  allowEstimatedOfflineDate: boolean
) {
  const allowed = new Set(
    allowedFields.filter(
      (field) => field !== "estimatedOfflineDate" || allowEstimatedOfflineDate
    )
  );

  const mappings = headerRow.map((cell, index) => {
    const alias = resolveHeaderAlias(cell);
    if (index === 0) {
      return alias === "containerNumber" ? null : null;
    }
    if (!alias || alias === "containerNumber") return null;
    return allowed.has(alias) ? alias : null;
  });

  const firstIsContainer =
    resolveHeaderAlias(String(headerRow[0] ?? "")) === "containerNumber";
  const hasAnyMappedField = mappings.slice(1).some(Boolean);

  return {
    hasHeader: firstIsContainer && hasAnyMappedField,
    mappings,
  };
}

export function PurchaseContainerBulkUpdateModal({
  open,
  onOpenChange,
  itemKey,
  allowEstimatedOfflineDate,
  allowNumberOnlyAssignment,
  allowedFields,
  onResolveRows,
  assignableRows,
  itemRows,
  onApply,
}: Props) {
  const [rawPaste, setRawPaste] = useState("");
  const [columnMappings, setColumnMappings] = useState<(BulkFieldKey | null)[]>([]);
  const [hasHeaderRow, setHasHeaderRow] = useState(false);
  const [baseRows, setBaseRows] = useState<Map<string, PurchaseOrderContainer>>(new Map());
  const [loading, setLoading] = useState(false);

  const grid = useMemo(() => parseGrid(rawPaste), [rawPaste]);
  const dataRows = useMemo(() => (hasHeaderRow ? grid.slice(1) : grid), [grid, hasHeaderRow]);
  const containerNumbers = useMemo(
    () =>
      Array.from(
        new Set(
          dataRows
            .map((row) => normalizeContainerNumber(String(row[0] ?? "")))
            .filter(Boolean)
        )
      ),
    [dataRows]
  );
  const numberOnlyRows = useMemo(
    () =>
      dataRows
        .map((row) => normalizeContainerNumber(String(row[0] ?? "")))
        .filter(Boolean),
    [dataRows]
  );
  const isNumberOnlyMode = useMemo(() => {
    if (!allowNumberOnlyAssignment || dataRows.length === 0) return false;
    return dataRows.every((row) => row.length <= 1);
  }, [allowNumberOnlyAssignment, dataRows]);

  const selectableFields = useMemo(
    () =>
      FIELD_OPTIONS.filter(
        (field) =>
          allowedFields.includes(field.key) &&
          (field.key !== "estimatedOfflineDate" || allowEstimatedOfflineDate)
      ),
    [allowEstimatedOfflineDate, allowedFields]
  );

  useEffect(() => {
    if (!open) {
      setRawPaste("");
      setColumnMappings([]);
      setHasHeaderRow(false);
      setBaseRows(new Map());
      return;
    }
    if (grid.length === 0) {
      setColumnMappings([]);
      setHasHeaderRow(false);
      return;
    }
    const allowedKeys = selectableFields.map((field) => field.key);
    const headerInference = inferHeaderMappings(grid[0] ?? [], allowedKeys, allowEstimatedOfflineDate);
    if (headerInference.hasHeader) {
      setHasHeaderRow(true);
      setColumnMappings(headerInference.mappings);
      return;
    }
    setHasHeaderRow(false);
    setColumnMappings(inferFallbackMappings(grid, allowedKeys, allowEstimatedOfflineDate));
  }, [grid, open, selectableFields]);

  useEffect(() => {
    let alive = true;
    async function loadBaseRows() {
      if (!open || isNumberOnlyMode || containerNumbers.length === 0) {
        setBaseRows(new Map());
        return;
      }
      setLoading(true);
      try {
        const rows = await onResolveRows(containerNumbers);
        if (!alive) return;
        setBaseRows(
          new Map(
            rows.map((row) => [normalizeContainerNumber(row.containerNumber ?? ""), row] as const)
          )
        );
      } catch (error) {
        if (!alive) return;
        console.error("Failed to resolve purchase containers for bulk update:", error);
        toast({
          title: "Failed to load container data.",
          variant: "destructive",
        });
      } finally {
        if (alive) setLoading(false);
      }
    }
    void loadBaseRows();
    return () => {
      alive = false;
    };
  }, [containerNumbers, isNumberOnlyMode, onResolveRows, open]);

  const numberOnlyPreview = useMemo(() => {
    if (!isNumberOnlyMode) {
      return {
        validCount: 0,
        assignableCount: 0,
        targetRows: [] as PurchaseContainerBulkAssignableRow[],
        error: null as string | null,
      };
    }

    return buildNumberOnlyAssignmentPlan({
      pastedNumbers: numberOnlyRows,
      itemRows,
      assignableRows,
    });
  }, [assignableRows, isNumberOnlyMode, itemRows, numberOnlyRows]);

  function handleApply() {
    if (isNumberOnlyMode) {
      if (numberOnlyPreview.error) {
        toast({
          title: "Some bulk update values are invalid.",
          description: numberOnlyPreview.error,
          variant: "destructive",
        });
        return;
      }

      const patches = numberOnlyPreview.targetRows.slice(0, numberOnlyRows.length).map((row, index) => ({
        id: row.id,
        itemKey,
        containerNumber: numberOnlyRows[index]!,
      }));

      if (patches.length === 0) {
        toast({ title: "No valid container updates to apply." });
        return;
      }

      onApply(patches);
      onOpenChange(false);
      return;
    }

    const patches = new Map<string, PurchaseOrderContainerEditPatchInput>();
    const validationErrors: string[] = [];

    for (const row of dataRows) {
      const normalizedContainerNumber = normalizeContainerNumber(String(row[0] ?? ""));
      if (!normalizedContainerNumber) continue;
      const baseRow = baseRows.get(normalizedContainerNumber);
      if (!baseRow) continue;

      const patch = patches.get(baseRow.id) ?? { id: baseRow.id, itemKey };
      let touchedField = false;

      for (let columnIndex = 1; columnIndex < row.length; columnIndex += 1) {
        const field = columnMappings[columnIndex];
        if (!field) continue;
        const validation = validateFieldValue(field, String(row[columnIndex] ?? ""));
        if (!validation.valid) {
          validationErrors.push(
            `${normalizedContainerNumber}: ${FIELD_OPTIONS.find((option) => option.key === field)?.label ?? field} - ${validation.reason}`
          );
          continue;
        }
        if (!validation.touched) {
          continue;
        }
        const nextValue = validation.normalized;
        switch (field) {
          case "yom":
            patch.yom = typeof nextValue === "number" ? nextValue : null;
            touchedField = true;
            break;
          case "estimatedOfflineDate":
            patch.estimatedOfflineDate = typeof nextValue === "string" ? nextValue : null;
            touchedField = true;
            break;
          case "offlineDate":
            patch.offlineDate = typeof nextValue === "string" ? nextValue : null;
            touchedField = true;
            break;
          case "machineType":
            patch.machineType = typeof nextValue === "string" ? nextValue : null;
            touchedField = true;
            break;
          case "tareWeight":
            patch.tareWeight = typeof nextValue === "number" ? nextValue : null;
            touchedField = true;
            break;
          case "maximumWeight":
            patch.maximumWeight = typeof nextValue === "number" ? nextValue : null;
            touchedField = true;
            break;
          case "cscNumber":
            patch.cscNumber = typeof nextValue === "string" ? nextValue : null;
            touchedField = true;
            break;
        }
      }

      if (touchedField) {
        patches.set(baseRow.id, patch);
      }
    }

    if (validationErrors.length > 0) {
      toast({
        title: "Some bulk update values are invalid.",
        description: validationErrors.slice(0, 5).join(" "),
        variant: "destructive",
      });
      return;
    }

    if (patches.size === 0) {
      toast({ title: "No valid container updates to apply." });
      return;
    }

    onApply(Array.from(patches.values()));
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>Excel Bulk Update - Containers</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Textarea
            value={rawPaste}
            onChange={(event) => setRawPaste(event.target.value)}
            className="min-h-[120px] font-mono text-xs"
            placeholder="Paste container updates from Excel..."
          />

          <div className="max-h-[420px] overflow-auto rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/95">
                <TableRow>
                  {(grid[0] ?? ["Container Number"]).map((_, columnIndex) => (
                    <TableHead key={`map-${columnIndex}`} className="min-w-[160px] px-2 py-1">
                      {columnIndex === 0 ? (
                        <div className="text-xs font-semibold">Container Number</div>
                      ) : (
                        <Select
                          value={columnMappings[columnIndex] ?? "__none__"}
                          onValueChange={(value) =>
                            setColumnMappings((current) => {
                              const next = [...current];
                              next[columnIndex] = value === "__none__" ? null : (value as BulkFieldKey);
                              return next;
                            })
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Map field..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Ignore Column</SelectItem>
                            {selectableFields.map((field) => (
                              <SelectItem key={field.key} value={field.key}>
                                {field.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {dataRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={Math.max(1, grid[0]?.length ?? 1)}
                      className="py-6 text-center text-xs text-muted-foreground"
                    >
                      Paste data to start mapping and preview.
                    </TableCell>
                  </TableRow>
                ) : (
                  dataRows.map((row, rowIndex) => {
                    const normalizedContainerNumber = normalizeContainerNumber(String(row[0] ?? ""));
                    const baseRow = baseRows.get(normalizedContainerNumber);
                    const isMissing = normalizedContainerNumber.length > 0 && !baseRow;

                    return (
                      <TableRow key={`row-${rowIndex}`} className={isMissing ? "text-muted-foreground" : ""}>
                        {row.map((cell, columnIndex) => (
                          <TableCell key={`cell-${rowIndex}-${columnIndex}`} className="px-2 py-1 text-xs">
                            {columnIndex === 0 ? cell || "—" : cell || "—"}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="text-xs text-muted-foreground">
            {isNumberOnlyMode
              ? numberOnlyPreview.error
                ? numberOnlyPreview.error
                : `${numberOnlyPreview.validCount} container number(s) will be assigned into blank rows in this PO edit draft.`
              : loading
                ? "Loading matching containers..."
                : `${baseRows.size} matched container(s) will be staged into this PO edit draft.`}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleApply}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
