"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useFieldArray, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";

import {
  revalidateMaterialVendorViews,
  type MaterialVendorBuyerOption,
} from "@/app/partners/material-vendors/actions";
import { Button } from "@/components/ui/button";
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
import {
  formatMaterialVendorCode,
  prefixForMaterialCategory,
} from "@/lib/material-vendors/generate-material-vendor-code";
import type {
  MaterialCategory,
  MaterialVendor,
  MaterialVendorBalanceTriggerEvent,
  MaterialVendorStatus,
} from "@/types/material-vendor";
import {
  MATERIAL_CATEGORY_OPTIONS,
  MATERIAL_VENDOR_BALANCE_TRIGGER_EVENT_OPTIONS,
  MATERIAL_VENDOR_STATUS_OPTIONS,
} from "@/types/material-vendor";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const lockedFieldClassName =
  "bg-muted/50 text-muted-foreground cursor-not-allowed hover:cursor-not-allowed";

const attachmentSchema = z.object({
  id: z.string().optional(),
  url: z.string().trim().url("Enter a valid URL"),
  remark: z.string().trim(),
});

const materialVendorFormSchema = z.object({
  vendor_code: z
    .string()
    .trim()
    .regex(/^[A-Z]{2}[0-9]{4}$/, "Vendor code must be 2 uppercase letters and 4 digits"),
  status: z.enum(MATERIAL_VENDOR_STATUS_OPTIONS as [MaterialVendorStatus, ...MaterialVendorStatus[]]),
  legal_company_name: z.string().trim().min(1, "Legal company name is required"),
  company_name: z.string().trim(),
  address: z.string().trim().min(1, "Address is required"),
  country: z.string().trim().min(1, "Country is required"),
  primary_contact_person: z.string().trim(),
  material_category: z.enum(MATERIAL_CATEGORY_OPTIONS as [MaterialCategory, ...MaterialCategory[]]),
  contact_email: z
    .string()
    .trim()
    .refine((value) => value === "" || emailPattern.test(value), "Enter a valid email address"),
  contact_tel: z.string().trim(),
  pic_user_id: z.string().trim(),
  is_default_vendor: z.enum(["yes", "no"]),
  bank_account_name: z.string().trim(),
  bank_account_number: z.string().trim(),
  bank_name: z.string().trim(),
  bank_code: z.string().trim(),
  bank_address: z.string().trim(),
  swift_code: z.string().trim(),
  settlement_payment_term: z.string().trim(),
  settlement_calculation_method: z.string().trim(),
  settlement_credit_days: z.coerce.number().min(0, "Credit days must be 0 or greater"),
  settlement_advance_payment_percentage: z.coerce
    .number()
    .min(0, "Advance payment percentage must be 0 or greater")
    .max(100, "Advance payment percentage cannot exceed 100"),
  settlement_balance_trigger_event: z.union([
    z.literal(""),
    z.enum(
      MATERIAL_VENDOR_BALANCE_TRIGGER_EVENT_OPTIONS as [
        MaterialVendorBalanceTriggerEvent,
        ...MaterialVendorBalanceTriggerEvent[],
      ]
    ),
  ]),
  settlement_currency: z.string().trim(),
  settlement_prepayment_pool: z.enum(["enabled", "disabled"]),
  settlement_prepayment_threshold: z.coerce
    .number()
    .min(0, "Prepayment threshold must be 0 or greater"),
  settlement_current_prepaid_balance: z.coerce
    .number()
    .min(0, "Current prepaid balance must be 0 or greater"),
  remark: z.string().trim(),
  attachment_links: z.array(attachmentSchema),
});

type MaterialVendorFormValues = z.infer<typeof materialVendorFormSchema>;
type MaterialVendorTabKey = "basic" | "bank" | "settlement" | "attachments";

const tabs: Array<[MaterialVendorTabKey, string]> = [
  ["basic", "Basic Info"],
  ["bank", "Bank Information"],
  ["settlement", "Settlement"],
  ["attachments", "Attachments"],
];

