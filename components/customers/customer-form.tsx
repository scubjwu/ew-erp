"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  HelpCircle,
  Loader2,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  useForm,
  useFormContext,
  useFormState,
  type ControllerRenderProps,
  type Resolver,
} from "react-hook-form";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  depotsToDepotInfo,
  depotInfoToDepots,
  filterNonemptyDepotRows,
} from "@/lib/depot-info";
import {
  classifyCustomerSaveError,
  isOccConflict,
} from "@/lib/customers/customer-save-errors";
import { revalidateCustomerViews } from "@/app/customers/actions";
import { generateCustomerCustomId } from "@/lib/customers/generate-customer-custom-id";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  getEmailListValidationIssues,
  isValidEmailAddress,
  normalizeEmailToken,
  parseEmailList,
  stringifyEmailList,
} from "@/lib/emails";
import {
  CUSTOMER_GRADE_OPTIONS,
  CUSTOMER_STATUS_OPTIONS,
  type Customer,
  type CustomerStatus,
  type DepotRow,
} from "@/types/customer";

function coerceCustomerGrade(
  raw: unknown
): (typeof CUSTOMER_GRADE_OPTIONS)[number] {
  if (raw == null || raw === "") return "C";
  const t = String(raw).trim();
  if (
    CUSTOMER_GRADE_OPTIONS.includes(
      t as (typeof CUSTOMER_GRADE_OPTIONS)[number]
    )
  ) {
    return t as (typeof CUSTOMER_GRADE_OPTIONS)[number];
  }
  const upper = t.toUpperCase();
  if (
    CUSTOMER_GRADE_OPTIONS.includes(
      upper as (typeof CUSTOMER_GRADE_OPTIONS)[number]
    )
  ) {
    return upper as (typeof CUSTOMER_GRADE_OPTIONS)[number];
  }
  return "C";
}

function coerceCustomerStatus(raw: unknown): CustomerStatus {
  if (raw == null || raw === "") return "Normal";
  const t = String(raw).trim();
  if (CUSTOMER_STATUS_OPTIONS.includes(t as CustomerStatus)) {
    return t as CustomerStatus;
  }
  const lower = t.toLowerCase();
  const byCase = CUSTOMER_STATUS_OPTIONS.find(
    (s) => s.toLowerCase() === lower
  );
  return byCase ?? "Normal";
}

/** Coerce before enum so RHF/Radix quirks (undefined, DB shapes) never fail parse. */
const gradeEnum = z.enum(
  CUSTOMER_GRADE_OPTIONS as unknown as [
    (typeof CUSTOMER_GRADE_OPTIONS)[number],
    ...(typeof CUSTOMER_GRADE_OPTIONS)[number][],
  ]
);

const statusEnum = z.enum(
  CUSTOMER_STATUS_OPTIONS as unknown as [CustomerStatus, ...CustomerStatus[]]
);

const customerGradeSchema = z.preprocess(
  (val) => coerceCustomerGrade(val),
  gradeEnum
);

const customerStatusSchema = z.preprocess(
  (val) => coerceCustomerStatus(val),
  statusEnum
);

const depotRowSchema = z.object({
  city_code: z.string(),
  city_name: z.string(),
  contact_person: z.string(),
  email: z.string().refine(
    (s) => {
      const t = s.trim();
      return t === "" || isValidEmailAddress(normalizeEmailToken(t));
    },
    { message: "Invalid email in depot row" }
  ),
  phone: z.string(),
  depot_name: z.string(),
  depot_address: z.string(),
  depot_tel: z.string(),
});

/** zodResolver puts row issues on `depots[i].email`, not on root `depots`. */
function firstDepotEmailValidationMessage(depotsError: unknown): string | undefined {
  if (!depotsError || typeof depotsError !== "object") return undefined;
  const root = depotsError as { message?: unknown };
  if (typeof root.message === "string" && root.message) return root.message;

  const rowEntries: unknown[] = Array.isArray(depotsError)
    ? depotsError
    : Object.keys(depotsError as Record<string, unknown>)
        .filter((k) => /^\d+$/.test(k))
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => (depotsError as Record<string, unknown>)[k]);

  for (const row of rowEntries) {
    if (!row || typeof row !== "object") continue;
    const email = (row as { email?: { message?: unknown } }).email;
    if (typeof email?.message === "string" && email.message) return email.message;
  }
  return undefined;
}

