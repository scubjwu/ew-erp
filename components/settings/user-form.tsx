"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, Pencil } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";

import { revalidateUserManagementViews } from "@/app/settings/users/actions";
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
import { userCodePrefixForName } from "@/lib/users/generate-user-code";
import {
  USER_STATUS_OPTIONS,
  type SystemUser,
  type UserStatus,
} from "@/types/system-user";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const lockedFieldClassName =
  "bg-muted/50 text-muted-foreground cursor-not-allowed hover:cursor-not-allowed";

const userFormSchema = z.object({
  user_code: z
    .string()
    .trim()
    .regex(/^[A-Z]{2}[0-9]{4}$/, "User code must be 2 uppercase letters and 4 digits"),
  full_name: z.string().trim().min(1, "Full name is required"),
  email: z
    .string()
    .trim()
    .refine((value) => value === "" || emailPattern.test(value), "Enter a valid email address"),
  role: z.string().trim().min(1, "Role is required"),
  status: z.enum(USER_STATUS_OPTIONS as [UserStatus, ...UserStatus[]]),
  phone: z.string().trim(),
  department: z.string().trim(),
  job_title: z.string().trim(),
  remarks: z.string().trim(),
});

type UserFormValues = z.infer<typeof userFormSchema>;
type UserTabKey = "basic" | "access" | "audit";

const tabs: Array<[UserTabKey, string]> = [
  ["basic", "Basic Info"],
  ["access", "Access Control"],
  ["audit", "Audit"],
];

function mapUserToForm(user: SystemUser): UserFormValues {
  return {
    user_code: user.user_code,
    full_name: user.full_name ?? "",
    email: user.email ?? "",
    role: user.role ?? "",
    status: user.status,
    phone: user.phone ?? "",
    department: user.department ?? "",
    job_title: user.job_title ?? "",
    remarks: user.remarks ?? "",
  };
}

function defaultValues(role = "Sales"): UserFormValues {
  return {
    user_code: "",
    full_name: "",
    email: "",
    role,
    status: "Active",
    phone: "",
    department: "",
    job_title: "",
    remarks: "",
  };
}

