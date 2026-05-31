import type {
  OneWayPlanImportPreparedRow,
  OneWayPlanImportPreviewRow,
} from "@/types/one-way-planning";

function hasBlockingPolError(errors: string[]) {
  return errors.some(
    (message) =>
      message.startsWith("POL not found:") || message.startsWith("POL must contain a single City Code:")
  );
}

function buildValidationResult(
  blockingErrors: string[],
  skipReason: string | null,
  fixHints: string[]
) {
  const segments = [...blockingErrors];
  if (skipReason) segments.push(skipReason);
  segments.push(...fixHints);
  return segments.length > 0 ? segments.join(" | ") : "Valid";
}

export function recomputeOneWayPlanImportPreviewRow(
  row: OneWayPlanImportPreviewRow
): OneWayPlanImportPreviewRow {
  const blockingErrors = [...row.errors];
  let depotSelectionBlockedReason: string | null = null;

  if (hasBlockingPolError(blockingErrors)) {
    depotSelectionBlockedReason = "POL not found in city master";
  } else if (row.pol && row.depotCandidates.length === 0) {
    blockingErrors.push(`No depot found under POL city: ${row.pol}`);
    depotSelectionBlockedReason = "No depot master found under POL city";
  }

  const needsDepotSelection =
    row.canChooseDepot && row.depotCandidates.length > 0 && !row.selectedDepotId;

  const fixHints = needsDepotSelection ? [`Select a depot under POL city ${row.pol}`] : [];
  const validationResult = buildValidationResult(blockingErrors, row.skipReason, fixHints);
  const isValid = blockingErrors.length === 0 && !needsDepotSelection;

  let prepared: OneWayPlanImportPreparedRow | null = null;
  if (isValid && row.prepared) {
    prepared = {
      ...row.prepared,
      depotId: row.selectedDepotId ?? row.prepared.depotId ?? null,
    };
  }

  return {
    ...row,
    depotCode: row.selectedDepotCode ?? row.depotCode,
    blockingErrors,
    fixHints,
    needsDepotSelection,
    depotSelectionBlockedReason,
    validationResult,
    isValid,
    prepared,
  };
}

export function summarizeOneWayPlanImportRows(rows: OneWayPlanImportPreviewRow[]) {
  const validRows = rows.filter((row) => row.isValid).length;
  return {
    validRows,
    invalidRows: rows.length - validRows,
    importableRows: rows.filter((row) => row.isValid && row.willImport && !!row.prepared).length,
  };
}

export function getImportableOneWayPlanImportRows(rows: OneWayPlanImportPreviewRow[]) {
  return rows.filter((row) => row.isValid && row.willImport && !!row.prepared);
}
