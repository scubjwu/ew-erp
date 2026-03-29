"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
import { fetchInventoryData } from "@/lib/supabase/inventory-api";
import type { InventoryRow } from "@/types/inventory";

export type BulkChange = {
  rowId: string;
  field: string;
  newValue: string;
};

type BulkPasteUpdateModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: any[];
  onApply: (changes: BulkChange[]) => void;
};

const EMPTY_DATES = {
  etaFrom: "",
  etaTo: "",
  salesDateFrom: "",
  salesDateTo: "",
  onHireFrom: "",
  onHireTo: "",
};

const EDITABLE_FIELDS: Array<{ label: string; key: string }> = [
  { label: "ETA", key: "eta" },
  { label: "POD", key: "pod" },
  { label: "Carrier", key: "carrier" },
  { label: "Status", key: "status" },
  { label: "Sales Date", key: "salesDate" },
  { label: "Sales Rep", key: "salesRep" },
  { label: "Customer", key: "customer" },
  { label: "Price", key: "price" },
  { label: "Customer Order #", key: "customerOrderNum" },
  { label: "Depot Name", key: "depotName" },
  { label: "Depot Address", key: "depotAddr" },
  { label: "Depot Tel", key: "depotTel" },
  { label: "Gate in Ref", key: "gateInRef" },
  { label: "Other Redelivery Instruction", key: "remark2" },
  { label: "Followup Remark", key: "remark1" },
];

const HEADER_ALIASES: Record<string, string> = {
  unit: "unit",
  unitnumber: "unit",
  container: "unit",
  containernumber: "unit",
  eta: "eta",
  pod: "pod",
  carrier: "carrier",
  status: "status",
  salesdate: "salesDate",
  salesrep: "salesRep",
  customer: "customer",
  price: "price",
  customerorder: "customerOrderNum",
  customerorderno: "customerOrderNum",
  customerordernumber: "customerOrderNum",
  depotname: "depotName",
  depotaddress: "depotAddr",
  depotaddr: "depotAddr",
  depottel: "depotTel",
  gateinref: "gateInRef",
  gatein: "gateInRef",
  otherredeliveryinstruction: "remark2",
  followupremark: "remark1",
  remark: "remark1",
};

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function buildHeaderMappings(header: string[]): { mappings: (string | null)[]; hasHeader: boolean } {
  const mapped = header.map((h, idx) => {
    if (idx === 0) return "unit";
    return HEADER_ALIASES[norm(h)] ?? null;
  });
  const firstLooksUnit = mapped[0] === "unit";
  const hasAnyMapped = mapped.slice(1).some(Boolean);
  return { mappings: mapped, hasHeader: firstLooksUnit && hasAnyMapped };
}

function appendRemark(existing: string, remark: string, user: string = "OpsUser"): string {
  const text = remark?.trim() || "";
  if (!text) return existing || "";
  const stamp = new Date().toISOString().slice(0, 10);
  const prefixed = `[${stamp} ${user}] ${text}`;
  return existing ? `${existing}\n${prefixed}` : prefixed;
}

