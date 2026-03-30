"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { revalidateCompanyProfilesPage } from "@/app/basic-info/companies/actions";
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
import { Button } from "@/components/ui/button";
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
import type { CompanyProfile } from "@/types/company-profile";

const companyProfileFormSchema = z.object({
  company_name_cn: z
    .string()
    .trim()
    .min(1, "Company name is required"),
  company_name_en: z.string().trim(),
  address_cn: z.string().trim(),
  address_en: z.string().trim(),
  phone: z.string().trim(),
  fax: z.string().trim(),
  email: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || z.email().safeParse(value).success,
      "Invalid email address"
    ),
  postal_code: z.string().trim(),
  record_date: z.string().trim(),
  business_code: z.string().trim(),
  system_code: z.string().trim(),
  group_code: z.string().trim(),
  data_code: z.string().trim(),
  certificate_code: z.string().trim(),
  invoice_code: z.string().trim(),
  version_info: z.string().trim(),
  location_code: z.string().trim(),
  remark: z.string().trim(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export type CompanyProfileFormValues = z.infer<
  typeof companyProfileFormSchema
>;

type CompanyProfileFormDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  company: CompanyProfile | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void> | void;
};

const DEFAULT_VALUES: CompanyProfileFormValues = {
  company_name_cn: "",
  company_name_en: "",
  address_cn: "",
  address_en: "",
  phone: "",
  fax: "",
  email: "",
  postal_code: "",
  record_date: "",
  business_code: "",
  system_code: "",
  group_code: "",
  data_code: "",
  certificate_code: "",
  invoice_code: "",
  version_info: "",
  location_code: "",
  remark: "",
  status: "ACTIVE",
};

function toFormValues(company: CompanyProfile | null): CompanyProfileFormValues {
  if (!company) return DEFAULT_VALUES;
  return {
    company_name_cn: company.company_name_cn ?? "",
    company_name_en: company.company_name_en ?? "",
    address_cn: company.address_cn ?? "",
    address_en: company.address_en ?? "",
    phone: company.phone ?? "",
    fax: company.fax ?? "",
    email: company.email ?? "",
    postal_code: company.postal_code ?? "",
    record_date: company.record_date ?? "",
    business_code: company.business_code ?? "",
    system_code: company.system_code ?? "",
    group_code: company.group_code ?? "",
    data_code: company.data_code ?? "",
    certificate_code: company.certificate_code ?? "",
    invoice_code: company.invoice_code ?? "",
    version_info: company.version_info ?? "",
    location_code: company.location_code ?? "",
    remark: company.remark ?? "",
    status: company.status,
  };
}

export function CompanyProfileFormDialog({
  open,
  mode,
  company,
  onOpenChange,
  onSaved,
}: CompanyProfileFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const form = useForm<CompanyProfileFormValues>({
    resolver: zodResolver(companyProfileFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    form.reset(toFormValues(company));
  }, [company, form, mode, open]);

  async function onSubmit(values: CompanyProfileFormValues) {
    setSaving(true);
    try {
      const supabase = createBrowserClient();
      const payload = {
        ...values,
        company_name_en: values.company_name_en || null,
        address_cn: values.address_cn || null,
        address_en: values.address_en || null,
        phone: values.phone || null,
        fax: values.fax || null,
        email: values.email || null,
        postal_code: values.postal_code || null,
        record_date: values.record_date || null,
        business_code: values.business_code || null,
        system_code: values.system_code || null,
        group_code: values.group_code || null,
        data_code: values.data_code || null,
        certificate_code: values.certificate_code || null,
        invoice_code: values.invoice_code || null,
        version_info: values.version_info || null,
        location_code: values.location_code || null,
        remark: values.remark || null,
      };

      if (mode === "create") {
        const { error } = await supabase.from("company_profiles").insert(payload);
        if (error) throw error;
      } else {
        if (!company) throw new Error("Missing company record");
        const { error } = await supabase
          .from("company_profiles")
          .update(payload)
          .eq("id", company.id);
        if (error) throw error;
      }

      await revalidateCompanyProfilesPage();
      await onSaved();
      onOpenChange(false);
      toast({
        title: mode === "create" ? "Company created" : "Company updated",
        description: values.company_name_cn,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: mode === "create" ? "Could not create company" : "Could not update company",
        description: getErrorMessage(error),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "New Company" : "Edit Company"}
          </DialogTitle>
          <DialogDescription>
            Maintain company master data in English UI while keeping both Chinese
            and English profile fields.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <FormField
              control={form.control}
              name="company_name_cn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter company name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="company_name_en"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>English Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter English name" />
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
                    <Input {...field} placeholder="Enter phone number" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address_cn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter address" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address_en"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>English Address</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter English address" />
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
                    <Input {...field} placeholder="Enter fax number" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="postal_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Postal Code</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter postal code" />
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
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="record_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter location" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="business_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Number</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter business number" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="data_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data Number</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter data number" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="system_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>System Number</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter system number" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="certificate_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Certificate Number</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter certificate number" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="group_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group Number</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter group number" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="invoice_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invoice Number</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter invoice number" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="version_info"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Version Info</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter version information" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="remark"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remark</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} placeholder="Enter remark" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="md:col-span-2">
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
                {mode === "create" ? "Create Company" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
