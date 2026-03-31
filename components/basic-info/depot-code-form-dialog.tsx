"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import {
  getSuggestedDepotCode,
  revalidateDepotCodesPage,
} from "@/app/basic-info/depots/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
import { createBrowserClient } from "@/lib/supabase/client";
import type { DepotCityOption, DepotCodeRow } from "@/types/depot-code";

const additionalCostItemOptions = [
  "PTI",
  "Decal Removal",
  "Shifting / Restow",
  "Inspection Fee",
  "Survey Fee",
  "Minimum Repair Cost",
  "Estimate Recovery Fee",
  "User Return Surcharge In",
  "User Return Surcharge Out",
  "Other",
] as const;

const currencyOptions = ["USD", "CNY", "HKD", "EUR", "JPY", "SGD"] as const;

const lockedFieldClassName =
  "bg-muted/50 text-muted-foreground cursor-not-allowed hover:cursor-not-allowed";

const additionalCostSchema = z.object({
  id: z.string().optional(),
  cost_item: z.string().trim().min(1, "Select a cost item"),
  rate: z.coerce.number().min(0, "Rate must be 0 or greater"),
  currency: z.string().trim().min(1, "Currency is required"),
  remark: z.string().trim(),
});

const attachmentLinkSchema = z.object({
  id: z.string().optional(),
  url: z.string().trim().url("Enter a valid URL"),
});

const depotSchema = z.object({
  city_id: z.string().trim().min(1, "City is required"),
  depot_code: z
    .string()
    .trim()
    .min(1, "Depot code is required")
    .length(8, "Depot code must be 8 characters"),
  depot_name: z.string().trim().min(1, "Depot name is required"),
  depot_name_cn: z.string().trim(),
  depot_type: z.enum([
    "CONTRACT",
    "FACTORY_YARD",
    "SHIPPING_LINES",
    "TRADER",
    "CONSIGNMENT",
    "OTHER",
  ]),
  status: z.enum(["NORMAL", "SUSPEND"]),
  is_primary_depot: z.enum(["YES", "NO"]),
  depot_address: z.string().trim().min(1, "Address is required"),
  depot_address_cn: z.string().trim(),
  contact_person: z.string().trim().min(1, "Contact person is required"),
  gate_email: z.string().trim().min(1, "Gate email is required").email("Enter a valid email address"),
  depot_tel: z.string().trim().min(1, "Phone is required"),
  fax: z.string().trim(),
  contact_email: z.string().trim().email("Enter a valid email address").or(z.literal("")),
  account_email: z.string().trim().email("Enter a valid email address").or(z.literal("")),
  gate_in_20_cost: z.coerce.number().min(0),
  gate_out_20_cost: z.coerce.number().min(0),
  lift_in_20_cost: z.coerce.number().min(0),
  lift_out_20_cost: z.coerce.number().min(0),
  gate_in_40_cost: z.coerce.number().min(0),
  gate_out_40_cost: z.coerce.number().min(0),
  lift_in_40_cost: z.coerce.number().min(0),
  lift_out_40_cost: z.coerce.number().min(0),
  storage_rate_20: z.coerce.number().min(0),
  storage_rate_40: z.coerce.number().min(0),
  labour_cost: z.coerce.number().min(0),
  free_days: z.coerce.number().min(0),
  currency: z.string().trim().min(1, "Currency is required"),
  settlement_cycle: z.string().trim(),
  payment_remark: z.string().trim(),
  other_terms_remark: z.string().trim(),
  depot_attachment_url: z.union([z.literal(""), z.string().trim().url("Enter a valid URL")]),
  data_updated_on: z.string().trim(),
  remark: z.string().trim(),
  additional_costs: z.array(additionalCostSchema),
  attachment_links: z.array(attachmentLinkSchema),
});

type DepotFormValues = z.infer<typeof depotSchema>;
type TabKey = "info" | "tariff" | "settlement" | "attachment";

