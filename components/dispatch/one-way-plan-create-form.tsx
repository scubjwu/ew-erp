"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { createOneWayPlan } from "@/app/dispatch/one-way-planning/actions";
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
  OneWayPlanCreateInput,
  OneWayPlanFormOptions,
} from "@/types/one-way-planning";

type Props = {
  options: OneWayPlanFormOptions;
};

type AutocompleteInputs = {
  lesseeId: string;
  depotId: string;
  polCityId: string;
  color: string;
};

type FormState = {
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
  const uniqueCodes = Array.from(
    new Set(matches.filter((code) => validCodeSet.has(code)))
  ).sort((left, right) => left.localeCompare(right));
  return uniqueCodes.join(" / ");
}

function defaultFormState(): FormState {
  const today = new Date().toISOString().slice(0, 10);
  return {
    applyDate: today,
    availabilityDate: "",
    arrangedDispatchDate: "",
    lesseeId: "",
    onhireNo: "",
    shipperRequestId: "",
    depotId: "",
    polCityId: "",
    pod: "",
    sizeCodeId: "",
    typeCodeId: "",
    conditionCodeId: "",
    color: "",
    machineType: "",
    quantity: "0",
    authorizedQty: "0",
    remainingQty: "0",
    pickedUpQty: "0",
    nonPickedUpQty: "0",
    pickupCharge: "0.00",
    freeDays: "0",
    perDiem: "0.00",
    dpp: "0.00",
    carrier: "",
    currency: "USD",
    rv: "0.00",
    remarks: "",
  };
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

export function OneWayPlanCreateForm({ options }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => defaultFormState());
  const [autocompleteInputs, setAutocompleteInputs] = useState<AutocompleteInputs>({
    lesseeId: "",
    depotId: "",
    polCityId: "",
    color: "",
  });
  const [submittingStatus, setSubmittingStatus] = useState<"" | "SUBMITTED" | "APPROVED">("");

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

  async function handleSave(status: "SUBMITTED" | "APPROVED") {
    setSubmittingStatus(status);
    try {
      const normalizedPod = normalizePodCodes(form.pod, options.podCityCodes);
      setForm((current) => ({ ...current, pod: normalizedPod }));
      const payload: OneWayPlanCreateInput = {
        status,
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

      const created = await createOneWayPlan(payload);
      toast({
        title: `One way plan ${created.planId} created`,
        description: `Saved as ${status}.`,
      });
      router.push(`/dispatch/one-way-planning/${created.id}`);
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not create one way plan",
        description: getErrorMessage(error),
      });
    } finally {
      setSubmittingStatus("");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-4 py-6 md:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New One Way Plan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a one way planning record manually using master data from the current ERP setup.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Plan Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1.5">
            <Label>Plan ID</Label>
            <Input value="Auto-generated after save" readOnly disabled />
          </div>
          <div className="space-y-1.5">
            <Label>Lessee Request ID</Label>
            <Input
              value={form.shipperRequestId}
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
              onChange={(event) => setForm((current) => ({ ...current, applyDate: event.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Arranged Dispatch Date</Label>
            <Input
              type="date"
              value={form.arrangedDispatchDate}
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
              onChange={(event) => setForm((current) => ({ ...current, onhireNo: event.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Availability Date</Label>
            <Input
              type="date"
              value={form.availabilityDate}
              onChange={(event) =>
                setForm((current) => ({ ...current, availabilityDate: event.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Input value="SUBMITTED" readOnly disabled />
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
              placeholder="e.g. USTBA / USLAX"
              onChange={(event) => setForm((current) => ({ ...current, pod: event.target.value }))}
              onBlur={handlePodBlur}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Size/Type</Label>
            <Select
              value={selectedSizeTypeValue}
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
              min="0"
              value={form.quantity}
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
              onChange={(event) => setForm((current) => ({ ...current, carrier: event.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <Input
              value={form.currency}
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
          />
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button asChild variant="outline">
          <Link href="/dispatch/one-way-planning">Cancel</Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={submittingStatus !== ""}
          onClick={() => void handleSave("SUBMITTED")}
        >
          {submittingStatus === "SUBMITTED" ? "Saving..." : "Save as Submitted"}
        </Button>
        <Button
          type="button"
          disabled={submittingStatus !== ""}
          onClick={() => void handleSave("APPROVED")}
        >
          {submittingStatus === "APPROVED" ? "Saving..." : "Save as Approved"}
        </Button>
      </div>
    </div>
  );
}