async function isUserCodeTaken(code: string, excludeId?: string) {
  const supabase = createBrowserClient();
  let query = supabase.from("users").select("id").eq("user_code", code.trim());
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query.limit(1);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

async function isFullNameTaken(name: string, excludeId?: string) {
  const supabase = createBrowserClient();
  let query = supabase.from("users").select("id").eq("full_name", name.trim());
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query.limit(1);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

async function isEmailTaken(email: string, excludeId?: string) {
  const normalized = email.trim();
  if (!normalized) return false;
  const supabase = createBrowserClient();
  let query = supabase.from("users").select("id").eq("email", normalized);
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query.limit(1);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

async function generateUniqueUserCode(fullName: string) {
  const prefix = userCodePrefixForName(fullName);
  const supabase = createBrowserClient();
  const { data, error } = await supabase
    .from("users")
    .select("user_code")
    .like("user_code", `${prefix}%`)
    .order("user_code", { ascending: false })
    .limit(100);

  if (error) throw error;

  const maxSequence = (data ?? []).reduce((highest, row) => {
    const value = Number.parseInt((row.user_code ?? "").slice(-4), 10);
    if (Number.isNaN(value)) return highest;
    return Math.max(highest, value);
  }, 0);

  return `${prefix}${String(maxSequence + 1).padStart(4, "0")}`;
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

function formatAuditValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function UserForm({
  mode,
  initialUser,
  roleOptions,
}: {
  mode: "create" | "edit" | "view";
  initialUser?: SystemUser | null;
  roleOptions: string[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<UserTabKey>("basic");

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema) as Resolver<UserFormValues>,
    defaultValues:
      mode === "create"
        ? defaultValues(roleOptions[0] ?? "Sales")
        : initialUser
          ? mapUserToForm(initialUser)
          : defaultValues(roleOptions[0] ?? "Sales"),
  });

  const fullName = form.watch("full_name");
  const readOnly = mode === "view";

  useEffect(() => {
    if (mode === "create") {
      form.reset(defaultValues(roleOptions[0] ?? "Sales"));
    } else if (initialUser) {
      form.reset(mapUserToForm(initialUser));
    }
    setTab("basic");
  }, [form, initialUser, mode, roleOptions]);

  useEffect(() => {
    if (mode !== "create") return;
    const trimmed = fullName.trim();
    if (!trimmed) {
      form.setValue("user_code", "", { shouldValidate: false });
      return;
    }

    let active = true;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const nextCode = await generateUniqueUserCode(trimmed);
          if (!active) return;
          form.setValue("user_code", nextCode, { shouldValidate: true });
        } catch (error) {
          if (!active) return;
          toast({
            variant: "destructive",
            title: "Could not generate user code",
            description: getErrorMessage(error),
          });
        }
      })();
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [form, fullName, mode]);

  const sortedRoleOptions = useMemo(
    () => Array.from(new Set(roleOptions.filter(Boolean))),
    [roleOptions]
  );

  async function onSubmit(values: UserFormValues) {
    setSaving(true);
    try {
      if (await isUserCodeTaken(values.user_code, initialUser?.id)) {
        form.setError("user_code", {
          type: "manual",
          message: "User code already exists",
        });
        setSaving(false);
        return;
      }

      if (await isFullNameTaken(values.full_name, initialUser?.id)) {
        form.setError("full_name", {
          type: "manual",
          message: "Full name already exists",
        });
        setSaving(false);
        return;
      }

      if (await isEmailTaken(values.email, initialUser?.id)) {
        form.setError("email", {
          type: "manual",
          message: "Email already exists",
        });
        setSaving(false);
        return;
      }

      const payload = {
        user_code: values.user_code,
        full_name: values.full_name,
        email: values.email || null,
        role: values.role,
        status: values.status,
        phone: values.phone || null,
        department: values.department || null,
        job_title: values.job_title || null,
        remarks: values.remarks || null,
      };

      const supabase = createBrowserClient();
      let userId = initialUser?.id ?? null;

      if (mode === "create") {
        const { data, error } = await supabase
          .from("users")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        userId = data.id;
      } else {
        if (!userId) throw new Error("Missing user record");
        const { error } = await supabase.from("users").update(payload).eq("id", userId);
        if (error) throw error;
      }

      if (!userId) throw new Error("Missing user id");

      await revalidateUserManagementViews(userId);
      toast({
        title: mode === "create" ? "User created" : "User updated",
        description: values.user_code,
      });
      router.push(`/settings/users/${userId}`);
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: mode === "create" ? "Could not create user" : "Could not update user",
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
                href="/settings/users"
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                <ArrowLeft className="size-4" />
                Back to User Management
              </Link>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {mode === "create"
                ? "New User"
                : mode === "edit"
                  ? "Edit User"
                  : "User Detail"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Maintain user master data, role assignment, operational status, and audit timestamps.
            </p>
          </div>
          {mode === "view" && initialUser ? (
            <Button asChild>
              <Link href={`/settings/users/${initialUser.id}/edit`}>
                <Pencil className="size-4" />
                Edit User
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
                    name="user_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <RequiredLabel>User Code</RequiredLabel>
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
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {USER_STATUS_OPTIONS.map((option) => (
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
                    name="full_name"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>
                          <RequiredLabel>Full Name</RequiredLabel>
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
                    name="email"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
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
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly={readOnly} disabled={readOnly} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly={readOnly} disabled={readOnly} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="job_title"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Job Title</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly={readOnly} disabled={readOnly} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="remarks"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2 xl:col-span-4">
                        <FormLabel>Remarks</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            readOnly={readOnly}
                            disabled={readOnly}
                            className="min-h-[120px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ) : null}

              {tab === "access" ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <RequiredLabel>Role</RequiredLabel>
                        </FormLabel>
                        {readOnly ? (
                          <ReadOnlyInput value={field.value} />
                        ) : (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {sortedRoleOptions.map((option) => (
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
                  <div className="md:col-span-1 xl:col-span-3" />
                </div>
              ) : null}

              {tab === "audit" ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <div className="space-y-1.5">
                    <div className="text-sm font-medium">Created At</div>
                    <ReadOnlyInput value={formatAuditValue(initialUser?.created_at)} />
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-sm font-medium">Updated At</div>
                    <ReadOnlyInput value={formatAuditValue(initialUser?.updated_at)} />
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-sm font-medium">Last Login At</div>
                    <ReadOnlyInput value={formatAuditValue(initialUser?.last_login_at)} />
                  </div>
                </div>
              ) : null}

              {mode !== "view" ? (
                <div className="flex justify-end gap-2 border-t border-border pt-4">
                  <Button type="button" variant="outline" asChild>
                    <Link href={initialUser ? `/settings/users/${initialUser.id}` : "/settings/users"}>
                      Cancel
                    </Link>
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                    {mode === "create" ? "Create User" : "Save Changes"}
                  </Button>
                </div>
              ) : null}
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