const DEFAULT_VALUES: DepotFormValues = {
  city_id: "",
  depot_code: "",
  depot_name: "",
  depot_name_cn: "",
  depot_type: "CONTRACT",
  status: "NORMAL",
  is_primary_depot: "NO",
  depot_address: "",
  depot_address_cn: "",
  contact_person: "",
  gate_email: "",
  depot_tel: "",
  fax: "",
  contact_email: "",
  account_email: "",
  gate_in_20_cost: 0,
  gate_out_20_cost: 0,
  lift_in_20_cost: 0,
  lift_out_20_cost: 0,
  gate_in_40_cost: 0,
  gate_out_40_cost: 0,
  lift_in_40_cost: 0,
  lift_out_40_cost: 0,
  storage_rate_20: 0,
  storage_rate_40: 0,
  labour_cost: 0,
  free_days: 0,
  currency: "USD",
  settlement_cycle: "",
  payment_remark: "",
  other_terms_remark: "",
  depot_attachment_url: "",
  data_updated_on: "",
  remark: "",
  additional_costs: [],
  attachment_links: [],
};

function toNumber(value: string | number | null | undefined) {
  if (value == null || value === "") return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function buildLegacyAdditionalCosts(depot: DepotCodeRow) {
  const rows: DepotFormValues["additional_costs"] = [];
  const currency = depot.currency ?? "USD";
  const legacyItems: Array<[string, string | number | null | undefined]> = [
    ["PTI", depot.pti_cost],
    ["Inspection Fee", depot.inspection_cost],
    ["Survey Fee", depot.survey_cost],
    ["Minimum Repair Cost", depot.min_repair_cost],
    ["Estimate Recovery Fee", depot.est_recovery_fee],
    ["User Return Surcharge In", depot.user_return_surcharge_in],
    ["User Return Surcharge Out", depot.user_return_surcharge_out],
  ];

  for (const [cost_item, value] of legacyItems) {
    const rate = toNumber(value);
    if (rate <= 0) continue;
    rows.push({
      cost_item,
      rate,
      currency,
      remark: "",
    });
  }

  return rows;
}

function toFormValues(depot: DepotCodeRow | null): DepotFormValues {
  if (!depot) return DEFAULT_VALUES;
  const dynamicRows =
    (depot.depot_additional_costs ?? []).map((row) => ({
      id: row.id,
      cost_item: row.cost_item,
      rate: toNumber(row.rate),
      currency: row.currency ?? "USD",
      remark: row.remark ?? "",
    })) ?? [];
  const fallbackRows = dynamicRows.length > 0 ? [] : buildLegacyAdditionalCosts(depot);
  const attachmentLinks =
    (depot.depot_attachment_links ?? []).map((row) => ({
      id: row.id,
      url: row.url,
    })) ?? [];
  const fallbackAttachmentLinks =
    attachmentLinks.length === 0 && depot.depot_attachment_url?.trim()
      ? [{ url: depot.depot_attachment_url.trim() }]
      : [];
  return {
    city_id: depot.city_id ?? "",
    depot_code: depot.depot_code,
    depot_name: depot.depot_name,
    depot_name_cn: depot.depot_name_cn ?? "",
    depot_type:
      depot.depot_type === "CONTRACT" ||
      depot.depot_type === "FACTORY_YARD" ||
      depot.depot_type === "SHIPPING_LINES" ||
      depot.depot_type === "TRADER" ||
      depot.depot_type === "CONSIGNMENT" ||
      depot.depot_type === "OTHER"
        ? depot.depot_type
        : "CONTRACT",
    status:
      depot.status === "NORMAL" || depot.status === "SUSPEND"
        ? depot.status
        : "NORMAL",
    is_primary_depot: depot.is_primary_depot ? "YES" : "NO",
    depot_address: depot.depot_address ?? "",
    depot_address_cn: depot.depot_address_cn ?? "",
    contact_person: depot.contact_person ?? "",
    gate_email: depot.gate_email ?? depot.contact_email ?? "",
    depot_tel: depot.depot_tel ?? "",
    fax: depot.fax ?? "",
    contact_email: depot.contact_email ?? "",
    account_email: depot.account_email ?? "",
    gate_in_20_cost: toNumber(depot.gate_in_20_cost),
    gate_out_20_cost: toNumber(depot.gate_out_20_cost),
    lift_in_20_cost: toNumber(depot.lift_in_20_cost),
    lift_out_20_cost: toNumber(depot.lift_out_20_cost),
    gate_in_40_cost: toNumber(depot.gate_in_40_cost),
    gate_out_40_cost: toNumber(depot.gate_out_40_cost),
    lift_in_40_cost: toNumber(depot.lift_in_40_cost),
    lift_out_40_cost: toNumber(depot.lift_out_40_cost),
    storage_rate_20: toNumber(depot.storage_rate_20),
    storage_rate_40: toNumber(depot.storage_rate_40),
    labour_cost: toNumber(depot.labour_cost),
    free_days: toNumber(depot.free_days),
    currency: depot.currency ?? "USD",
    settlement_cycle: depot.settlement_cycle ?? "",
    payment_remark: depot.payment_remark ?? "",
    other_terms_remark: depot.other_terms_remark ?? "",
    depot_attachment_url: depot.depot_attachment_url ?? "",
    data_updated_on: depot.data_updated_on ?? "",
    remark: depot.remark ?? "",
    additional_costs: [...dynamicRows, ...fallbackRows],
    attachment_links: [...attachmentLinks, ...fallbackAttachmentLinks],
  };
}

type DepotCodeFormDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  depot: DepotCodeRow | null;
  cityOptions: DepotCityOption[];
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void> | void;
};