function mapMaterialVendorToForm(vendor: MaterialVendor): MaterialVendorFormValues {
  return {
    vendor_code: vendor.vendor_code,
    status: vendor.status,
    legal_company_name: vendor.legal_company_name,
    company_name: vendor.company_name ?? "",
    address: vendor.address ?? "",
    country: vendor.country ?? "",
    primary_contact_person: vendor.primary_contact_person ?? "",
    material_category: vendor.material_category,
    contact_email: vendor.contact_email ?? "",
    contact_tel: vendor.contact_tel ?? "",
    pic_user_id: vendor.pic_user_id ?? "",
    is_default_vendor: vendor.is_default_vendor ? "yes" : "no",
    bank_account_name: vendor.bank_account_name ?? "",
    bank_account_number: vendor.bank_account_number ?? "",
    bank_name: vendor.bank_name ?? "",
    bank_code: vendor.bank_code ?? "",
    bank_address: vendor.bank_address ?? "",
    swift_code: vendor.swift_code ?? "",
    settlement_payment_term: vendor.settlement_payment_term ?? "",
    settlement_calculation_method: vendor.settlement_calculation_method ?? "",
    settlement_credit_days: Number(vendor.settlement_credit_days ?? 0),
    settlement_advance_payment_percentage: Number(
      vendor.settlement_advance_payment_percentage ?? 0
    ),
    settlement_balance_trigger_event: vendor.settlement_balance_trigger_event ?? "",
    settlement_currency: vendor.settlement_currency ?? "USD",
    settlement_prepayment_pool:
      vendor.settlement_prepayment_pool === true ? "enabled" : "disabled",
    settlement_prepayment_threshold: Number(vendor.settlement_prepayment_threshold ?? 0),
    settlement_current_prepaid_balance: Number(
      vendor.settlement_current_prepaid_balance ?? 0
    ),
    remark: vendor.remark ?? "",
    attachment_links: (vendor.attachment_links ?? []).map((item) => ({
      id: item.id,
      url: item.url,
      remark: item.remark ?? "",
    })),
  };
}

function defaultValues(picUserId = ""): MaterialVendorFormValues {
  return {
    vendor_code: "",
    status: "Normal",
    legal_company_name: "",
    company_name: "",
    address: "",
    country: "",
    primary_contact_person: "",
    material_category: MATERIAL_CATEGORY_OPTIONS[0],
    contact_email: "",
    contact_tel: "",
    pic_user_id: picUserId,
    is_default_vendor: "no",
    bank_account_name: "",
    bank_account_number: "",
    bank_name: "",
    bank_code: "",
    bank_address: "",
    swift_code: "",
    settlement_payment_term: "",
    settlement_calculation_method: "",
    settlement_credit_days: 0,
    settlement_advance_payment_percentage: 0,
    settlement_balance_trigger_event: "",
    settlement_currency: "USD",
    settlement_prepayment_pool: "disabled",
    settlement_prepayment_threshold: 0,
    settlement_current_prepaid_balance: 0,
    remark: "",
    attachment_links: [],
  };
}