function multiEmailTextareaSchema(minCount: number, fieldLabel: string) {
  return z.string().superRefine((val, ctx) => {
    for (const msg of getEmailListValidationIssues(val, {
      minCount,
      fieldLabel,
    })) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: msg,
      });
    }
  });
}

const CUSTOM_ID_PATTERN = /^C[A-Z0-9]{5}$/;

const customerFormSchema = z.object({
  customer_custom_id: z
    .string()
    .refine(
      (s) => s === "" || CUSTOM_ID_PATTERN.test(s),
      "Invalid customer ID"
    ),
  company_name: z
    .string()
    .min(1, "Company name is required")
    .refine((s) => s.trim().length > 0, "Company name is required"),
  address: z.string(),
  notes: z.string(),
  customer_grade: customerGradeSchema,
  assigned_sales: z
    .string()
    .refine((s) => s.trim().length > 0, "Assigned sales is required"),
  status: customerStatusSchema,
  contact_phone: z.string(),
  credit_limit: z.number().int().min(0),
  credit_term_days: z.number().int().min(1, "Credit term (days) is required"),
  finance_emails: multiEmailTextareaSchema(0, "finance email"),
  ops_emails: multiEmailTextareaSchema(0, "operations email"),
  purchasing_emails: multiEmailTextareaSchema(1, "purchasing email"),
  depots: z.array(depotRowSchema),
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;

type CompanyNameFieldControlProps = {
  field: ControllerRenderProps<CustomerFormValues, "company_name">;
  disabled: boolean;
  checking: boolean;
  onCheckAvailability: () => void | Promise<void>;
};

function CompanyNameFieldControl({
  field,
  disabled,
  checking,
  onCheckAvailability,
}: CompanyNameFieldControlProps) {
  return (
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
      <FormControl className="m-0 flex-1 min-w-0">
        <Input {...field} autoComplete="organization" className="w-full" />
      </FormControl>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || checking}
        onClick={() => void onCheckAvailability()}
        className="w-full shrink-0 sm:w-auto"
      >
        {checking ? (
          <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
        ) : (
          <Search className="mr-2 size-4" aria-hidden />
        )}
        Check Availability
      </Button>
    </div>
  );
}

function DepotArrayFieldMessage() {
  const { control } = useFormContext<CustomerFormValues>();
  const { errors } = useFormState({ control });
  const msg = firstDepotEmailValidationMessage(errors.depots);
  if (!msg) return null;
  return (
    <p className="text-sm font-medium text-destructive" role="alert">
      {msg}
    </p>
  );
}

const defaultEmptyValues = (): CustomerFormValues => ({
  customer_custom_id: "",
  company_name: "",
  address: "",
  notes: "",
  customer_grade: "C",
  assigned_sales: "",
  status: "Normal",
  contact_phone: "",
  credit_limit: 0,
  credit_term_days: 3,
  finance_emails: "",
  ops_emails: "",
  purchasing_emails: "",
  depots: [],
});

function mapCustomerToForm(c: Customer): CustomerFormValues {
  const status = coerceCustomerStatus(c.status);
  const credit =
    status === "Prepayment" ? 0 : Math.round(Number(c.credit_limit));

  return {
    customer_custom_id: c.customer_custom_id ?? "",
    company_name: c.company_name,
    address: c.address ?? "",
    notes: c.notes ?? "",
    customer_grade: coerceCustomerGrade(c.customer_grade),
    assigned_sales: c.assigned_sales ?? "",
    status,
    contact_phone: c.contact_phone ?? "",
    credit_limit: credit,
    credit_term_days: Math.max(
      1,
      Math.trunc(Number(c.credit_term_days ?? 3))
    ),
    finance_emails: stringifyEmailList(c.finance_emails),
    ops_emails: stringifyEmailList(c.ops_emails),
    purchasing_emails: stringifyEmailList(c.purchasing_emails),
    depots: depotInfoToDepots(c.depot_info),
  };
}

function DepotDataTable({
  value: depots,
  readOnly,
  onChange,
  disabled = false,
}: {
  value: DepotRow[];
  readOnly: boolean;
  onChange: (next: DepotRow[]) => void;
  disabled?: boolean;
}) {
  const addRow = () => {
    onChange([
      ...depots,
      {
        city_code: "",
        city_name: "",
        contact_person: "",
        email: "",
        phone: "",
        depot_name: "",
        depot_address: "",
        depot_tel: "",
      },
    ]);
  };

  const updateRow = (index: number, field: keyof DepotRow, val: string) => {
    const next = [...depots];
    next[index] = { ...next[index], [field]: val };
    onChange(next);
  };

  const removeRow = (index: number) => {
    onChange(depots.filter((_, i) => i !== index));
  };

  const ro = readOnly || disabled;

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="relative w-full overflow-x-auto rounded-lg border border-slate-300 bg-white">
        <table className="w-full min-w-[1300px] table-fixed border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-300 bg-slate-100">
              <th className="h-10 w-[100px] border-r border-slate-300 px-3 text-left font-bold text-slate-800">
                City Code
              </th>
              <th className="h-10 w-[120px] border-r border-slate-300 px-3 text-left font-bold text-slate-800">
                City Name
              </th>
              <th className="h-10 w-[180px] border-r border-slate-300 px-3 text-left font-bold text-slate-800">
                Depot Name
              </th>
              <th className="h-10 w-[100px] border-r border-slate-300 px-3 text-left font-bold text-slate-800">
                Contact
              </th>
              <th className="h-10 w-[140px] border-r border-slate-300 px-3 text-left font-bold text-slate-800">
                Phone
              </th>
              <th className="h-10 w-[180px] border-r border-slate-300 px-3 text-left font-bold text-slate-800">
                Email
              </th>
              <th className="h-10 w-[120px] border-r border-slate-300 px-3 text-left font-bold text-slate-800">
                Depot Tel
              </th>
              <th className="h-10 min-w-[300px] border-r border-slate-300 px-3 text-left font-bold text-slate-800">
                Depot Address
              </th>
              {!ro && (
                <th className="sticky right-0 z-20 h-10 w-[60px] border-l border-slate-300 bg-slate-100 text-center font-bold text-slate-800 shadow-[-4px_0_10px_rgba(0,0,0,0.05)]">
                  Action
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {depots.length === 0 && (
              <tr>
                <td
                  colSpan={ro ? 8 : 9}
                  className="py-12 text-center italic text-slate-400"
                >
                  No depot information yet. Click &quot;+ Add Row&quot; to add
                  entries.
                </td>
              </tr>
            )}
            {depots.map((row, idx) => (
              <tr
                key={idx}
                className="transition-colors hover:bg-blue-50/30"
              >
                <td className="border-r border-slate-200 p-0">
                  <input
                    value={row.city_code}
                    readOnly={ro}
                    disabled={disabled}
                    onChange={(e) =>
                      updateRow(idx, "city_code", e.target.value.toUpperCase())
                    }
                    className="h-11 w-full border-none bg-transparent px-3 outline-none focus:ring-1 focus:ring-inset focus:ring-blue-500"
                  />
                </td>
                <td className="border-r border-slate-200 p-0">
                  <input
                    value={row.city_name}
                    readOnly={ro}
                    disabled={disabled}
                    onChange={(e) =>
                      updateRow(idx, "city_name", e.target.value)
                    }
                    className="h-11 w-full border-none bg-transparent px-3 outline-none focus:ring-1 focus:ring-inset focus:ring-blue-500"
                  />
                </td>
                <td className="border-r border-slate-200 p-0">
                  <input
                    value={row.depot_name}
                    readOnly={ro}
                    disabled={disabled}
                    onChange={(e) =>
                      updateRow(idx, "depot_name", e.target.value)
                    }
                    className="h-11 w-full border-none bg-transparent px-3 outline-none focus:ring-1 focus:ring-inset focus:ring-blue-500"
                  />
                </td>
                <td className="border-r border-slate-200 p-0">
                  <input
                    value={row.contact_person}
                    readOnly={ro}
                    disabled={disabled}
                    onChange={(e) =>
                      updateRow(idx, "contact_person", e.target.value)
                    }
                    className="h-11 w-full border-none bg-transparent px-3 outline-none focus:ring-1 focus:ring-inset focus:ring-blue-500"
                  />
                </td>
                <td className="border-r border-slate-200 p-0">
                  <input
                    value={row.phone}
                    readOnly={ro}
                    disabled={disabled}
                    onChange={(e) => updateRow(idx, "phone", e.target.value)}
                    className="h-11 w-full border-none bg-transparent px-3 outline-none focus:ring-1 focus:ring-inset focus:ring-blue-500"
                  />
                </td>
                <td className="border-r border-slate-200 p-0">
                  <input
                    value={row.email}
                    readOnly={ro}
                    disabled={disabled}
                    onChange={(e) => updateRow(idx, "email", e.target.value)}
                    className="h-11 w-full border-none bg-transparent px-3 outline-none focus:ring-1 focus:ring-inset focus:ring-blue-500"
                  />
                </td>
                <td className="border-r border-slate-200 p-0">
                  <input
                    value={row.depot_tel}
                    readOnly={ro}
                    disabled={disabled}
                    onChange={(e) =>
                      updateRow(idx, "depot_tel", e.target.value)
                    }
                    className="h-11 w-full border-none bg-transparent px-3 outline-none focus:ring-1 focus:ring-inset focus:ring-blue-500"
                  />
                </td>
                <td className="border-r border-slate-200 p-0">
                  <textarea
                    value={row.depot_address}
                    readOnly={ro}
                    disabled={disabled}
                    onChange={(e) =>
                      updateRow(idx, "depot_address", e.target.value)
                    }
                    className="h-11 w-full resize-none overflow-hidden border-none bg-transparent px-3 py-3 outline-none focus:ring-1 focus:ring-inset focus:ring-blue-500"
                  />
                </td>
                {!ro && (
                  <td className="sticky right-0 z-10 border-l border-slate-300 bg-white p-0 shadow-[-4px_0_10px_rgba(0,0,0,0.05)]">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => removeRow(idx)}
                      className="flex h-11 w-full items-center justify-center text-red-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!ro && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={addRow}
          className="h-9 w-fit border-slate-300 text-xs"
        >
          + Add Row
        </Button>
      )}
    </div>
  );
}

async function isCustomerCustomIdTaken(
  customId: string,
  excludeRowId?: string
): Promise<boolean> {
  const supabase = createBrowserClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id")
    .eq("customer_custom_id", customId)
    .limit(1);

  if (error) throw error;
  const row = data?.[0];
  if (!row) return false;
  if (excludeRowId && row.id === excludeRowId) return false;
  return true;
}

async function isCompanyNameTaken(
  name: string,
  excludeId?: string
): Promise<boolean> {
  const supabase = createBrowserClient();
  const trimmed = name.trim();
  if (!trimmed) return false;

  let query = supabase
    .from("customers")
    .select("id")
    .eq("company_name", trimmed);
  if (excludeId) {
    query = query.neq("id", excludeId);
  }
  const { data, error } = await query.limit(1);

  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export type CustomerFormProps = {
  mode: "create" | "edit";
  /** Required when `mode` is `edit`. */
  initialCustomer?: Customer | null;
};

export function CustomerForm({ mode, initialCustomer }: CustomerFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [checkingCompanyName, setCheckingCompanyName] = useState(false);
  const occBaselineRef = useRef<string | null>(null);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema) as Resolver<CustomerFormValues>,
    defaultValues:
      mode === "edit" && initialCustomer
        ? mapCustomerToForm(initialCustomer)
        : defaultEmptyValues(),
    mode: "onChange",
  });

  const status = form.watch("status");

  useEffect(() => {
    if (status === "Prepayment") {
      form.setValue("credit_limit", 0);
    }
  }, [status, form]);

  const serverSnapshotKey =
    mode === "create"
      ? "create"
      : initialCustomer
        ? `${initialCustomer.id}:${initialCustomer.updated_at}`
        : "edit-empty";

  useLayoutEffect(() => {
    if (mode === "create") {
      form.reset({
        ...defaultEmptyValues(),
        customer_custom_id: generateCustomerCustomId(),
      });
    } else if (initialCustomer) {
      form.reset(mapCustomerToForm(initialCustomer));
    }
    queueMicrotask(() => {
      void form.trigger();
    });
    // Re-sync only when `serverSnapshotKey` changes (id + updated_at), not when the
    // `initialCustomer` object reference changes. Otherwise `router.refresh()` can
    // re-pass a cached row and overwrite the form with stale values after a save.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initialCustomer is read for the snapshot key's render only
  }, [mode, serverSnapshotKey, form]);

  const creditReadOnly = useMemo(
    () => status === "Prepayment",
    [status]
  );

  useEffect(() => {
    if (mode === "edit" && initialCustomer) {
      occBaselineRef.current = initialCustomer.updated_at;
    } else {
      occBaselineRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- baseline tracks server snapshot key, not prop identity
  }, [mode, serverSnapshotKey]);

  const isDirty = form.formState.isDirty;

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  function confirmDiscardUnsaved(): boolean {
    if (!form.formState.isDirty) return true;
    return window.confirm(
      "You have unsaved changes. Leave this page without saving?"
    );
  }

  async function onSubmit(values: CustomerFormValues) {
    setSaving(true);
    try {
      const supabase = createBrowserClient();

      const purchasingIssues = getEmailListValidationIssues(
        values.purchasing_emails,
        { minCount: 1, fieldLabel: "purchasing email" }
      );
      const financeIssues = getEmailListValidationIssues(values.finance_emails, {
        minCount: 0,
        fieldLabel: "finance email",
      });
      const opsIssues = getEmailListValidationIssues(values.ops_emails, {
        minCount: 0,
        fieldLabel: "operations email",
      });
      const emailIssues = [
        ...purchasingIssues,
        ...financeIssues,
        ...opsIssues,
      ];
      for (const row of values.depots) {
        const t = normalizeEmailToken(row.email.trim());
        if (t && !isValidEmailAddress(t)) {
          emailIssues.push(`Invalid email (depot): ${row.email.trim()}`);
        }
      }
      if (emailIssues.length > 0) {
        toast({
          variant: "destructive",
          title: "Invalid email addresses",
          description: emailIssues[0],
        });
        return;
      }

      const purchasing_emails = parseEmailList(values.purchasing_emails);
      const fParsed = parseEmailList(values.finance_emails);
      const oParsed = parseEmailList(values.ops_emails);
      const finance_emails =
        fParsed.length > 0 ? fParsed : [...purchasing_emails];
      const ops_emails =
        oParsed.length > 0 ? oParsed : [...purchasing_emails];

      const credit_limit =
        values.status === "Prepayment"
          ? 0
          : Math.max(0, Math.trunc(Number(values.credit_limit)));

      const credit_term_days = Math.max(
        1,
        Math.trunc(Number(values.credit_term_days))
      );

      const depot_info = depotsToDepotInfo(
        filterNonemptyDepotRows(values.depots)
      );

      const rowCommon = {
        company_name: values.company_name.trim(),
        address: values.address.trim() || null,
        notes: values.notes.trim() || null,
        customer_grade: values.customer_grade,
        assigned_sales: values.assigned_sales.trim(),
        status: values.status,
        contact_phone: values.contact_phone.trim() || null,
        credit_limit,
        credit_term_days,
        finance_emails,
        ops_emails,
        purchasing_emails,
        depot_info,
      };

      if (mode === "create") {
        let newCustomId = values.customer_custom_id.trim();
        let tries = 0;
        while (tries < 12 && (await isCustomerCustomIdTaken(newCustomId))) {
          newCustomId = generateCustomerCustomId();
          tries++;
        }
        if (await isCustomerCustomIdTaken(newCustomId)) {
          toast({
            variant: "destructive",
            title: "Could not allocate customer ID",
            description: "Please try again.",
          });
          return;
        }
        if (newCustomId !== values.customer_custom_id.trim()) {
          form.setValue("customer_custom_id", newCustomId, {
            shouldValidate: true,
          });
        }

        const taken = await isCompanyNameTaken(values.company_name.trim());
        if (taken) {
          toast({
            variant: "destructive",
            title: "Duplicate company",
            description:
              "A customer with this company name already exists.",
          });
          return;
        }

        const { data: inserted, error } = await supabase
          .from("customers")
          .insert({
            ...rowCommon,
            customer_custom_id: newCustomId,
          })
          .select("id")
          .single();

        if (error) throw error;
        if (!inserted?.id) {
          throw new Error("Insert did not return a row id.");
        }

        await revalidateCustomerViews(inserted.id);
        form.reset({
          ...defaultEmptyValues(),
          customer_custom_id: generateCustomerCustomId(),
        });
        toast({
          title: "Customer created",
          description: values.company_name.trim(),
        });
        router.refresh();
      } else if (initialCustomer) {
        const trimmedName = values.company_name.trim();
        if (trimmedName !== initialCustomer.company_name) {
          const taken = await isCompanyNameTaken(
            trimmedName,
            initialCustomer.id
          );
          if (taken) {
            toast({
              variant: "destructive",
              title: "Duplicate company",
              description: "Another customer already uses this company name.",
            });
            return;
          }
        }

        const trimmedCustomId = values.customer_custom_id.trim();
        const updatePayload: Record<string, unknown> = {
          ...rowCommon,
          company_name: trimmedName,
          updated_at: new Date().toISOString(),
        };
        if (trimmedCustomId !== "") {
          updatePayload.customer_custom_id = trimmedCustomId;
        }

        const baseline = occBaselineRef.current;
        if (!baseline) {
          toast({
            variant: "destructive",
            title: "Cannot save",
            description: "Edit session is not ready. Refresh the page.",
          });
          return;
        }

        const { data: occRow, error: occErr } = await supabase
          .from("customers")
          .select("updated_at")
          .eq("id", initialCustomer.id)
          .single();

        if (occErr) throw occErr;
        if (
          occRow &&
          isOccConflict(occRow.updated_at as string, baseline)
        ) {
          toast({
            variant: "destructive",
            title: "Conflict detected",
            description:
              "This customer was updated elsewhere. Refresh the page, then try again.",
          });
          return;
        }

        const { data: savedRow, error } = await supabase
          .from("customers")
          .update(updatePayload)
          .eq("id", initialCustomer.id)
          .select("*")
          .single();

        if (error) throw error;
        const saved = savedRow as Customer;
        occBaselineRef.current = saved.updated_at;
        form.reset(mapCustomerToForm(saved));
        await revalidateCustomerViews(initialCustomer.id);
        toast({ title: "Changes saved successfully." });
        router.refresh();
      }
    } catch (e) {
      console.error(e);
      const { title, description } = classifyCustomerSaveError(e);
      toast({
        variant: "destructive",
        title,
        description,
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleCheckDuplicate() {
    const raw = form.watch("company_name");
    const trimmed = raw.trim();
    if (!trimmed) {
      toast({
        variant: "destructive",
        title: "Please enter a company name.",
      });
      return;
    }

    setCheckingCompanyName(true);
    try {
      const excludeId =
        mode === "edit" && initialCustomer ? initialCustomer.id : undefined;
      const taken = await isCompanyNameTaken(trimmed, excludeId);
      if (taken) {
        toast({
          variant: "destructive",
          title: `Duplicate Found: ${trimmed} is already registered.`,
        });
      } else {
        toast({
          title: "Name Available: You can use this company name.",
        });
      }
    } catch (e) {
      console.error(e);
      const { title, description } = classifyCustomerSaveError(e);
      toast({
        variant: "destructive",
        title,
        description,
      });
    } finally {
      setCheckingCompanyName(false);
    }
  }

  const requiredMark = (
    <span className="ml-0.5 text-destructive" aria-hidden>
      *
    </span>
  );

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="outline" size="sm" className="w-fit gap-2" asChild>
          <Link
            href="/customers"
            onClick={(e) => {
              if (!confirmDiscardUnsaved()) e.preventDefault();
            }}
          >
            <ArrowLeft className="size-4" />
            Back to list
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {mode === "create" ? "New customer" : "Edit customer"}
          </h1>
          {status === "Blacklisted" && (
            <Badge variant="destructive" className="uppercase tracking-wide">
              Blacklisted
            </Badge>
          )}
        </div>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit, () => {
            toast({
              variant: "destructive",
              title: "Please fill in all mandatory fields.",
            });
          })}
          className="space-y-8 pb-24"
        >
          <div className="grid gap-6 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="customer_custom_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground">
                    Customer ID
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      readOnly={mode === "create"}
                      disabled={mode === "create"}
                      className={
                        mode === "create"
                          ? "bg-muted/50 font-mono"
                          : "font-mono"
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    {mode === "create"
                      ? "Auto-generated reference; read-only while creating."
                      : "Optional human-facing reference (unique when set)."}
                  </FormDescription>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="company_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Company name
                    {requiredMark}
                  </FormLabel>
                  <CompanyNameFieldControl
                    field={field}
                    disabled={saving}
                    checking={checkingCompanyName}
                    onCheckAvailability={handleCheckDuplicate}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={2}
                      className="resize-y"
                      placeholder="Street, city, region…"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="customer_grade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer grade</FormLabel>
                  <Select
                    key={`customer_grade-${serverSnapshotKey}`}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Grade" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CUSTOMER_GRADE_OPTIONS.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
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
              name="assigned_sales"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Assigned sales
                    {requiredMark}
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Sales owner or rep" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Status
                    {requiredMark}
                  </FormLabel>
                  <Select
                    key={`status-${serverSnapshotKey}`}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CUSTOMER_STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
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
              name="contact_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact phone</FormLabel>
                  <FormControl>
                    <Input {...field} type="tel" autoComplete="tel" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="credit_limit"
              render={({ field }) => {
                const intVal = Number.isFinite(field.value)
                  ? Math.max(0, Math.trunc(field.value))
                  : 0;
                return (
                  <FormItem>
                    <FormLabel>Credit limit</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="numeric"
                        readOnly={creditReadOnly}
                        className={
                          creditReadOnly ? "bg-muted/50" : "tabular-nums"
                        }
                        value={String(intVal)}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, "");
                          if (digits === "") {
                            field.onChange(0);
                            return;
                          }
                          const n = Number.parseInt(digits, 10);
                          field.onChange(
                            Number.isFinite(n)
                              ? Math.max(0, Math.trunc(n))
                              : 0
                          );
                        }}
                      />
                    </FormControl>
                    {status === "Prepayment" && (
                      <FormDescription>
                        Prepayment accounts have a credit limit of 0.
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            <FormField
              control={form.control}
              name="credit_term_days"
              render={({ field }) => (
                  <FormItem>
                  <FormLabel>Credit term (days)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      value={
                        Number.isFinite(field.value) ? field.value : 3
                      }
                      onChange={(e) => {
                        const raw = e.target.value;
                        const n =
                          raw === "" ? 0 : Number.parseInt(raw, 10);
                        field.onChange(Number.isFinite(n) ? n : 0);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator />

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              One email per line or comma-separated. Empty finance / ops fall
              back to purchasing.
            </p>
            <FormField
              control={form.control}
              name="purchasing_emails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Purchasing emails (采购邮箱)
                    {requiredMark}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={4}
                      className="resize-y font-mono text-sm"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-6 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="finance_emails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Finance emails</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} className="resize-y" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ops_emails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Operations emails</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} className="resize-y" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Notes <span className="font-normal text-muted-foreground">(备注)</span>
                </FormLabel>
                <FormControl>
                  <Textarea {...field} rows={4} className="resize-y" />
                </FormControl>
              </FormItem>
            )}
          />

          <Separator />

          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Depot information</h2>
              <div className="flex items-center gap-1 text-muted-foreground">
                <HelpCircle className="size-4" />
                <span className="text-xs">Scroll horizontally to view all columns</span>
              </div>
            </div>
            <FormField
              control={form.control}
              name="depots"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <DepotDataTable
                      value={field.value}
                      readOnly={false}
                      onChange={field.onChange}
                      disabled={saving}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Stored as JSON under{" "}
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                      depot_info.depots
                    </code>{" "}
                    (JSONB).
                  </FormDescription>
                  <FormMessage />
                  <DepotArrayFieldMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6">
            <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!confirmDiscardUnsaved()) return;
                  router.push("/customers");
                }}
                disabled={saving}
              >
                Back to list
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Saving…
                  </>
                ) : mode === "create" ? (
                  "Create customer"
                ) : (
                  "Save changes"
                )}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
