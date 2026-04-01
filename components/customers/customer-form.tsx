"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ExternalLink, Loader2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";

import { revalidateCustomerViews } from "@/app/customers/actions";
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
import { classifyCustomerSaveError, isOccConflict } from "@/lib/customers/customer-save-errors";
import { generateCustomerCustomId } from "@/lib/customers/generate-customer-custom-id";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Customer, CustomerStatus } from "@/types/customer";

const CUSTOMER_STATUS_OPTIONS: readonly CustomerStatus[] = [
  "Normal",
  "Prepayment",
  "Blacklisted",
] as const;

const CUSTOMER_GRADE_OPTIONS = ["A", "B", "C", "D"] as const;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type RegionOption = {
  id: string;
  region_code: string;
  region_name: string | null;
};

function parseEmailList(raw: string) {
  return raw
    .split(/[\n,;]+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function validateEmailList(raw: string, required: boolean, label: string) {
  const emails = parseEmailList(raw);
  if (required && emails.length === 0) return `${label} is required`;
  for (const email of emails) {
    if (!emailPattern.test(email)) return `Invalid email in ${label}`;
  }
  return null;
}

const customerFormSchema = z.object({
  customer_custom_id: z.string().min(1),
  status: z.enum(CUSTOMER_STATUS_OPTIONS as [CustomerStatus, ...CustomerStatus[]]),
  company_name: z.string().trim().min(1, "Legal company name is required"),
  company_name_other_language: z.string(),
  customer_grade: z.enum(CUSTOMER_GRADE_OPTIONS),
  region_id: z.string().trim().min(1, "Customer region is required"),
  address: z.string(),
  contact_phone: z.string(),
  contact_person: z.string(),
  primary_contact_email: z
    .string()
    .trim()
    .min(1, "Primary Contact Email is required")
    .refine((value) => emailPattern.test(value), "Invalid primary contact email"),
  ops_emails: z.string(),
  finance_emails: z.string(),
  credit_limit: z.number().min(0),
  credit_term_days: z.number().int().min(1, "Credit term (days) is required"),
  assigned_sales: z.string().trim().min(1, "Assigned sales is required"),
  notes: z.string(),
  certificate_links: z.array(z.string()),
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;

export type CustomerFormProps = {
  mode: "create" | "edit" | "view";
  initialCustomer?: Customer | null;
};

function mapCustomerToForm(customer: Customer): CustomerFormValues {
  return {
    customer_custom_id: customer.customer_custom_id ?? generateCustomerCustomId(),
    status: customer.status,
    company_name: customer.company_name,
    company_name_other_language: customer.company_name_other_language ?? "",
    customer_grade: (customer.customer_grade as (typeof CUSTOMER_GRADE_OPTIONS)[number]) ?? "C",
    region_id: customer.region_id ?? "",
    address: customer.address ?? "",
    contact_phone: customer.contact_phone ?? "",
    contact_person: customer.contact_person ?? "",
    primary_contact_email: customer.purchasing_emails?.[0] ?? "",
    ops_emails: (customer.ops_emails ?? []).join(", "),
    finance_emails: (customer.finance_emails ?? []).join(", "),
    credit_limit: Number(customer.credit_limit ?? 0),
    credit_term_days: Number(customer.credit_term_days ?? 3),
    assigned_sales: customer.assigned_sales ?? "",
    notes: customer.notes ?? "",
    certificate_links: (customer.certificate_links ?? []).map((item) => item.link_url),
  };
}

function defaultValues(): CustomerFormValues {
  return {
    customer_custom_id: generateCustomerCustomId(),
    status: "Normal",
    company_name: "",
    company_name_other_language: "",
    customer_grade: "C",
    region_id: "",
    address: "",
    contact_phone: "",
    contact_person: "",
    primary_contact_email: "",
    ops_emails: "",
    finance_emails: "",
    credit_limit: 0,
    credit_term_days: 3,
    assigned_sales: "",
    notes: "",
    certificate_links: [""],
  };
}

async function isCompanyNameTaken(name: string, excludeId?: string) {
  const supabase = createBrowserClient();
  let query = supabase.from("customers").select("id").eq("company_name", name.trim());
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query.limit(1);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

async function isCustomerIdTaken(customerId: string, excludeId?: string) {
  const supabase = createBrowserClient();
  let query = supabase.from("customers").select("id").eq("customer_custom_id", customerId.trim());
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query.limit(1);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
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
      className="cursor-not-allowed bg-muted/50 text-foreground/80"
    />
  );
}

function FieldShell({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-sm font-medium">
        {label}
        {required ? <span className="ml-0.5 text-current">*</span> : null}
      </div>
      {children}
    </div>
  );
}

export function CustomerForm({ mode, initialCustomer }: CustomerFormProps) {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [saving, setSaving] = useState(false);
  const [regionOptions, setRegionOptions] = useState<RegionOption[]>([]);
  const occBaselineRef = useRef<string | null>(null);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema) as Resolver<CustomerFormValues>,
    defaultValues:
      mode === "create"
        ? defaultValues()
        : initialCustomer
          ? mapCustomerToForm(initialCustomer)
          : defaultValues(),
  });

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase
        .from("region_codes")
        .select("id, region_code, region_name")
        .order("region_code", { ascending: true });

      if (error) {
        toast({
          variant: "destructive",
          title: "Could not load regions",
          description: error.message,
        });
        return;
      }

      setRegionOptions((data ?? []) as RegionOption[]);
    })();
  }, [supabase]);

  useEffect(() => {
    if (mode === "create") {
      form.reset(defaultValues());
      occBaselineRef.current = null;
      return;
    }

    if (initialCustomer) {
      form.reset(mapCustomerToForm(initialCustomer));
      occBaselineRef.current = initialCustomer.updated_at;
    }
  }, [form, initialCustomer, mode]);

  const readOnly = mode === "view";
  const certificateLinks = form.watch("certificate_links");
  const selectedRegion = regionOptions.find((option) => option.id === form.watch("region_id"));

  async function onSubmit(values: CustomerFormValues) {
    const primaryEmailError = validateEmailList(
      values.primary_contact_email,
      true,
      "Primary Contact Email"
    );
    const opsError = validateEmailList(values.ops_emails, false, "Operations Emails");
    const financeError = validateEmailList(values.finance_emails, false, "Finance Emails");
    const emailError = primaryEmailError ?? opsError ?? financeError;

    if (emailError) {
      toast({
        variant: "destructive",
        title: "Invalid email fields",
        description: emailError,
      });
      return;
    }

    const cleanedLinks = values.certificate_links.map((item) => item.trim()).filter(Boolean);
    setSaving(true);

    try {
      const payload = {
        company_name: values.company_name.trim(),
        company_name_other_language: values.company_name_other_language.trim() || null,
        customer_grade: values.customer_grade,
        region_id: values.region_id,
        address: values.address.trim() || null,
        contact_phone: values.contact_phone.trim() || null,
        contact_person: values.contact_person.trim() || null,
        purchasing_emails: [values.primary_contact_email.trim()],
        ops_emails: parseEmailList(values.ops_emails),
        finance_emails: parseEmailList(values.finance_emails),
        credit_limit: Math.max(0, Number(values.credit_limit)),
        credit_term_days: Math.max(1, Number(values.credit_term_days)),
        assigned_sales: values.assigned_sales.trim(),
        notes: values.notes.trim() || null,
        status: values.status,
        updated_at: new Date().toISOString(),
      };

      if (mode === "create") {
        let allocatedId = values.customer_custom_id.trim();
        let tries = 0;
        while (tries < 12 && (await isCustomerIdTaken(allocatedId))) {
          allocatedId = generateCustomerCustomId();
          tries += 1;
        }

        if (await isCustomerIdTaken(allocatedId)) {
          throw new Error("Could not allocate customer ID.");
        }

        if (await isCompanyNameTaken(values.company_name)) {
          throw new Error("A customer with this legal company name already exists.");
        }

        const { data: inserted, error } = await supabase
          .from("customers")
          .insert({
            ...payload,
            customer_custom_id: allocatedId,
          })
          .select("id")
          .single();

        if (error) throw error;
        if (!inserted?.id) throw new Error("Customer insert did not return an id.");

        if (cleanedLinks.length > 0) {
          const { error: linksError } = await supabase.from("customer_certificate_links").insert(
            cleanedLinks.map((linkUrl) => ({
              customer_id: inserted.id,
              link_url: linkUrl,
            }))
          );
          if (linksError) throw linksError;
        }

        await revalidateCustomerViews(inserted.id);
        form.reset(defaultValues());
        toast({ title: "Customer created" });
        router.push("/partners/customers");
        router.refresh();
        return;
      }

      if (!initialCustomer) return;

      if (await isCompanyNameTaken(values.company_name, initialCustomer.id)) {
        throw new Error("Another customer already uses this legal company name.");
      }

      if (await isCustomerIdTaken(values.customer_custom_id, initialCustomer.id)) {
        throw new Error("Another customer already uses this customer ID.");
      }

      const { data: currentRow, error: currentError } = await supabase
        .from("customers")
        .select("updated_at")
        .eq("id", initialCustomer.id)
        .single();
      if (currentError) throw currentError;

      if (
        currentRow?.updated_at &&
        occBaselineRef.current &&
        isOccConflict(currentRow.updated_at, occBaselineRef.current)
      ) {
        throw new Error("This customer was updated elsewhere. Refresh and try again.");
      }

      const { data: saved, error } = await supabase
        .from("customers")
        .update({
          ...payload,
          customer_custom_id: values.customer_custom_id.trim(),
        })
        .eq("id", initialCustomer.id)
        .select("*")
        .single();
      if (error) throw error;

      const { error: deleteLinksError } = await supabase
        .from("customer_certificate_links")
        .delete()
        .eq("customer_id", initialCustomer.id);
      if (deleteLinksError) throw deleteLinksError;

      if (cleanedLinks.length > 0) {
        const { error: insertLinksError } = await supabase.from("customer_certificate_links").insert(
          cleanedLinks.map((linkUrl) => ({
            customer_id: initialCustomer.id,
            link_url: linkUrl,
          }))
        );
        if (insertLinksError) throw insertLinksError;
      }

      await revalidateCustomerViews(initialCustomer.id);
      occBaselineRef.current = (saved as Customer).updated_at;
      toast({ title: "Changes saved successfully." });
      router.refresh();
    } catch (error) {
      const { title, description } = classifyCustomerSaveError(error);
      toast({
        variant: "destructive",
        title,
        description,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <Button variant="outline" size="sm" className="gap-2" asChild>
          <Link href="/partners/customers">
            <ArrowLeft className="size-4" />
            Back
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">
          {mode === "create"
            ? "New Customer"
            : mode === "view"
              ? "Customer Details"
              : "Edit Customer"}
        </h1>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <p className="mb-5 text-sm text-muted-foreground">
          Maintain partner customer master data, credit setup, contact emails, and certificate links.
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-2">
              <FormField
                control={form.control}
                name="customer_custom_id"
                render={({ field }) => (
                  <FormItem>
                    <FieldShell label="Customer ID">
                      <FormControl>
                        <ReadOnlyInput value={field.value} />
                      </FormControl>
                    </FieldShell>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FieldShell label="Status">
                      {readOnly ? (
                        <ReadOnlyInput value={field.value} />
                      ) : (
                        <Select value={field.value} onValueChange={field.onChange} disabled={saving}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CUSTOMER_STATUS_OPTIONS.map((status) => (
                              <SelectItem key={status} value={status}>
                                {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </FieldShell>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem>
                    <FieldShell label="Legal Company Name" required>
                      <FormControl>
                        <Input
                          {...field}
                          readOnly={readOnly}
                          disabled={saving || readOnly}
                          className={readOnly ? "cursor-not-allowed bg-muted/50" : ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FieldShell>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="company_name_other_language"
                render={({ field }) => (
                  <FormItem>
                    <FieldShell label="Company Name (Other Language)">
                      <FormControl>
                        <Input
                          {...field}
                          readOnly={readOnly}
                          disabled={saving || readOnly}
                          className={readOnly ? "cursor-not-allowed bg-muted/50" : ""}
                        />
                      </FormControl>
                    </FieldShell>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customer_grade"
                render={({ field }) => (
                  <FormItem>
                    <FieldShell label="Customer Grade">
                      {readOnly ? (
                        <ReadOnlyInput value={field.value} />
                      ) : (
                        <Select value={field.value} onValueChange={field.onChange} disabled={saving}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select grade" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CUSTOMER_GRADE_OPTIONS.map((grade) => (
                              <SelectItem key={grade} value={grade}>
                                {grade}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </FieldShell>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="region_id"
                render={({ field }) => (
                  <FormItem>
                    <FieldShell label="Customer Region" required>
                      {readOnly ? (
                        <ReadOnlyInput value={selectedRegion?.region_code ?? ""} />
                      ) : (
                        <Select value={field.value} onValueChange={field.onChange} disabled={saving}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select region" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {regionOptions.map((option) => (
                              <SelectItem key={option.id} value={option.id}>
                                {option.region_code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <FormMessage />
                    </FieldShell>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FieldShell label="Company Address">
                      <FormControl>
                        <Input
                          {...field}
                          readOnly={readOnly}
                          disabled={saving || readOnly}
                          className={readOnly ? "cursor-not-allowed bg-muted/50" : ""}
                        />
                      </FormControl>
                    </FieldShell>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contact_phone"
                render={({ field }) => (
                  <FormItem>
                    <FieldShell label="Company Tel">
                      <FormControl>
                        <Input
                          {...field}
                          readOnly={readOnly}
                          disabled={saving || readOnly}
                          className={readOnly ? "cursor-not-allowed bg-muted/50" : ""}
                        />
                      </FormControl>
                    </FieldShell>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contact_person"
                render={({ field }) => (
                  <FormItem>
                    <FieldShell label="Contact Person">
                      <FormControl>
                        <Input
                          {...field}
                          readOnly={readOnly}
                          disabled={saving || readOnly}
                          className={readOnly ? "cursor-not-allowed bg-muted/50" : ""}
                        />
                      </FormControl>
                    </FieldShell>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="primary_contact_email"
                render={({ field }) => (
                  <FormItem>
                    <FieldShell label="Primary Contact Email" required>
                      <FormControl>
                        <Input
                          {...field}
                          readOnly={readOnly}
                          disabled={saving || readOnly}
                          className={readOnly ? "cursor-not-allowed bg-muted/50" : ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FieldShell>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ops_emails"
                render={({ field }) => (
                  <FormItem>
                    <FieldShell label="Operations Emails">
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Separate multiple emails with commas"
                          readOnly={readOnly}
                          disabled={saving || readOnly}
                          className={readOnly ? "cursor-not-allowed bg-muted/50" : ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FieldShell>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="finance_emails"
                render={({ field }) => (
                  <FormItem>
                    <FieldShell label="Finance Emails">
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Separate multiple emails with commas"
                          readOnly={readOnly}
                          disabled={saving || readOnly}
                          className={readOnly ? "cursor-not-allowed bg-muted/50" : ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FieldShell>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="credit_limit"
                render={({ field }) => (
                  <FormItem>
                    <FieldShell label="Credit Limit">
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          value={field.value}
                          onChange={(e) => field.onChange(Number(e.target.value || 0))}
                          readOnly={readOnly}
                          disabled={saving || readOnly}
                          className={readOnly ? "cursor-not-allowed bg-muted/50" : ""}
                        />
                      </FormControl>
                    </FieldShell>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="credit_term_days"
                render={({ field }) => (
                  <FormItem>
                    <FieldShell label="Credit Term (Days)" required>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          step={1}
                          value={field.value}
                          onChange={(e) => field.onChange(Number(e.target.value || 1))}
                          readOnly={readOnly}
                          disabled={saving || readOnly}
                          className={readOnly ? "cursor-not-allowed bg-muted/50" : ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FieldShell>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assigned_sales"
                render={({ field }) => (
                  <FormItem>
                    <FieldShell label="Assigned Sales" required>
                      <FormControl>
                        <Input
                          {...field}
                          readOnly={readOnly}
                          disabled={saving || readOnly}
                          className={readOnly ? "cursor-not-allowed bg-muted/50" : ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FieldShell>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FieldShell label="Notes">
                      <FormControl>
                        <Textarea
                          {...field}
                          rows={1}
                          readOnly={readOnly}
                          disabled={saving || readOnly}
                          className={readOnly ? "cursor-not-allowed resize-none bg-muted/50" : "min-h-[40px] resize-y"}
                        />
                      </FormControl>
                    </FieldShell>
                  </FormItem>
                )}
              />
            </div>

            <div className="rounded-2xl border border-border p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">List of Certificates</h2>
                  <p className="text-sm text-muted-foreground">
                    Store one or more attachment links for customer certificates.
                  </p>
                </div>
                {!readOnly ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() =>
                      form.setValue("certificate_links", [...certificateLinks, ""], {
                        shouldDirty: true,
                      })
                    }
                  >
                    <Plus className="size-4" />
                    Add Link
                  </Button>
                ) : null}
              </div>

              <div className="space-y-3">
                {certificateLinks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No certificate links added.</p>
                ) : (
                  certificateLinks.map((item, index) => (
                    <div key={`${index}:${item}`} className="flex items-start gap-3">
                      <Input
                        value={item}
                        placeholder="https://..."
                        readOnly={readOnly}
                        disabled={saving || readOnly}
                        className={readOnly ? "cursor-not-allowed bg-muted/50" : ""}
                        onChange={(e) => {
                          const next = [...certificateLinks];
                          next[index] = e.target.value;
                          form.setValue("certificate_links", next, { shouldDirty: true });
                        }}
                      />
                      {readOnly ? (
                        item ? (
                          <Button type="button" variant="outline" size="icon" asChild>
                            <a href={item} target="_blank" rel="noreferrer">
                              <ExternalLink className="size-4" />
                            </a>
                          </Button>
                        ) : null
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            const next = certificateLinks.filter((_, itemIndex) => itemIndex !== index);
                            form.setValue("certificate_links", next.length > 0 ? next : [""], {
                              shouldDirty: true,
                            });
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/partners/customers")}
                disabled={saving}
              >
                Cancel
              </Button>
              {mode !== "view" ? (
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Saving…
                    </>
                  ) : mode === "create" ? (
                    "Create Customer"
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              ) : null}
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