async function isMaterialVendorCodeTaken(code: string, excludeId?: string) {
  const supabase = createBrowserClient();
  let query = supabase.from("material_vendors").select("id").eq("vendor_code", code.trim());
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query.limit(1);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

async function isLegalCompanyNameTaken(name: string, excludeId?: string) {
  const supabase = createBrowserClient();
  let query = supabase
    .from("material_vendors")
    .select("id")
    .eq("legal_company_name", name.trim());
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query.limit(1);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

async function generateUniqueMaterialVendorCode(category: MaterialCategory, excludeId?: string) {
  const supabase = createBrowserClient();
  let query = supabase
    .from("material_vendors")
    .select("vendor_code")
    .eq("material_category", category)
    .order("vendor_code", { ascending: false });

  if (excludeId) query = query.neq("id", excludeId);

  const { data, error } = await query;
  if (error) throw error;

  const prefix = prefixForMaterialCategory(category);
  let maxSequence = 0;

  for (const row of data ?? []) {
    const code = row.vendor_code ?? "";
    if (!code.startsWith(prefix)) continue;
    const digits = Number(code.slice(2));
    if (Number.isFinite(digits) && digits > maxSequence) {
      maxSequence = digits;
    }
  }

  const nextSequence = maxSequence + 1;
  if (nextSequence > 9999) {
    throw new Error(`Material vendor code range is exhausted for ${category}`);
  }

  return formatMaterialVendorCode(category, nextSequence);
}

function ReadOnlyInput({
  value,
  placeholder,
}: {
  value: string;
  placeholder?: string;
}) {
  return (
    <Input
      value={value}
      placeholder={placeholder}
      readOnly
      disabled
      className={lockedFieldClassName}
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

export function MaterialVendorForm({
  mode,
  initialVendor,
  picOptions,
}: {
  mode: "create" | "edit" | "view";
  initialVendor?: MaterialVendor | null;
  picOptions: MaterialVendorBuyerOption[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<MaterialVendorTabKey>("basic");

  const form = useForm<MaterialVendorFormValues>({
    resolver: zodResolver(materialVendorFormSchema) as Resolver<MaterialVendorFormValues>,
    defaultValues:
      mode === "create"
        ? defaultValues(picOptions[0]?.id ?? "")
        : initialVendor
          ? mapMaterialVendorToForm(initialVendor)
          : defaultValues(picOptions[0]?.id ?? ""),
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
    if (mode === "create") {
      const next = defaultValues(picOptions[0]?.id ?? "");
      form.reset(next);
      replaceAttachments(next.attachment_links);
    } else if (initialVendor) {
      const next = mapMaterialVendorToForm(initialVendor);
      form.reset(next);
      replaceAttachments(next.attachment_links);
    }
    setTab("basic");
  }, [form, initialVendor, mode, picOptions, replaceAttachments]);

  const selectedCategory = form.watch("material_category");
  const readOnly = mode === "view";

  useEffect(() => {
    if (mode !== "create") return;
    if (!selectedCategory) return;
    let active = true;

    void (async () => {
      try {
        const code = await generateUniqueMaterialVendorCode(selectedCategory);
        if (!active) return;
        form.setValue("vendor_code", code, { shouldValidate: true });
      } catch (error) {
        if (!active) return;
        toast({
          variant: "destructive",
          title: "Could not generate vendor code",
          description: getErrorMessage(error),
        });
      }
    })();

    return () => {
      active = false;
    };
  }, [form, mode, selectedCategory]);

  async function onSubmit(values: MaterialVendorFormValues) {
    setSaving(true);
    try {
      if (await isLegalCompanyNameTaken(values.legal_company_name, initialVendor?.id)) {
        form.setError("legal_company_name", {
          type: "manual",
          message: "Legal company name already exists",
        });
        setSaving(false);
        return;
      }

      if (await isMaterialVendorCodeTaken(values.vendor_code, initialVendor?.id)) {
        form.setError("vendor_code", {
          type: "manual",
          message: "Vendor code already exists",
        });
        setSaving(false);
        return;
      }

      const supabase = createBrowserClient();
      const payload = {
        vendor_code: values.vendor_code,
        legal_company_name: values.legal_company_name,
        company_name: values.company_name || null,
        address: values.address,
        country: values.country,
        primary_contact_person: values.primary_contact_person || null,
        material_category: values.material_category,
        contact_email: values.contact_email || null,
        contact_tel: values.contact_tel || null,
        pic_user_id:
          values.pic_user_id && values.pic_user_id !== "__none__"
            ? values.pic_user_id
            : null,
        is_default_vendor: values.is_default_vendor === "yes",
        bank_account_name: values.bank_account_name || null,
        bank_account_number: values.bank_account_number || null,
        bank_name: values.bank_name || null,
        bank_code: values.bank_code || null,
        bank_address: values.bank_address || null,
        swift_code: values.swift_code || null,
        settlement_payment_term: values.settlement_payment_term || null,
        settlement_calculation_method: values.settlement_calculation_method || null,
        settlement_credit_days: values.settlement_credit_days,
        settlement_advance_payment_percentage: values.settlement_advance_payment_percentage,
        settlement_balance_trigger_event: values.settlement_balance_trigger_event || null,
        settlement_currency: values.settlement_currency || null,
        settlement_prepayment_pool: values.settlement_prepayment_pool === "enabled",
        settlement_prepayment_threshold: values.settlement_prepayment_threshold,
        settlement_current_prepaid_balance: values.settlement_current_prepaid_balance,
        remark: values.remark || null,
        status: values.status,
      };

      let materialVendorId = initialVendor?.id ?? null;

      if (mode === "create") {
        const { data, error } = await supabase
          .from("material_vendors")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        materialVendorId = data.id;
      } else {
        if (!materialVendorId) throw new Error("Missing material vendor record");
        const { error } = await supabase
          .from("material_vendors")
          .update(payload)
          .eq("id", materialVendorId);
        if (error) throw error;
      }

      if (!materialVendorId) throw new Error("Missing material vendor id");

      const { error: deleteAttachmentsError } = await supabase
        .from("material_vendor_attachment_links")
        .delete()
        .eq("material_vendor_id", materialVendorId);
      if (deleteAttachmentsError) throw deleteAttachmentsError;

      const cleanedAttachments = values.attachment_links
        .map((item) => ({
          url: item.url.trim(),
          remark: item.remark.trim(),
        }))
        .filter((item) => item.url);

      if (cleanedAttachments.length > 0) {
        const { error: insertAttachmentsError } = await supabase
          .from("material_vendor_attachment_links")
          .insert(
            cleanedAttachments.map((item) => ({
              material_vendor_id: materialVendorId,
              url: item.url,
              remark: item.remark || null,
            }))
          );
        if (insertAttachmentsError) throw insertAttachmentsError;
      }

      await revalidateMaterialVendorViews(materialVendorId);
      toast({
        title: mode === "create" ? "Material vendor created" : "Material vendor updated",
        description: values.vendor_code,
      });
      router.push(`/partners/material-vendors/${materialVendorId}`);
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title:
          mode === "create"
            ? "Could not create material vendor"
            : "Could not update material vendor",
        description: getErrorMessage(error),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-4 px-4 py-6 md:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link
                href="/partners/material-vendors"
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                <ArrowLeft className="size-4" />
                Back to Material Vendors
              </Link>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {mode === "create"
                ? "New Material Vendor"
                : mode === "edit"
                  ? "Edit Material Vendor"
                  : "Material Vendor Detail"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Maintain material vendor profile, bank details, settlement terms, and attachments.
            </p>
          </div>
          {mode === "view" && initialVendor ? (
            <Button asChild>
              <Link href={`/partners/material-vendors/${initialVendor.id}/edit`}>
                <Pencil className="size-4" />
                Edit Material Vendor
              </Link>
            </Button>
          ) : null}
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
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

              {tab === "basic" ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <FormField
                    control={form.control}
                    name="vendor_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <RequiredLabel>Vendor Code</RequiredLabel>
                        </FormLabel>
                        <FormControl>
                          <Input {...field} readOnly disabled className={lockedFieldClassName} />
                        </FormControl>
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
                        {readOnly ? (
                          <ReadOnlyInput value={field.value} />
                        ) : (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {MATERIAL_VENDOR_STATUS_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
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
                    name="legal_company_name"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>
                          <RequiredLabel>Legal Company Name</RequiredLabel>
                        </FormLabel>
                        <FormControl>
                          <Input {...field} readOnly={readOnly} disabled={readOnly} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="company_name"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Company Name (Other Language)</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly={readOnly} disabled={readOnly} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2 xl:col-span-4">
                        <FormLabel>
                          <RequiredLabel>Address</RequiredLabel>
                        </FormLabel>
                        <FormControl>
                          <Input {...field} readOnly={readOnly} disabled={readOnly} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <RequiredLabel>Country</RequiredLabel>
                        </FormLabel>
                        <FormControl>
                          <Input {...field} readOnly={readOnly} disabled={readOnly} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="primary_contact_person"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Contact Person</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly={readOnly} disabled={readOnly} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="material_category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <RequiredLabel>Material Category</RequiredLabel>
                        </FormLabel>
                        {readOnly ? (
                          <ReadOnlyInput value={field.value} />
                        ) : (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {MATERIAL_CATEGORY_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
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
                    name="pic_user_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PIC</FormLabel>
                        {readOnly ? (
                          <ReadOnlyInput
                            value={
                              picOptions.find((option) => option.id === field.value)?.full_name ??
                              initialVendor?.pic_user?.full_name ??
                              ""
                            }
                          />
                        ) : (
                          <Select
                            onValueChange={(value) =>
                              field.onChange(value === "__none__" ? "" : value)
                            }
                            value={field.value || "__none__"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select PIC" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="__none__">None</SelectItem>
                              {picOptions.map((option) => (
                                <SelectItem key={option.id} value={option.id}>
                                  {option.full_name ?? option.email}
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
                    name="contact_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly={readOnly} disabled={readOnly} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contact_tel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tel</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly={readOnly} disabled={readOnly} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="is_default_vendor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Vendor</FormLabel>
                        {readOnly ? (
                          <ReadOnlyInput value={field.value === "yes" ? "Yes" : "No"} />
                        ) : (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select default flag" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="yes">Yes</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ) : null}

              {tab === "bank" ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {(
                    [
                      ["bank_account_name", "Account Name"],
                      ["bank_account_number", "Account Number"],
                      ["bank_name", "Bank Name"],
                      ["bank_code", "Bank Code"],
                      ["bank_address", "Bank Address"],
                      ["swift_code", "SWIFT Code"],
                    ] as const
                  ).map(([name, label]) => (
                    <FormField
                      key={name}
                      control={form.control}
                      name={name}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{label}</FormLabel>
                          <FormControl>
                            <Input {...field} readOnly={readOnly} disabled={readOnly} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              ) : null}

              {tab === "settlement" ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <FormField
                    control={form.control}
                    name="settlement_payment_term"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Term</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly={readOnly} disabled={readOnly} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="settlement_calculation_method"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Settlement Calculation Method</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly={readOnly} disabled={readOnly} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="settlement_credit_days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Credit Days</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            readOnly={readOnly}
                            disabled={readOnly}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="settlement_advance_payment_percentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Advance Payment Percentage</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            readOnly={readOnly}
                            disabled={readOnly}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="settlement_balance_trigger_event"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Balance Trigger Event</FormLabel>
                        {readOnly ? (
                          <ReadOnlyInput value={field.value} />
                        ) : (
                          <Select
                            onValueChange={(value) =>
                              field.onChange(value === "__none__" ? "" : value)
                            }
                            value={field.value || "__none__"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select trigger event" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="__none__">None</SelectItem>
                              {MATERIAL_VENDOR_BALANCE_TRIGGER_EVENT_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
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
                    name="settlement_currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Settlement Currency</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly={readOnly} disabled={readOnly} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="settlement_prepayment_pool"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prepayment Pool</FormLabel>
                        {readOnly ? (
                          <ReadOnlyInput value={field.value === "enabled" ? "Enabled" : "Disabled"} />
                        ) : (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select pool status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="enabled">Enabled</SelectItem>
                              <SelectItem value="disabled">Disabled</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="settlement_prepayment_threshold"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prepayment Threshold</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            step="0.01"
                            readOnly={readOnly}
                            disabled={readOnly}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="settlement_current_prepaid_balance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Prepaid Balance</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            step="0.01"
                            readOnly={readOnly}
                            disabled={readOnly}
                            className={readOnly ? lockedFieldClassName : undefined}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ) : null}

              {tab === "attachments" ? (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="remark"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Remark</FormLabel>
                        <FormControl>
                          <Textarea {...field} readOnly={readOnly} disabled={readOnly} rows={4} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-3 rounded-lg border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-semibold">Attachment Links</h2>
                        <p className="text-xs text-muted-foreground">
                          Store attachment URLs and optional remarks for this material vendor.
                        </p>
                      </div>
                      {!readOnly ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => appendAttachment({ url: "", remark: "" })}
                        >
                          <Plus className="size-4" />
                          Add Link
                        </Button>
                      ) : null}
                    </div>

                    {attachmentFields.length === 0 ? (
                      <div className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                        No attachment links added.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {attachmentFields.map((field, index) => (
                          <div key={field.id} className="grid gap-3 rounded-md border p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                            <FormField
                              control={form.control}
                              name={`attachment_links.${index}.url`}
                              render={({ field: nestedField }) => (
                                <FormItem>
                                  <FormLabel>URL</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...nestedField}
                                      readOnly={readOnly}
                                      disabled={readOnly}
                                      placeholder="https://"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`attachment_links.${index}.remark`}
                              render={({ field: nestedField }) => (
                                <FormItem>
                                  <FormLabel>Remark</FormLabel>
                                  <FormControl>
                                    <Input {...nestedField} readOnly={readOnly} disabled={readOnly} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="flex items-end gap-2">
                              {readOnly ? (
                                <Button asChild variant="outline" size="icon">
                                  <a href={form.getValues(`attachment_links.${index}.url`)} target="_blank" rel="noreferrer">
                                    <ExternalLink className="size-4" />
                                  </a>
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => removeAttachment(index)}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
                <Button type="button" variant="outline" asChild>
                  <Link href="/partners/material-vendors">
                    Cancel
                  </Link>
                </Button>
                {readOnly ? null : (
                  <Button type="submit" disabled={saving}>
                    {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                    {mode === "create" ? "Create Material Vendor" : "Save Changes"}
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
