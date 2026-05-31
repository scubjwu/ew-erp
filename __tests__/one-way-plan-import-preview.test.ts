import { describe, expect, it } from "vitest";

import {
  getImportableOneWayPlanImportRows,
  recomputeOneWayPlanImportPreviewRow,
  summarizeOneWayPlanImportRows,
} from "@/lib/one-way-plan-import-preview";
import type { OneWayPlanImportPreviewRow } from "@/types/one-way-planning";

function buildRow(
  overrides: Partial<OneWayPlanImportPreviewRow> = {}
): OneWayPlanImportPreviewRow {
  return {
    rowNo: 2,
    sheetName: "Offers APPROVED",
    status: "APPROVED",
    offerId: "7269",
    statusDate: "2023-04-19",
    applyDate: "2023-04-19",
    availabilityDate: "2023-04-04",
    lessee: "CMA",
    depotCandidates: [],
    selectedDepotId: null,
    selectedDepotCode: null,
    canChooseDepot: false,
    depotCode: "",
    pol: "CNNGB",
    pod: "USDAL / USDEN",
    sizeType: "20GP",
    condition: "CW",
    color: "",
    machineType: "",
    quantity: 10,
    authorizedQty: 10,
    remainingQty: 0,
    pickedUpQty: 10,
    nonPickedUpQty: 0,
    pickupCharge: 0,
    freeDays: 90,
    perDiem: 0,
    dpp: 0,
    shipperRequestId: "7269",
    onhireNo: "",
    remarks: "",
    validationResult: "",
    blockingErrors: [],
    fixHints: [],
    needsDepotSelection: false,
    depotSelectionBlockedReason: null,
    isValid: false,
    willImport: true,
    skipReason: null,
    errors: [],
    prepared: {
      status: "APPROVED",
      applyDate: "2023-04-19",
      availabilityDate: "2023-04-04",
      lesseeId: "lessee-1",
      depotId: null,
      polCityId: "city-1",
      pod: "USDAL / USDEN",
      sizeCodeId: "size-1",
      typeCodeId: "type-1",
      conditionCodeId: "condition-1",
      color: null,
      machineType: null,
      quantity: 10,
      authorizedQty: 10,
      remainingQty: 0,
      pickedUpQty: 10,
      nonPickedUpQty: 0,
      pickupCharge: 0,
      freeDays: 90,
      perDiem: 0,
      dpp: 0,
      carrier: "CMA",
      currency: "USD",
      rv: 0,
      shipperRequestId: "7269",
      onhireNo: "",
      remarks: "",
      sourceSheetName: "Offers APPROVED",
      sourceRowNumber: 2,
    },
    ...overrides,
  };
}

describe("recomputeOneWayPlanImportPreviewRow", () => {
  it("marks a row valid when the only depot candidate is already selected", () => {
    const row = buildRow({
      depotCandidates: [{ id: "depot-1", code: "CNNGBVDP" }],
      selectedDepotId: "depot-1",
      selectedDepotCode: "CNNGBVDP",
      canChooseDepot: true,
    });

    const result = recomputeOneWayPlanImportPreviewRow(row);

    expect(result.isValid).toBe(true);
    expect(result.canChooseDepot).toBe(true);
    expect(result.fixHints).toEqual([]);
    expect(result.prepared?.depotId).toBe("depot-1");
  });

  it("keeps a row invalid and explains depot selection when depot is required but unselected", () => {
    const row = buildRow({
      depotCandidates: [
        { id: "depot-1", code: "CNSHAVDP" },
        { id: "depot-2", code: "CNSHAALT" },
      ],
      canChooseDepot: true,
      selectedDepotId: null,
      selectedDepotCode: null,
      pol: "CNSHA",
    });

    const result = recomputeOneWayPlanImportPreviewRow(row);

    expect(result.isValid).toBe(false);
    expect(result.needsDepotSelection).toBe(true);
    expect(result.fixHints).toEqual(["Select a depot under POL city CNSHA"]);
    expect(result.prepared).toBeNull();
  });

  it("marks a row invalid when POL city has no depot master", () => {
    const row = buildRow({
      pol: "CNSZX",
      depotCandidates: [],
      canChooseDepot: false,
    });

    const result = recomputeOneWayPlanImportPreviewRow(row);

    expect(result.isValid).toBe(false);
    expect(result.blockingErrors).toContain("No depot found under POL city: CNSZX");
    expect(result.depotSelectionBlockedReason).toBe("No depot master found under POL city");
  });

  it("marks a row invalid when POL is not found in city master", () => {
    const row = buildRow({
      pol: "VNHPH",
      errors: ["POL not found: VNHPH"],
      depotCandidates: [],
    });

    const result = recomputeOneWayPlanImportPreviewRow(row);

    expect(result.isValid).toBe(false);
    expect(result.depotSelectionBlockedReason).toBe("POL not found in city master");
    expect(result.blockingErrors).toContain("POL not found: VNHPH");
  });

  it("preserves negative pickup charge rows as valid when no other errors exist", () => {
    const row = buildRow({
      pickupCharge: -50,
      depotCandidates: [{ id: "depot-1", code: "CNSHKVDP" }],
      selectedDepotId: "depot-1",
      selectedDepotCode: "CNSHKVDP",
      canChooseDepot: true,
      prepared: {
        ...buildRow().prepared!,
        pickupCharge: -50,
      },
    });

    const result = recomputeOneWayPlanImportPreviewRow(row);

    expect(result.isValid).toBe(true);
    expect(result.blockingErrors).toEqual([]);
    expect(result.prepared?.pickupCharge).toBe(-50);
  });

  it("summarizes valid, invalid, and importable rows for partial import", () => {
    const readyRow = recomputeOneWayPlanImportPreviewRow(
      buildRow({
        rowNo: 2,
        depotCandidates: [{ id: "depot-1", code: "CNSHKVDP" }],
        selectedDepotId: "depot-1",
        selectedDepotCode: "CNSHKVDP",
        canChooseDepot: true,
      })
    );
    const invalidRow = recomputeOneWayPlanImportPreviewRow(
      buildRow({
        rowNo: 3,
        pol: "VNHPH",
        errors: ["POL not found: VNHPH"],
      })
    );
    const duplicateRow = recomputeOneWayPlanImportPreviewRow(
      buildRow({
        rowNo: 4,
        depotCandidates: [{ id: "depot-2", code: "CNNGBVDP" }],
        selectedDepotId: "depot-2",
        selectedDepotCode: "CNNGBVDP",
        canChooseDepot: true,
        willImport: false,
        skipReason: "Duplicate offer ID",
      })
    );

    const summary = summarizeOneWayPlanImportRows([readyRow, invalidRow, duplicateRow]);

    expect(summary).toEqual({
      validRows: 2,
      invalidRows: 1,
      importableRows: 1,
    });
    expect(getImportableOneWayPlanImportRows([readyRow, invalidRow, duplicateRow])).toEqual([
      readyRow,
    ]);
  });
});
