"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { updateOneWayPlan } from "@/app/dispatch/one-way-planning/actions";
import { SearchableAutocompleteInput } from "@/components/purchase/searchable-autocomplete-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";
import type {
  OneWayPlanEditDraft,
  OneWayPlanFormOptions,
  OneWayPlanStatus,
  OneWayPlanUpdateInput,
} from "@/types/one-way-planning";
import { ONE_WAY_PLAN_STATUSES } from "@/types/one-way-planning";

type Props = {
  draft: OneWayPlanEditDraft;
  options: OneWayPlanFormOptions;
};

type AutocompleteInputs = {
  lesseeId: string;
  depotId: string;
  polCityId: string;
  color: string;
};

type FormState = {
  status: OneWayPlanStatus;
  applyDate: string;
  availabilityDate: string;
  arrangedDispatchDate: string;
  lesseeId: string;
  onhireNo: string;
  shipperRequestId: string;
  depotId: string;
  polCityId: string;
  pod: string;
  sizeCodeId: string;
  typeCodeId: string;
  conditionCodeId: string;
  color: string;
  machineType: string;
  quantity: string;
  authorizedQty: string;
  remainingQty: string;
  pickedUpQty: string;
  nonPickedUpQty: string;
  pickupCharge: string;
  freeDays: string;
  perDiem: string;
  dpp: string;
  carrier: string;
  currency: string;
  rv: string;
  remarks: string;
};

type SizeTypeOption = {
  value: string;
  label: string;
};

function normalizePodCodes(value: string, validCityCodes: string[]) {
  const validCodeSet = new Set(validCityCodes.map((code) => code.trim().toUpperCase()).filter(Boolean));
  const matches = value.toUpperCase().match(/[A-Z]{5}/g) ?? [];
  const uniqueCodes = Array.from(new Set(matches.filter((code) => validCodeSet.has(code)))).sort(
    (left, right) => left.localeCompare(right)
  );
  return uniqueCodes.join(" / ");
}

