"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";

import { revalidateFinancialCodePages } from "@/app/basic-info/financial-codes/actions";
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
import type { FinancialCodeCategory, FinancialCodeRow } from "@/types/financial-code";

const schema = z.object({
  code: z.string().trim().min(1, "Code is required"),
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().trim(),
  enabled: z.enum(["ENABLED", "DISABLED"]),
});

type FormValues = z.infer<typeof schema>;

const DEFAULT_VALUES: FormValues = {
  code: "",
  name: "",
  description: "",
  enabled: "ENABLED",
};

function tableForCategory(category: FinancialCodeCategory) {
  return category === "INCOME" ? "revenue_codes" : "cost_codes";
}

function labelsForCategory(category: FinancialCodeCategory) {
  return category === "INCOME"
    ? {
        title: "Revenue Code",
        code: "Revenue Code",
        name: "Revenue Name",
      }
    : {
        title: "Expense Code",
        code: "Expense Code",
        name: "Expense Name",
      };
}

function toFormValues(row: FinancialCodeRow | null): FormValues {
  if (!row) return DEFAULT_VALUES;
  return {
    code: row.code,
    name: row.name,
    description: row.description ?? "",
    enabled: row.status === "ACTIVE" ? "ENABLED" : "DISABLED",
  };
}

type Props = {
  open: boolean;
  mode: "create" | "edit";
  category: FinancialCodeCategory;
  row: FinancialCodeRow | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void> | void;
};

export function FinancialCodeFormDialog({
  open,
  mode,
  category,
  row,
  onOpenChange,
  onSaved,
}: Props) {
  const [saving, setSaving] = useState(false);
  const labels = useMemo(() => labelsForCategory(category), [category]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    form.reset(toFormValues(row));
  }, [form, row, open]);

  async function onSubmit(values: FormValues) {
    setSaving(true);
    try {
      const supabase = createBrowserClient();
      const payload =
        category === "INCOME"
          ? {
              revenue_code: values.code,
              revenue_name: values.name,
              description: values.description || null,
              status: values.enabled === "ENABLED" ? "ACTIVE" : "INACTIVE",
            }
          : {
              cost_code: values.code,
              cost_name: values.name,
              description: values.description || null,
              status: values.enabled === "ENABLED" ? "ACTIVE" : "INACTIVE",
            };

      if (mode === "create") {
        const { error } = await supabase.from(tableForCategory(category)).insert(payload);
        if (error) throw error;
      } else {
        if (!row) throw new Error("Missing code record");
        const { error } = await supabase.from(tableForCategory(category)).update(payload).eq("id", row.id);
        if (error) throw error;
      }

      await revalidateFinancialCodePages();
      await onSaved();
      onOpenChange(false);
      toast({
        title: mode === "create" ? `${labels.title} created` : `${labels.title} updated`,
        description: values.code,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: mode === "create" ? `Could not create ${labels.title.toLowerCase()}` : `Could not update ${labels.title.toLowerCase()}`,
        description: getErrorMessage(error),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? `New ${labels.title}` : `Edit ${labels.title}`}</DialogTitle>
          <DialogDescription>
            Maintain code, description, and enabled status.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{labels.code}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={`Enter ${labels.code.toLowerCase()}`} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{labels.name}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={`Enter ${labels.name.toLowerCase()}`} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={4} placeholder="Enter description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Enabled</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select enabled status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ENABLED">Enabled</SelectItem>
                      <SelectItem value="DISABLED">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="md:col-span-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                {mode === "create" ? "Create Code" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
