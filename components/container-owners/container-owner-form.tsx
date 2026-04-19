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
  revalidateContainerOwnerViews,
  type ContainerOwnerPicOption,
  type ContainerOwnerRegionOption,
} from "@/app/partners/container-owners/actions";
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
import { generateContainerOwnerCode } from "@/lib/container-owners/generate-container-owner-code";
import type {
  ContainerOwner,
  ContainerOwnerBalanceTriggerEvent,
  ContainerOwnerStatus,
} from "@/types/container-owner";
import {
  CONTAINER_OWNER_BALANCE_TRIGGER_EVENT_OPTIONS,
  CONTAINER_OWNER_STATUS_OPTIONS,
} from "@/types/container-owner";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const lockedFieldClassName =
  "bg-muted/50 text-muted-foreground cursor-not-allowed hover:cursor-not-allowed";

const attachmentSchema = z.object({
  id: z.string().optional(),
  url: z.string().trim().url("Enter a valid URL"),
  remark: z.string().trim(),
});

const containerOwnerFormSchema = z.object({
  container_owner_code: z
    .string()
    .trim()
    .regex(
      /^O[A-Z0-9]{5}$/,
      "Container owner code must be 6 uppercase characters starting with O"
    ),
  status: z.enum(
    CONTAINER_OWNER_STATUS_OPTIONS as [
      ContainerOwnerStatus,
      ...ContainerOwnerStatus[],
    ]
  ),
  uses_internal_container_numbering: z.boolean(),
  legal_company_name: z.string().trim().min(1, "Legal company name is required"),
  company_name: z.string().trim(),
  address: z.string().trim(),
  region_id: z.string().trim(),
  country: z.string().trim(),
  primary_contact_person: z.string().trim(),
  contact_email: z
    .string()
    .trim()
    .refine((value) => value === "" || emailPattern.test(value), "Enter a valid email address"),
  contact_tel: z.string().trim(),
  pic_user_id: z.string().trim(),
  bank_account_name: z.string().trim(),
  bank_account_number: z.string().trim(),
  bank_name: z.string().trim(),
  bank_code: z.string().trim(),
  bank_address: z.string().trim(),
  swift_code: z.string().trim(),
  settlement_payment_term: z.string().trim(),
  settlement_credit_days: z.coerce.number().min(0, "Credit days must be 0 or greater"),
  settlement_advance_payment_percentage: z.coerce
    .number()
    .min(0, "Advance payment percentage must be 0 or greater")
    .max(100, "Advance payment percentage cannot exceed 100"),
  settlement_balance_trigger_event: z.union([
    z.literal(""),
    z.enum(
      CONTAINER_OWNER_BALANCE_TRIGGER_EVENT_OPTIONS as [
        ContainerOwnerBalanceTriggerEvent,
        ...ContainerOwnerBalanceTriggerEvent[],
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

type ContainerOwnerFormValues = z.infer<typeof containerOwnerFormSchema>;
type ContainerOwnerTabKey = "basic" | "bank" | "settlement" | "attachments";

const tabs: Array<[ContainerOwnerTabKey, string]> = [
  ["basic", "Basic Info"],
  ["bank", "Bank Information"],
  ["settlement", "Settlement"],
  ["attachments", "Attachments"],
];

function mapContainerOwnerToForm(owner: ContainerOwner): ContainerOwnerFormValues {
  return {
    container_owner_code: owner.container_owner_code,
    status: owner.status,
    uses_internal_container_numbering: owner.uses_internal_container_numbering,
    legal_company_name: owner.legal_company_name,
    company_name: owner.company_name ?? "",
    address: owner.address ?? "",
    region_id: owner.region_id ?? "",
    country: owner.country ?? "",
    primary_contact_person: owner.primary_contact_person ?? "",
    contact_email: owner.contact_email ?? "",
    contact_tel: owner.contact_tel ?? "",
    pic_user_id: owner.pic_user_id ?? "",
    bank_account_name: owner.bank_account_name ?? "",
    bank_account_number: owner.bank_account_number ?? "",
    bank_name: owner.bank_name ?? "",
    bank_code: owner.bank_code ?? "",
    bank_address: owner.bank_address ?? "",
    swift_code: owner.swift_code ?? "",
    settlement_payment_term: owner.settlement_payment_term ?? "",
    settlement_credit_days: Number(owner.settlement_credit_days ?? 0),
    settlement_advance_payment_percentage: Number(
      owner.settlement_advance_payment_percentage ?? 0
    ),
    settlement_balance_trigger_event: owner.settlement_balance_trigger_event ?? "",
    settlement_currency: owner.settlement_currency ?? "",
    settlement_prepayment_pool:
      owner.settlement_prepayment_pool === true ? "enabled" : "disabled",
    settlement_prepayment_threshold: Number(owner.settlement_prepayment_threshold ?? 0),
    settlement_current_prepaid_balance: Number(
      owner.settlement_current_prepaid_balance ?? 0
    ),
    remark: owner.remark ?? "",
    attachment_links: (owner.attachment_links ?? []).map((item) => ({
      id: item.id,
      url: item.url,
      remark: item.remark ?? "",
    })),
  };
}

function defaultValues(picUserId = ""): ContainerOwnerFormValues {
  return {
    container_owner_code: "",
    status: "Normal",
    uses_internal_container_numbering: false,
    legal_company_name: "",
    company_name: "",
    address: "",
    region_id: "",
    country: "",
    primary_contact_person: "",
    contact_email: "",
    contact_tel: "",
    pic_user_id: picUserId,
    bank_account_name: "",
    bank_account_number: "",
    bank_name: "",
    bank_code: "",
    bank_address: "",
    swift_code: "",
    settlement_payment_term: "",
    settlement_credit_days: 0,
    settlement_advance_payment_percentage: 0,
    settlement_balance_trigger_event: "",
    settlement_currency: "",
    settlement_prepayment_pool: "disabled",
    settlement_prepayment_threshold: 0,
    settlement_current_prepaid_balance: 0,
    remark: "",
    attachment_links: [],
  };
}

async function isContainerOwnerCodeTaken(code: string, excludeId?: string) {
  const supabase = createBrowserClient();
  let query = supabase
    .from("container_owners")
    .select("id")
    .eq("container_owner_code", code.trim());
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query.limit(1);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

async function isLegalCompanyNameTaken(name: string, excludeId?: string) {
  const supabase = createBrowserClient();
  let query = supabase
    .from("container_owners")
    .select("id")
    .eq("legal_company_name", name.trim());
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query.limit(1);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

async function generateUniqueContainerOwnerCode() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = generateContainerOwnerCode();
    const taken = await isContainerOwnerCodeTaken(candidate);
    if (!taken) return candidate;
  }
  throw new Error("Could not generate a unique container owner code");
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

export function ContainerOwnerForm({
  mode,
  initialContainerOwner,
  regionOptions,
  picOptions,
}: {
  mode: "create" | "edit" | "view";
  initialContainerOwner?: ContainerOwner | null;
  regionOptions: ContainerOwnerRegionOption[];
  picOptions: ContainerOwnerPicOption[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<ContainerOwnerTabKey>("basic");

  const form = useForm<ContainerOwnerFormValues>({
    resolver: zodResolver(containerOwnerFormSchema) as Resolver<ContainerOwnerFormValues>,
    defaultValues:
      mode === "create"
        ? defaultValues(picOptions[0]?.id ?? "")
        : initialContainerOwner
          ? mapContainerOwnerToForm(initialContainerOwner)
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
    } else if (initialContainerOwner) {
      const next = mapContainerOwnerToForm(initialContainerOwner);
      form.reset(next);
      replaceAttachments(next.attachment_links);
    }
    setTab("basic");
  }, [form, initialContainerOwner, mode, picOptions, replaceAttachments]);

  useEffect(() => {
    if (mode !== "create") return;
    if (form.getValues("container_owner_code")) return;
    let active = true;
    void (async () => {
      try {
        const code = await generateUniqueContainerOwnerCode();
        if (!active) return;
        form.setValue("container_owner_code", code, { shouldValidate: true });
      } catch (error) {
        if (!active) return;
        toast({
          variant: "destructive",
          title: "Could not generate container owner code",
          description: getErrorMessage(error),
        });
      }
    })();
    return () => {
      active = false;
    };
  }, [form, mode]);

  const selectedRegion = regionOptions.find((option) => option.id === form.watch("region_id"));
  const readOnly = mode === "view";

  async function onSubmit(values: ContainerOwnerFormValues) {
    setSaving(true);
    try {
      if (
        await isLegalCompanyNameTaken(
          values.legal_company_name,
          initialContainerOwner?.id
        )
      ) {
        form.setError("legal_company_name", {
          type: "manual",
          message: "Legal company name already exists",
        });
        setSaving(false);
        return;
      }

      if (
        await isContainerOwnerCodeTaken(
          values.container_owner_code,
          initialContainerOwner?.id
        )
      ) {
        form.setError("container_owner_code", {
          type: "manual",
          message: "Container owner code already exists",
        });
        setSaving(false);
        return;
      }

      const supabase = createBrowserClient();
      const payload = {
        container_owner_code: values.container_owner_code,
        legal_company_name: values.legal_company_name,
        company_name: values.company_name || null,
        uses_internal_container_numbering: values.uses_internal_container_numbering,
        address: values.address || null,
        region_id: values.region_id || null,
        country: values.country || null,
        primary_contact_person: values.primary_contact_person || null,
        contact_email: values.contact_email || null,
        contact_tel: values.contact_tel || null,
        pic_user_id:
          values.pic_user_id && values.pic_user_id !== "__none__"
            ? values.pic_user_id
            : null,
        bank_account_name: values.bank_account_name || null,
        bank_account_number: values.bank_account_number || null,
        bank_name: values.bank_name || null,
        bank_code: values.bank_code || null,
        bank_address: values.bank_address || null,
        swift_code: values.swift_code || null,
        settlement_payment_term: values.settlement_payment_term || null,
        settlement_credit_days: values.settlement_credit_days,
        settlement_advance_payment_percentage:
          values.settlement_advance_payment_percentage,
        settlement_balance_trigger_event:
          values.settlement_balance_trigger_event || null,
        settlement_currency: values.settlement_currency || null,
        settlement_prepayment_pool: values.settlement_prepayment_pool === "enabled",
        settlement_prepayment_threshold: values.settlement_prepayment_threshold,
        settlement_current_prepaid_balance: values.settlement_current_prepaid_balance,
        remark: values.remark || null,
        status: values.status,
      };

      let containerOwnerId = initialContainerOwner?.id ?? null;

      if (mode === "create") {
        const { data, error } = await supabase
          .from("container_owners")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        containerOwnerId = data.id;
      } else {
        if (!containerOwnerId) throw new Error("Missing container owner record");
        const { error } = await supabase
          .from("container_owners")
          .update(payload)
          .eq("id", containerOwnerId);
        if (error) throw error;
      }

      if (!containerOwnerId) throw new Error("Missing container owner id");

      const { error: deleteAttachmentsError } = await supabase
        .from("container_owner_attachment_links")
        .delete()
        .eq("container_owner_id", containerOwnerId);
      if (deleteAttachmentsError) throw deleteAttachmentsError;

      const cleanedAttachments = values.attachment_links
        .map((item) => ({
          url: item.url.trim(),
          remark: item.remark.trim(),
        }))
        .filter((item) => item.url);

      if (cleanedAttachments.length > 0) {
        const { error: insertAttachmentsError } = await supabase
          .from("container_owner_attachment_links")
          .insert(
            cleanedAttachments.map((item) => ({
              container_owner_id: containerOwnerId,
              url: item.url,
              remark: item.remark || null,
            }))
          );
        if (insertAttachmentsError) throw insertAttachmentsError;
      }

      await revalidateContainerOwnerViews(containerOwnerId);
      toast({
        title:
          mode === "create"
            ? "Container owner created"
            : "Container owner updated",
        description: values.container_owner_code,
      });
      router.push(`/partners/container-owners/${containerOwnerId}`);
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title:
          mode === "create"
            ? "Could not create container owner"
            : "Could not update container owner",
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
                href="/partners/container-owners"
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                <ArrowLeft className="size-4" />
                Back to Container Owners
              </Link>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {mode === "create"
                ? "New Container Owner"
                : mode === "edit"
                  ? "Edit Container Owner"
                  : "Container Owner Detail"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Maintain container-owner profile, banking setup, settlement terms, and attachments.
            </p>
          </div>
          {mode === "view" && initialContainerOwner ? (
            <Button asChild>
              <Link href={`/partners/container-owners/${initialContainerOwner.id}/edit`}>
                <Pencil className="size-4" />
                Edit Container Owner
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
                    name="container_owner_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <RequiredLabel>Container Owner Code</RequiredLabel>
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
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
                              {CONTAINER_OWNER_STATUS_OPTIONS.map((option) => (
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
                    name="uses_internal_container_numbering"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Use Our Container Numbering</FormLabel>
                        <FormControl>
                          <label className="flex h-10 items-center gap-2 rounded-md border border-input px-3 text-sm">
                            <input
                              type="checkbox"
                              aria-label="Use Our Container Numbering"
                              checked={field.value}
                              onChange={(event) => field.onChange(event.target.checked)}
                              disabled={readOnly}
                            />
                            <span>{field.value ? "Enabled" : "Disabled"}</span>
                          </label>
                        </FormControl>
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
                        <FormLabel>Company Name</FormLabel>
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
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly={readOnly} disabled={readOnly} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="region_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Region</FormLabel>
                        {readOnly ? (
                          <ReadOnlyInput value={selectedRegion?.region_code ?? ""} />
                        ) : (
                          <Select
                            onValueChange={(value) =>
                              field.onChange(value === "__none__" ? "" : value)
                            }
                            value={field.value || "__none__"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select region" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="__none__">None</SelectItem>
                              {regionOptions.map((option) => (
                                <SelectItem key={option.id} value={option.id}>
                                  {option.region_code}
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
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
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
                    name="pic_user_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PIC</FormLabel>
                        {readOnly ? (
                          <ReadOnlyInput
                            value={
                              picOptions.find((option) => option.id === field.value)?.full_name ??
                              initialContainerOwner?.pic_user?.full_name ??
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
                              {CONTAINER_OWNER_BALANCE_TRIGGER_EVENT_OPTIONS.map((option) => (
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
                          <ReadOnlyInput
                            value={field.value === "enabled" ? "Enabled" : "Disabled"}
                          />
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
                          Store attachment URLs and optional remarks for this container owner.
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
                  <Link href="/partners/container-owners">
                    Cancel
                  </Link>
                </Button>
                {readOnly ? null : (
                  <Button type="submit" disabled={saving}>
                    {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                    {mode === "create" ? "Create Container Owner" : "Save Changes"}
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