function parseNumber(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clearZeroOnFocus(
  value: string,
  onChange: (next: string) => void,
  decimals = false
) {
  if (decimals ? value === "0" || value === "0.0" || value === "0.00" : value === "0") {
    onChange("");
  }
}

function buildInitialFormState(draft: OneWayPlanEditDraft): FormState {
  return {
    status: draft.status,
    applyDate: draft.applyDate,
    availabilityDate: draft.availabilityDate,
    arrangedDispatchDate: draft.arrangedDispatchDate,
    lesseeId: draft.lesseeId,
    onhireNo: draft.onhireNo,
    shipperRequestId: draft.shipperRequestId,
    depotId: draft.depotId,
    polCityId: draft.polCityId,
    pod: draft.pod,
    sizeCodeId: draft.sizeCodeId,
    typeCodeId: draft.typeCodeId,
    conditionCodeId: draft.conditionCodeId,
    color: draft.color,
    machineType: draft.machineType,
    quantity: String(draft.quantity),
    authorizedQty: String(draft.authorizedQty),
    remainingQty: String(draft.remainingQty),
    pickedUpQty: String(draft.pickedUpQty),
    nonPickedUpQty: String(draft.nonPickedUpQty),
    pickupCharge: draft.pickupCharge.toFixed(2),
    freeDays: String(draft.freeDays),
    perDiem: String(draft.perDiem),
    dpp: draft.dpp.toFixed(2),
    carrier: draft.carrier,
    currency: draft.currency,
    rv: draft.rv.toFixed(2),
    remarks: draft.remarks,
  };
}

export function OneWayPlanEditForm({ draft, options }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => buildInitialFormState(draft));
  const [autocompleteInputs, setAutocompleteInputs] = useState<AutocompleteInputs>({
    lesseeId: draft.lesseeLabel === "-" ? "" : draft.lesseeLabel,
    depotId: draft.depotCode === "-" ? "" : draft.depotCode,
    polCityId: draft.polCode === "-" ? "" : draft.polCode,
    color: draft.color === "-" ? "" : draft.color,
  });
  const [saving, setSaving] = useState(false);

  const isCancelled = draft.status === "CANCELLED";
  const isCompleted = draft.status === "COMPLETED";
  const remarksOnly = isCompleted;
  const lockedByRelease = draft.hasRelease;
  const filteredDepotOptions = form.polCityId
    ? options.depots.filter((option) => option.cityId === form.polCityId)
    : options.depots;
  const sizeTypeOptions: SizeTypeOption[] = options.sizes.flatMap((sizeOption) =>
    options.types.map((typeOption) => ({
      value: `${sizeOption.value}::${typeOption.value}`,
      label: `${sizeOption.label}${typeOption.label}`,
    }))
  );
  const selectedSizeTypeValue =
    form.sizeCodeId && form.typeCodeId ? `${form.sizeCodeId}::${form.typeCodeId}` : "__EMPTY__";

  useEffect(() => {
    if (!form.depotId || !form.polCityId) return;
    const selectedDepot = options.depots.find((option) => option.value === form.depotId);
    if (selectedDepot?.cityId === form.polCityId) return;
    setForm((current) => ({ ...current, depotId: "" }));
    setAutocompleteInputs((current) => ({ ...current, depotId: "" }));
  }, [form.depotId, form.polCityId, options.depots]);

  function handlePodBlur() {
    setForm((current) => ({
      ...current,
      pod: normalizePodCodes(current.pod, options.podCityCodes),
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const normalizedPod = normalizePodCodes(form.pod, options.podCityCodes);
      setForm((current) => ({ ...current, pod: normalizedPod }));

      const payload: OneWayPlanUpdateInput = {
        id: draft.id,
        status: form.status,
        applyDate: form.applyDate,
        availabilityDate: form.availabilityDate,
        arrangedDispatchDate: form.arrangedDispatchDate,
        lesseeId: form.lesseeId,
        onhireNo: form.onhireNo,
        shipperRequestId: form.shipperRequestId,
        depotId: form.depotId,
        polCityId: form.polCityId,
        pod: normalizedPod,
        sizeCodeId: form.sizeCodeId,
        typeCodeId: form.typeCodeId,
        conditionCodeId: form.conditionCodeId,
        color: form.color,
        machineType: form.machineType,
        quantity: parseNumber(form.quantity),
        authorizedQty: parseNumber(form.authorizedQty),
        remainingQty: parseNumber(form.remainingQty),
        pickedUpQty: parseNumber(form.pickedUpQty),
        nonPickedUpQty: parseNumber(form.nonPickedUpQty),
        pickupCharge: parseNumber(form.pickupCharge),
        freeDays: parseNumber(form.freeDays),
        perDiem: parseNumber(form.perDiem),
        dpp: parseNumber(form.dpp),
        carrier: form.carrier,
        currency: form.currency,
        rv: parseNumber(form.rv),
        remarks: form.remarks,
      };

      const updated = await updateOneWayPlan(payload);
      toast({
        title: `One way plan ${updated.planId} updated`,
      });
      router.push(`/dispatch/one-way-planning/${updated.id}`);
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not update one way plan",
        description: getErrorMessage(error),
      });
    } finally {
      setSaving(false);
    }
  }

  const disableAll = isCancelled;
  const disableCoreFields = disableAll || remarksOnly;
  const disableReleaseLockedFields = disableCoreFields || lockedByRelease;

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-4 py-6 md:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit One Way Plan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update plan {draft.planId}. {isCancelled ? "Cancelled plans are read-only." : remarksOnly ? "Completed plans only allow remarks updates." : lockedByRelease ? `Depot, POL, Size/Type, Condition, Color, and Machine Type are locked because releases exist. Quantity cannot be less than ${draft.releasedQty}.` : "You can maintain planning fields and status here."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Plan Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1.5">
            <Label>Plan ID</Label>
            <Input value={draft.planId} readOnly disabled />
          </div>
          <div className="space-y-1.5">
            <Label>Lessee Request ID</Label>
            <Input
              value={form.shipperRequestId}
              disabled={disableCoreFields}
              onChange={(event) =>
                setForm((current) => ({ ...current, shipperRequestId: event.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Apply Date</Label>
            <Input
              type="date"
              value={form.applyDate}
              disabled={disableCoreFields}
              onChange={(event) => setForm((current) => ({ ...current, applyDate: event.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Arranged Dispatch Date</Label>
            <Input
              type="date"
              value={form.arrangedDispatchDate}
              disabled={disableCoreFields}
              onChange={(event) =>
                setForm((current) => ({ ...current, arrangedDispatchDate: event.target.value }))
              }
            />
          </div>
          <SearchableAutocompleteInput
            label="Lessee Name"
            placeholder="Search lessee"
            options={options.lessees}
            value={form.lesseeId}
            inputValue={autocompleteInputs.lesseeId}
            disabled={disableCoreFields}
            onInputChange={(value) =>
              setAutocompleteInputs((current) => ({ ...current, lesseeId: value }))
            }
            onSelect={(option) => {
              setForm((current) => ({ ...current, lesseeId: option?.value ?? "" }));
              setAutocompleteInputs((current) => ({ ...current, lesseeId: option?.label ?? "" }));
            }}
            onClear={() => {
              setForm((current) => ({ ...current, lesseeId: "" }));
              setAutocompleteInputs((current) => ({ ...current, lesseeId: "" }));
            }}
          />
          <div className="space-y-1.5">
            <Label>Onhire No</Label>
            <Input
              value={form.onhireNo}
              disabled={disableCoreFields}
              onChange={(event) => setForm((current) => ({ ...current, onhireNo: event.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Availability Date</Label>
            <Input
              type="date"
              value={form.availabilityDate}
              disabled={disableCoreFields}
              onChange={(event) =>
                setForm((current) => ({ ...current, availabilityDate: event.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={form.status}
              disabled={disableCoreFields}
              onValueChange={(value) =>
                setForm((current) => ({ ...current, status: value as OneWayPlanStatus }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {ONE_WAY_PLAN_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Equipment &amp; Route</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SearchableAutocompleteInput
            label="POL"
            placeholder="Search POL"
            options={options.polCities}
            value={form.polCityId}
            inputValue={autocompleteInputs.polCityId}
            disabled={disableReleaseLockedFields}
            onInputChange={(value) =>
              setAutocompleteInputs((current) => ({ ...current, polCityId: value }))
            }
            onSelect={(option) => {
              setForm((current) => ({ ...current, polCityId: option?.value ?? "" }));
              setAutocompleteInputs((current) => ({ ...current, polCityId: option?.label ?? "" }));
            }}
            onClear={() => {
              setForm((current) => ({ ...current, polCityId: "" }));
              setAutocompleteInputs((current) => ({ ...current, polCityId: "" }));
            }}
          />
          <SearchableAutocompleteInput
            label="Depot Code"
            placeholder={form.polCityId ? "Search depot" : "Select POL first or search all depots"}
            options={filteredDepotOptions}
            value={form.depotId}
            inputValue={autocompleteInputs.depotId}
            disabled={disableReleaseLockedFields}
            onInputChange={(value) =>
              setAutocompleteInputs((current) => ({ ...current, depotId: value }))
            }
            onSelect={(option) => {
              setForm((current) => ({ ...current, depotId: option?.value ?? "" }));
              setAutocompleteInputs((current) => ({ ...current, depotId: option?.label ?? "" }));
            }}
            onClear={() => {
              setForm((current) => ({ ...current, depotId: "" }));
              setAutocompleteInputs((current) => ({ ...current, depotId: "" }));
            }}
          />
          <div className="space-y-1.5 md:col-span-2 xl:col-span-2">
            <Label>POD</Label>
            <Input
              value={form.pod}
              disabled={disableCoreFields}
              placeholder="e.g. USTBA / USLAX"
              onChange={(event) => setForm((current) => ({ ...current, pod: event.target.value }))}
              onBlur={handlePodBlur}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Size/Type</Label>
            <Select
              value={selectedSizeTypeValue}
              disabled={disableReleaseLockedFields}
              onValueChange={(value) => {
                if (value === "__EMPTY__") {
                  setForm((current) => ({ ...current, sizeCodeId: "", typeCodeId: "" }));
                  return;
                }
                const [sizeCodeId, typeCodeId] = value.split("::");
                setForm((current) => ({
                  ...current,
                  sizeCodeId: sizeCodeId ?? "",
                  typeCodeId: typeCodeId ?? "",
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select size/type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__EMPTY__">Select size/type</SelectItem>
                {sizeTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Condition</Label>
            <Select
              value={form.conditionCodeId || "__EMPTY__"}
              disabled={disableReleaseLockedFields}
              onValueChange={(value) =>
                setForm((current) => ({
                  ...current,
                  conditionCodeId: value === "__EMPTY__" ? "" : value,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__EMPTY__">Select condition</SelectItem>
                {options.conditions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <SearchableAutocompleteInput
            label="Color"
            placeholder="Search color"
            options={options.colors}
            value={form.color}
            inputValue={autocompleteInputs.color}
            disabled={disableReleaseLockedFields}
            onInputChange={(value) =>
              setAutocompleteInputs((current) => ({ ...current, color: value }))
            }
            onSelect={(option) => {
              setForm((current) => ({ ...current, color: option?.value ?? "" }));
              setAutocompleteInputs((current) => ({ ...current, color: option?.label ?? "" }));
            }}
            onClear={() => {
              setForm((current) => ({ ...current, color: "" }));
              setAutocompleteInputs((current) => ({ ...current, color: "" }));
            }}
          />
          <div className="space-y-1.5">
            <Label>Machine Type</Label>
            <Input
              value={form.machineType}
              disabled={disableReleaseLockedFields}
              onChange={(event) =>
                setForm((current) => ({ ...current, machineType: event.target.value }))
              }
              placeholder="Enter machine type"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quantity &amp; Terms</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="space-y-1.5">
            <Label>Quantity</Label>
            <Input
              type="number"
              min={lockedByRelease ? String(draft.releasedQty) : "0"}
              value={form.quantity}
              disabled={disableCoreFields}
              onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
              onFocus={() =>
                clearZeroOnFocus(form.quantity, (next) =>
                  setForm((current) => ({ ...current, quantity: next }))
                )
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Authorized Qty</Label>
            <Input
              type="number"
              min="0"
              value={form.authorizedQty}
              disabled={disableCoreFields}
              onChange={(event) =>
                setForm((current) => ({ ...current, authorizedQty: event.target.value }))
              }
              onFocus={() =>
                clearZeroOnFocus(form.authorizedQty, (next) =>
                  setForm((current) => ({ ...current, authorizedQty: next }))
                )
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Remaining Qty</Label>
            <Input
              type="number"
              min="0"
              value={form.remainingQty}
              disabled={disableCoreFields}
              onChange={(event) =>
                setForm((current) => ({ ...current, remainingQty: event.target.value }))
              }
              onFocus={() =>
                clearZeroOnFocus(form.remainingQty, (next) =>
                  setForm((current) => ({ ...current, remainingQty: next }))
                )
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Picked Up Qty</Label>
            <Input
              type="number"
              min="0"
              value={form.pickedUpQty}
              disabled={disableCoreFields}
              onChange={(event) =>
                setForm((current) => ({ ...current, pickedUpQty: event.target.value }))
              }
              onFocus={() =>
                clearZeroOnFocus(form.pickedUpQty, (next) =>
                  setForm((current) => ({ ...current, pickedUpQty: next }))
                )
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Non Picked Up Qty</Label>
            <Input
              type="number"
              min="0"
              value={form.nonPickedUpQty}
              disabled={disableCoreFields}
              onChange={(event) =>
                setForm((current) => ({ ...current, nonPickedUpQty: event.target.value }))
              }
              onFocus={() =>
                clearZeroOnFocus(form.nonPickedUpQty, (next) =>
                  setForm((current) => ({ ...current, nonPickedUpQty: next }))
                )
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Pick-up Charge</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.pickupCharge}
              disabled={disableCoreFields}
              onChange={(event) =>
                setForm((current) => ({ ...current, pickupCharge: event.target.value }))
              }
              onFocus={() =>
                clearZeroOnFocus(form.pickupCharge, (next) =>
                  setForm((current) => ({ ...current, pickupCharge: next }))
                , true)
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Free Days</Label>
            <Input
              type="number"
              min="0"
              value={form.freeDays}
              disabled={disableCoreFields}
              onChange={(event) => setForm((current) => ({ ...current, freeDays: event.target.value }))}
              onFocus={() =>
                clearZeroOnFocus(form.freeDays, (next) =>
                  setForm((current) => ({ ...current, freeDays: next }))
                )
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Per Diem</Label>
            <Input
              type="number"
              min="0"
              step="0.0001"
              value={form.perDiem}
              disabled={disableCoreFields}
              onChange={(event) => setForm((current) => ({ ...current, perDiem: event.target.value }))}
              onFocus={() =>
                clearZeroOnFocus(form.perDiem, (next) =>
                  setForm((current) => ({ ...current, perDiem: next }))
                , true)
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>DPP</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.dpp}
              disabled={disableCoreFields}
              onChange={(event) => setForm((current) => ({ ...current, dpp: event.target.value }))}
              onFocus={() =>
                clearZeroOnFocus(form.dpp, (next) =>
                  setForm((current) => ({ ...current, dpp: next }))
                , true)
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Carrier</Label>
            <Input
              value={form.carrier}
              disabled={disableCoreFields}
              onChange={(event) => setForm((current) => ({ ...current, carrier: event.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <Input
              value={form.currency}
              disabled={disableCoreFields}
              onChange={(event) =>
                setForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>RV</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.rv}
              disabled={disableCoreFields}
              onChange={(event) => setForm((current) => ({ ...current, rv: event.target.value }))}
              onFocus={() =>
                clearZeroOnFocus(form.rv, (next) =>
                  setForm((current) => ({ ...current, rv: next }))
                , true)
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Remarks</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={form.remarks}
            onChange={(event) => setForm((current) => ({ ...current, remarks: event.target.value }))}
            disabled={disableAll}
          />
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button asChild variant="outline">
          <Link href={`/dispatch/one-way-planning/${draft.id}`}>Cancel</Link>
        </Button>
        <Button type="button" disabled={saving || isCancelled} onClick={() => void handleSave()}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