const DEPOT_TYPE_LABELS: Record<DepotFormValues["depot_type"], string> = {
  CONTRACT: "Contract",
  FACTORY_YARD: "Factory Yard",
  SHIPPING_LINES: "Shipping Lines",
  TRADER: "Trader",
  CONSIGNMENT: "Consignment",
  OTHER: "Other",
};

const STATUS_LABELS: Record<DepotFormValues["status"], string> = {
  NORMAL: "Normal",
  SUSPEND: "Suspend",
};

const tabs: Array<[TabKey, string]> = [
  ["info", "Info"],
  ["tariff", "Tariff"],
  ["settlement", "Settlement"],
  ["attachment", "Attachment"],
];

function NumberField({
  control,
  name,
  label,
  required = true,
}: {
  control: ReturnType<typeof useForm<DepotFormValues>>["control"];
  name: keyof DepotFormValues;
  label: string;
  required?: boolean;
}) {
  return (
    <FormField
      control={control}
      name={name as never}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{required ? <RequiredLabel>{label}</RequiredLabel> : label}</FormLabel>
          <FormControl>
            <Input
              {...field}
              type="number"
              step="0.01"
              min="0"
              value={field.value ?? 0}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function RequiredLabel({ children }: { children: ReactNode }) {
  return (
    <span>
      {children} <span>*</span>
    </span>
  );
}

export function DepotCodeFormDialog({
  open,
  mode,
  depot,
  cityOptions,
  onOpenChange,
  onSaved,
}: DepotCodeFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<TabKey>("info");

  const form = useForm<DepotFormValues>({
    resolver: zodResolver(depotSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "additional_costs",
  });
  const {
    fields: attachmentFields,
    append: appendAttachment,
    remove: removeAttachment,
    replace: replaceAttachments,
  } = useFieldArray({
    control: form.control,
    name: "attachment_links",
  });

  useEffect(() => {
    const nextValues = toFormValues(depot);
    form.reset(nextValues);
    replace(nextValues.additional_costs);
    replaceAttachments(nextValues.attachment_links);
    setTab("info");
  }, [depot, form, open, replace, replaceAttachments]);

  const watchedCityId = form.watch("city_id");
  const watchedDepotName = form.watch("depot_name");

  useEffect(() => {
    if (!open || mode !== "create") return;

    const cityId = watchedCityId?.trim();
    const depotName = watchedDepotName?.trim();
    if (!cityId || !depotName) {
      form.setValue("depot_code", "", { shouldValidate: false, shouldDirty: false });
      return;
    }

    let active = true;
    void (async () => {
      try {
        const suggestedCode = await getSuggestedDepotCode({ cityId, depotName });
        if (!active) return;
        form.setValue("depot_code", suggestedCode, {
          shouldValidate: true,
          shouldDirty: true,
        });
      } catch {
        if (!active) return;
      }
    })();

    return () => {
      active = false;
    };
  }, [form, mode, open, watchedCityId, watchedDepotName]);

  const selectedCity = useMemo(
    () => cityOptions.find((option) => option.id === watchedCityId) ?? null,
    [cityOptions, watchedCityId]
  );

  async function onSubmit(values: DepotFormValues) {
    setSaving(true);
    try {
      const selected = cityOptions.find((option) => option.id === values.city_id) ?? null;
      const nowIso = new Date().toISOString();
      const cleanedAttachmentLinks = values.attachment_links
        .map((row) => ({ ...row, url: row.url.trim() }))
        .filter((row) => row.url);
      const payload = {
        city_id: values.city_id,
        region_id: selected?.region_id ?? null,
        region: null,
        country_name: selected?.country ?? null,
        country_code: selected?.city_code?.slice(0, 2) ?? null,
        depot_code: values.depot_code,
        depot_name: values.depot_name,
        depot_name_cn: values.depot_name_cn || null,
        depot_type: values.depot_type,
        depot_address: values.depot_address || null,
        depot_address_cn: values.depot_address_cn || null,
        contact_person: values.contact_person || null,
        contact_email: values.contact_email || null,
        gate_email: values.gate_email || null,
        account_email: values.account_email || null,
        depot_tel: values.depot_tel || null,
        fax: values.fax || null,
        status: values.status,
        is_primary_depot: values.is_primary_depot === "YES",
        gate_in_20_cost: values.gate_in_20_cost,
        gate_out_20_cost: values.gate_out_20_cost,
        lift_in_20_cost: values.lift_in_20_cost,
        lift_out_20_cost: values.lift_out_20_cost,
        gate_in_40_cost: values.gate_in_40_cost,
        gate_out_40_cost: values.gate_out_40_cost,
        lift_in_40_cost: values.lift_in_40_cost,
        lift_out_40_cost: values.lift_out_40_cost,
        storage_rate_20: values.storage_rate_20,
        storage_rate_40: values.storage_rate_40,
        labour_cost: values.labour_cost,
        free_days: values.free_days,
        currency: values.currency,
        settlement_cycle: values.settlement_cycle || null,
        payment_remark: values.payment_remark || null,
        other_terms_remark: values.other_terms_remark || null,
        depot_attachment_url:
          cleanedAttachmentLinks[0]?.url ??
          values.depot_attachment_url ??
          null,
        data_updated_on: nowIso,
        remark: values.remark || null,
      };

      const supabase = createBrowserClient();
      let depotId = depot?.id ?? null;

      if (mode === "create") {
        const { data, error } = await supabase
          .from("depots")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        depotId = data.id;
      } else {
        if (!depotId) throw new Error("Missing depot record");
        const { error } = await supabase
          .from("depots")
          .update(payload)
          .eq("id", depotId);
        if (error) throw error;
      }

      if (!depotId) {
        throw new Error("Missing depot id");
      }

      const { error: deleteAdditionalError } = await supabase
        .from("depot_additional_costs")
        .delete()
        .eq("depot_id", depotId);
      if (deleteAdditionalError) throw deleteAdditionalError;

      const additionalPayload = values.additional_costs.map((row) => ({
        depot_id: depotId,
        cost_item: row.cost_item,
        rate: row.rate,
        currency: row.currency,
        remark: row.remark || null,
      }));

      if (additionalPayload.length > 0) {
        const { error: insertAdditionalError } = await supabase
          .from("depot_additional_costs")
          .insert(additionalPayload);
        if (insertAdditionalError) throw insertAdditionalError;
      }

      const { error: deleteAttachmentError } = await supabase
        .from("depot_attachment_links")
        .delete()
        .eq("depot_id", depotId);
      if (deleteAttachmentError) throw deleteAttachmentError;

      if (cleanedAttachmentLinks.length > 0) {
        const { error: insertAttachmentError } = await supabase
          .from("depot_attachment_links")
          .insert(
            cleanedAttachmentLinks.map((row) => ({
              depot_id: depotId,
              url: row.url,
            }))
          );
        if (insertAttachmentError) throw insertAttachmentError;
      }

      await revalidateDepotCodesPage();
      await onSaved();
      onOpenChange(false);
      toast({
        title: mode === "create" ? "Depot created" : "Depot updated",
        description: values.depot_code,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: mode === "create" ? "Could not create depot" : "Could not update depot",
        description: getErrorMessage(error),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New Depot" : "Edit Depot"}</DialogTitle>
          <DialogDescription>
            Maintain the full depot master profile, tariff, settlement, and attachment fields.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="flex flex-wrap gap-2 border-b border-border pb-2">
              {tabs.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`rounded-md border px-3 py-1.5 text-sm ${
                    tab === key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === "info" && (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <FormField
                  control={form.control}
                  name="depot_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <RequiredLabel>Depot Code</RequiredLabel>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Generated from city code"
                          readOnly
                          disabled
                          className={lockedFieldClassName}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="depot_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <RequiredLabel>Type</RequiredLabel>
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(DEPOT_TYPE_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <RequiredLabel>Status</RequiredLabel>
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(STATUS_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="is_primary_depot"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <RequiredLabel>Primary Depot</RequiredLabel>
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select primary depot" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="YES">Yes</SelectItem>
                          <SelectItem value="NO">No</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="depot_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <RequiredLabel>Depot Name</RequiredLabel>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter depot name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="depot_name_cn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Depot Name in Chinese</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter Chinese depot name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-2">
                  <FormLabel>
                    <RequiredLabel>Region</RequiredLabel>
                  </FormLabel>
                  <Input
                    value={selectedCity?.region_name ?? ""}
                    readOnly
                    disabled
                    className={lockedFieldClassName}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="city_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <RequiredLabel>City Code</RequiredLabel>
                      </FormLabel>
                      {mode === "edit" ? (
                        <FormControl>
                          <Input
                            value={selectedCity?.city_code ?? ""}
                            readOnly
                            disabled
                            className={lockedFieldClassName}
                          />
                        </FormControl>
                      ) : (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select city code" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {cityOptions.map((option) => (
                              <SelectItem key={option.id} value={option.id}>
                                {option.city_code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="depot_address"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>
                        <RequiredLabel>Depot Address</RequiredLabel>
                      </FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} placeholder="Enter depot address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="depot_address_cn"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Chinese Address</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} placeholder="Enter Chinese address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <FormLabel>City</FormLabel>
                  <Input
                    value={selectedCity?.city_name ?? ""}
                    readOnly
                    disabled
                    className={lockedFieldClassName}
                  />
                </div>
                <div className="space-y-2">
                  <FormLabel>Country</FormLabel>
                  <Input
                    value={selectedCity?.country ?? ""}
                    readOnly
                    disabled
                    className={lockedFieldClassName}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="contact_person"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <RequiredLabel>Contact Person (Gate)</RequiredLabel>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter gate contact person" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="gate_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <RequiredLabel>Contact Email (Gate)</RequiredLabel>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="Enter gate email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="depot_tel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <RequiredLabel>Phone</RequiredLabel>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fax"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fax</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter fax" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contact_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Email (Owner)</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="Enter owner email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="account_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="Enter account email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {tab === "tariff" && (
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <NumberField control={form.control} name="gate_in_20_cost" label="Gate In 20" />
                  <NumberField control={form.control} name="gate_out_20_cost" label="Gate Out 20" />
                  <NumberField
                    control={form.control}
                    name="lift_in_20_cost"
                    label="Lift In 20"
                    required={false}
                  />
                  <NumberField
                    control={form.control}
                    name="lift_out_20_cost"
                    label="Lift Out 20"
                    required={false}
                  />
                  <NumberField control={form.control} name="gate_in_40_cost" label="Gate In 40" />
                  <NumberField control={form.control} name="gate_out_40_cost" label="Gate Out 40" />
                  <NumberField
                    control={form.control}
                    name="lift_in_40_cost"
                    label="Lift In 40"
                    required={false}
                  />
                  <NumberField
                    control={form.control}
                    name="lift_out_40_cost"
                    label="Lift Out 40"
                    required={false}
                  />
                  <NumberField control={form.control} name="storage_rate_20" label="Storage 20 / Day" />
                  <NumberField control={form.control} name="storage_rate_40" label="Storage 40 / Day" />
                  <NumberField
                    control={form.control}
                    name="labour_cost"
                    label="Labour Cost"
                    required={false}
                  />
                  <NumberField
                    control={form.control}
                    name="free_days"
                    label="Free Day"
                    required={false}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <RequiredLabel>Currency</RequiredLabel>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} list="depot-currency-options" placeholder="USD" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">Additional / Miscellaneous Costs</h3>
                      <p className="text-xs text-muted-foreground">
                        Add depot-specific tariff rows such as PTI, decal removal, shifting, or user return surcharge.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        append({
                          cost_item: "",
                          rate: 0,
                          currency: form.getValues("currency") || "USD",
                          remark: "",
                        })
                      }
                    >
                      <Plus className="mr-2 size-3.5" />
                      Add Row
                    </Button>
                  </div>

                  {fields.length === 0 ? (
                    <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                      No additional tariff rows configured.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {fields.map((field, index) => (
                        <div
                          key={field.id}
                          className="grid gap-3 rounded-md border border-border/70 p-3 md:grid-cols-[1.4fr_1fr_120px_auto]"
                        >
                          <FormField
                            control={form.control}
                            name={`additional_costs.${index}.cost_item`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  <RequiredLabel>Cost Item</RequiredLabel>
                                </FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select cost item" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {additionalCostItemOptions.map((option) => (
                                      <SelectItem key={option} value={option}>
                                        {option}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`additional_costs.${index}.rate`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  <RequiredLabel>Rate</RequiredLabel>
                                </FormLabel>
                                <FormControl>
                                  <Input {...field} type="number" step="0.01" min="0" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`additional_costs.${index}.currency`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  <RequiredLabel>Currency</RequiredLabel>
                                </FormLabel>
                                <FormControl>
                                  <Input {...field} list="depot-currency-options" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="flex items-end">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => remove(index)}
                              aria-label="Remove row"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                          <FormField
                            control={form.control}
                            name={`additional_costs.${index}.remark`}
                            render={({ field }) => (
                              <FormItem className="md:col-span-4">
                                <FormLabel>Remark</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Optional remark" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === "settlement" && (
              <div className="grid gap-4">
                <FormField
                  control={form.control}
                  name="settlement_cycle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Settlement Cycle</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter settlement cycle" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="payment_remark"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Remark</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={4} placeholder="Enter payment remark" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="other_terms_remark"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Other Terms Remark</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={4} placeholder="Enter other terms remark" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {tab === "attachment" && (
              <div className="grid gap-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">Depot Attachment Links</h3>
                      <p className="text-xs text-muted-foreground">
                        Add one or more contract or depot attachment links.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => appendAttachment({ url: "" })}
                    >
                      <Plus className="mr-2 size-3.5" />
                      Add Link
                    </Button>
                  </div>

                  {attachmentFields.length === 0 ? (
                    <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                      No depot attachment links configured.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {attachmentFields.map((field, index) => (
                        <div
                          key={field.id}
                          className="grid gap-3 rounded-md border border-border/70 p-3 md:grid-cols-[1fr_auto]"
                        >
                          <FormField
                            control={form.control}
                            name={`attachment_links.${index}.url`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  <RequiredLabel>Depot Attachment Link</RequiredLabel>
                                </FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="https://..." />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="flex items-end">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => removeAttachment(index)}
                              aria-label="Remove attachment link"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <FormLabel>Data Updated On</FormLabel>
                  <Input
                    value={
                      form.watch("data_updated_on")
                        ? new Date(form.watch("data_updated_on")).toLocaleString()
                        : mode === "create"
                          ? "Auto-generated after save"
                          : ""
                    }
                    readOnly
                    disabled
                    className={lockedFieldClassName}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="remark"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Remark</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={5} placeholder="Enter remark" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <datalist id="depot-currency-options">
              {currencyOptions.map((currency) => (
                <option key={currency} value={currency} />
              ))}
            </datalist>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                {mode === "create" ? "Create Depot" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
