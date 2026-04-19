import { describe, expect, it } from "vitest";

import { getPurchaseOrderEditPermissions } from "@/types/purchase";

describe("getPurchaseOrderEditPermissions", () => {
  it("allows full draft editing for factory orders", () => {
    expect(getPurchaseOrderEditPermissions("FACTORY_ORDER", "DRAFT")).toEqual({
      canEnterEdit: true,
      canSaveDraftLikeChanges: true,
      canSubmitChanges: true,
      editableFieldSet: "all",
      requiresMandatoryValidationOnSubmit: true,
      requiresAtLeastOneItemOnSubmit: true,
    });
  });

  it("limits factory in-production editing to progress fields and submit only", () => {
    expect(getPurchaseOrderEditPermissions("FACTORY_ORDER", "IN_PRODUCTION")).toEqual({
      canEnterEdit: true,
      canSaveDraftLikeChanges: false,
      canSubmitChanges: true,
      editableFieldSet: "factory_progress_limited",
      requiresMandatoryValidationOnSubmit: true,
      requiresAtLeastOneItemOnSubmit: true,
    });
  });

  it("blocks released factory orders from edit entry", () => {
    expect(getPurchaseOrderEditPermissions("FACTORY_ORDER", "RELEASED").canEnterEdit).toBe(
      false
    );
  });

  it("allows released used-container orders to submit edits", () => {
    expect(getPurchaseOrderEditPermissions("USED_CONTAINER", "RELEASED")).toEqual({
      canEnterEdit: true,
      canSaveDraftLikeChanges: false,
      canSubmitChanges: true,
      editableFieldSet: "all",
      requiresMandatoryValidationOnSubmit: true,
      requiresAtLeastOneItemOnSubmit: true,
    });
  });

  it("blocks completed and cancelled orders for non-factory types", () => {
    expect(getPurchaseOrderEditPermissions("NEW_CONTAINER", "COMPLETED").canEnterEdit).toBe(
      false
    );
    expect(getPurchaseOrderEditPermissions("USED_CONTAINER", "CANCELLED").canEnterEdit).toBe(
      false
    );
  });
});