export function BulkPasteUpdateModal({
  open,
  onOpenChange,
  rows: _rows,
  onApply,
}: BulkPasteUpdateModalProps) {
  const [rawPaste, setRawPaste] = useState("");
  const [parsedGrid, setParsedGrid] = useState<string[][]>([]);
  const [columnMappings, setColumnMappings] = useState<(string | null)[]>([]);
  const [hasHeaderRow, setHasHeaderRow] = useState(false);
  const [baseData, setBaseData] = useState<Map<string, InventoryRow>>(new Map());
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    const lines = rawPaste
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const grid = lines.map((line) => line.split("\t").map((cell) => cell.trim()));
    setParsedGrid(grid);
  }, [rawPaste]);

  useEffect(() => {
    if (parsedGrid.length === 0) {
      setColumnMappings([]);
      setHasHeaderRow(false);
      return;
    }
    const firstRow = parsedGrid[0];
    const { mappings, hasHeader } = buildHeaderMappings(firstRow);
    setHasHeaderRow(hasHeader);
    if (hasHeader) {
      setColumnMappings(mappings);
      return;
    }
    const fallback = firstRow.map((_, idx) => (idx === 0 ? "unit" : null));
    setColumnMappings(fallback);
  }, [parsedGrid]);

  const dataRows = useMemo(
    () => (hasHeaderRow ? parsedGrid.slice(1) : parsedGrid),
    [hasHeaderRow, parsedGrid]
  );

  const pasteUnits = useMemo(
    () =>
      Array.from(
        new Set(
          dataRows
            .map((row) => String(row[0] ?? "").trim().toUpperCase())
            .filter((u) => u.length > 0)
        )
      ),
    [dataRows]
  );

  useEffect(() => {
    let alive = true;
    async function loadBaseData() {
      if (pasteUnits.length === 0) {
        setBaseData(new Map());
        return;
      }
      setIsFetching(true);
      try {
        const fetched = await fetchInventoryData({
          pasteUnits,
          textFilters: {},
          dateFilters: EMPTY_DATES,
        });
        if (!alive) return;
        setBaseData(
          new Map(
            fetched.map((row) => [String(row.unit).trim().toUpperCase(), row] as const)
          )
        );
      } catch (error) {
        if (!alive) return;
        console.error("Failed to fetch base inventory for bulk import:", error);
        toast({
          title: "Failed to fetch base data.",
          variant: "destructive",
        });
      } finally {
        if (alive) setIsFetching(false);
      }
    }
    void loadBaseData();
    return () => {
      alive = false;
    };
  }, [pasteUnits]);

  const validChangeCount = useMemo(() => {
    let total = 0;
    for (const row of dataRows) {
      const unit = String(row[0] ?? "").trim().toUpperCase();
      const baseRow = baseData.get(unit);
      if (!baseRow) continue;
      for (let c = 1; c < row.length; c++) {
        const field = columnMappings[c];
        if (!field) continue;
        const nextVal = String(row[c] ?? "");
        const prevVal = String((baseRow as any)?.[field] ?? "");
        const finalVal =
          field === "remark1" ? appendRemark(prevVal, nextVal) : nextVal;
        if (finalVal !== prevVal) total += 1;
      }
    }
    return total;
  }, [baseData, columnMappings, dataRows]);

  const setMappingAt = (index: number, field: string) => {
    setColumnMappings((prev) => {
      const next = [...prev];
      next[index] = field || null;
      return next;
    });
  };

  async function handleSave() {
    const changes: BulkChange[] = [];
    for (const row of dataRows) {
      const unit = String(row[0] ?? "").trim().toUpperCase();
      const baseRow = baseData.get(unit);
      if (!baseRow) continue;
      for (let c = 1; c < row.length; c++) {
        const field = columnMappings[c];
        if (!field) continue;
        const newCellValue = String(row[c] ?? "");
        const prevVal = String((baseRow as any)?.[field] ?? "");
        const compareValue =
          field === "remark1" ? appendRemark(baseRow.remark1 || "", newCellValue) : newCellValue;
        if (compareValue === prevVal) continue;
        changes.push({
          rowId: baseRow.id,
          field,
          newValue: newCellValue,
        });
      }
    }
    if (changes.length === 0) {
      toast({ title: "No valid changes to save." });
      return;
    }
    onApply(changes);
    setRawPaste("");
    setParsedGrid([]);
    setColumnMappings([]);
    setBaseData(new Map());
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>Excel Bulk Update - Multi-Column Smart Importer</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Textarea
            value={rawPaste}
            onChange={(e) => setRawPaste(e.target.value)}
            className="min-h-[120px] font-mono text-xs"
            placeholder="Paste multi-column data from Excel..."
          />

          <div className="max-h-[420px] overflow-auto rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/95">
                <TableRow>
                  {(parsedGrid[0] ?? ["Unit Number"]).map((_, colIdx) => (
                    <TableHead key={`map-${colIdx}`} className="min-w-[160px] px-2 py-1">
                      {colIdx === 0 ? (
                        <div className="text-xs font-semibold">Unit Number</div>
                      ) : (
                        <Select
                          value={columnMappings[colIdx] ?? "__none__"}
                          onValueChange={(v) =>
                            setMappingAt(colIdx, v === "__none__" ? "" : v)
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Map field..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Ignore Column</SelectItem>
                            {EDITABLE_FIELDS.map((field) => (
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
                {dataRows.length === 0 && (
                  <TableRow>
                    <TableCell
                      className="py-6 text-center text-xs text-muted-foreground"
                      colSpan={Math.max(1, parsedGrid[0]?.length ?? 1)}
                    >
                      Paste data to start mapping and preview.
                    </TableCell>
                  </TableRow>
                )}
                {dataRows.map((row, rIdx) => {
                  const unit = String(row[0] ?? "").trim().toUpperCase();
                  const baseRow = baseData.get(unit);
                  const isMissing = unit.length > 0 && !baseRow;
                  return (
                    <TableRow key={`row-${rIdx}`} className={isMissing ? "text-muted-foreground" : ""}>
                      {row.map((cell, cIdx) => {
                        if (cIdx === 0) {
                          return (
                            <TableCell key={`c-${rIdx}-${cIdx}`} className="px-2 py-1 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-mono">{cell || "—"}</span>
                                {isMissing ? (
                                  <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                                    Not in DB
                                  </Badge>
                                ) : null}
                              </div>
                            </TableCell>
                          );
                        }

                        const mappedField = columnMappings[cIdx];
                        if (!mappedField || !baseRow) {
                          return (
                            <TableCell key={`c-${rIdx}-${cIdx}`} className="px-2 py-1 text-xs">
                              <span className="text-muted-foreground">{cell || "—"}</span>
                            </TableCell>
                          );
                        }

                        const oldVal = String((baseRow as any)?.[mappedField] ?? "");
                        const newVal = String(cell ?? "");
                        const previewVal =
                          mappedField === "remark1"
                            ? appendRemark(oldVal, newVal)
                            : newVal;
                        const changed = oldVal !== previewVal;
                        return (
                          <TableCell key={`c-${rIdx}-${cIdx}`} className="px-2 py-1 text-xs">
                            <span className={changed ? "text-foreground" : "text-muted-foreground"}>
                              {oldVal || "—"} {"->"} {previewVal || "—"}
                            </span>
                            {mappedField === "remark1" ? (
                              <span className="ml-2 text-[10px] uppercase tracking-wide text-amber-600">
                                append
                              </span>
                            ) : null}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Units: {pasteUnits.length} | Matched: {baseData.size} | Changes: {validChangeCount}
            </span>
            {isFetching ? <span>Fetching base data...</span> : null}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={validChangeCount === 0 || isFetching}
            onClick={handleSave}
          >
            Save Multi-Column Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
