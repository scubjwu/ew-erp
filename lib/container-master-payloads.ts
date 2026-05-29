type OwnedContainerInsertPayloadInput = {
  containerNumber: string;
  color: string | null;
  machineType: string | null;
  flp: boolean;
  lbx: boolean;
  lockingBarsCount: number | null;
  ventsCount: number | null;
  yom: number | null;
  ownerId: string | null;
  depotId: string | null;
  purchaseDate: string | null;
  purchasePrice: number | null;
  containerTypeCodeId: string | null;
  containerConditionCodeId: string | null;
  containerSizeCodeId: string | null;
};

function normalizeNullableInteger(value: number | null): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.trunc(value);
}

export function buildOwnedContainerInsertPayload(
  input: OwnedContainerInsertPayloadInput
) {
  const normalizedYom = normalizeNullableInteger(input.yom);
  const normalizedLockingBarsCount = normalizeNullableInteger(
    input.lockingBarsCount
  );
  const normalizedVentsCount = normalizeNullableInteger(input.ventsCount);

  return {
    container_number: input.containerNumber,
    color: input.color,
    machine_type: input.machineType,
    yom: normalizedYom,
    flp: Boolean(input.flp),
    lbx: Boolean(input.lbx),
    locking_bars: (normalizedLockingBarsCount ?? 0) > 0,
    vents: normalizedVentsCount,
    manufacture_date: normalizedYom ? `${normalizedYom}-01-01` : null,
    owner_type: "OWN" as const,
    owner_id: input.ownerId,
    lifecycle_stage: "IN_YARD" as const,
    status: "AVAILABLE" as const,
    current_depot_id: input.depotId,
    purchase_date: input.purchaseDate,
    purchase_price: input.purchasePrice,
    container_type_code_id: input.containerTypeCodeId,
    container_condition_code_id: input.containerConditionCodeId,
    container_size_code_id: input.containerSizeCodeId,
  };
}
