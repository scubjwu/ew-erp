import { describe, expect, it } from "vitest";

import { buildOwnedContainerInsertPayload } from "@/lib/container-master-payloads";

describe("container master payloads", () => {
  it("persists yom separately while keeping manufacture_date for compatibility", () => {
    expect(
      buildOwnedContainerInsertPayload({
        containerNumber: "TGHU1234567",
        color: "RAL1000",
        machineType: "GENSET",
        flp: true,
        lbx: false,
        lockingBarsCount: 3,
        ventsCount: 4,
        yom: 2024,
        ownerId: "owner-1",
        depotId: "depot-1",
        purchaseDate: "2026-05-25",
        purchasePrice: 1200,
        containerTypeCodeId: "type-1",
        containerConditionCodeId: "cond-1",
        containerSizeCodeId: "size-1",
      })
    ).toMatchObject({
      container_number: "TGHU1234567",
      yom: 2024,
      manufacture_date: "2024-01-01",
      vents: true,
      locking_bars: true,
      lifecycle_stage: "IN_YARD",
      status: "AVAILABLE",
    });
  });

  it("leaves yom and manufacture_date null when PO did not provide yom", () => {
    expect(
      buildOwnedContainerInsertPayload({
        containerNumber: "TGHU7654321",
        color: null,
        machineType: null,
        flp: false,
        lbx: false,
        lockingBarsCount: 0,
        ventsCount: 0,
        yom: null,
        ownerId: null,
        depotId: null,
        purchaseDate: null,
        purchasePrice: null,
        containerTypeCodeId: "type-1",
        containerConditionCodeId: "cond-1",
        containerSizeCodeId: "size-1",
      })
    ).toMatchObject({
      yom: null,
      manufacture_date: null,
      vents: false,
      locking_bars: false,
    });
  });
});
