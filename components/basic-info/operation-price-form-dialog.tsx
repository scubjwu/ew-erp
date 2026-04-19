"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";

import { revalidateOperationPricePages } from "@/app/basic-info/operation-prices/actions";
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
import type {
  OperationPriceOption,
  OperationPriceRow,
} from "@/types/operation-price-config";

const schema = z.object({
  container_size_code_id: z.string().trim().min(1, "Size is required"),
  container_condition_code_id: z.string().trim().min(1, "Condition is required"),
  addon_price: z.coerce.number().min(0, "Price must be 0 or greater"),
  currency: z.string().trim().min(1, "Currency is required"),
  effective_from: z.string().trim().min(1, "Effective from is required"),
  effective_to: z.string().trim(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  remark: z.string().trim(),
});

type FormValues = z.infer<typeof schema>;

const DEFAULT_VALUES: FormValues = {
  container_size_code_id: "",
  container_condition_code_id: "",
  addon_price: 0,
  currency: "USD",
  effective_from: "",
  effective_to: "",
  status: "ACTIVE",
  remark: "",
};

function toFormValues(row: OperationPriceRow | null): FormValues {
  if (!row) return DEFAULT_VALUES;
  return {
    container_size_code_id: row.container_size_code_id,
    container_condition_code_id: row.container_condition_code_id,
    addon_price: Number(row.addon_price ?? 0),
    currency: row.currency ?? "USD",
    effective_from: row.effective_from ?? "",
    effective_to: row.effective_to ?? "",
    status: row.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    remark: row.remark ?? "",
  };
}

type Props = {
  open: boolean;
  mode: "create" | "edit";
  row: OperationPriceRow | null;
  sizeOptions: OperationPriceOption[];
  conditionOptions: OperationPriceOption[];
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void> | void;
};

export function OperationPriceFormDialog({
  open,
  mode,
  row,
  sizeOptions,
  conditionOptions,
  onOpenChange,
  onSaved,
}: Props) {
  const [saving, setSaving] = useState(false);

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
      const payload = {
        container_size_code_id: values.container_size_code_id,
        container_condition_code_id: values.container_condition_code_id,
        addon_price: values.addon_price,
        currency: values.currency,
        effective_from: values.effective_from,
        effective_to: values.effective_to || null,
        status: values.status,
        remark: values.remark || null,
      };

      if (mode === "create") {
        const { error } = await supabase.from("operation_price_configs").insert(payload);
        if (error) throw error;
      } else {
        if (!row) throw new Error("Missing operation price record");
        const { error } = await supabase
          .from("operation_price_configs")
          .update(payload)
          .eq("id", row.id);
        if (error) throw error;
      }

      await revalidateOperationPricePages();
      await onSaved();
      onOpenChange(false);
      toast({
        title:
          mode === "create"
            ? "Operation price created"
            : "Operation price updated",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title:
          mode === "create"
            ? "Could not create operation price"
            : "Could not update operation price",
        description: getErrorMessage(error),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "New Operation Price" : "Edit Operation Price"}
          </DialogTitle>
          <DialogDescription>
            Maintain size, condition, additional price, currency, date range, and status.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="container_size_code_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Size</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sizeOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
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
              name="container_condition_code_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Condition</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {conditionOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
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
              name="addon_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Price</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" min="0" step="0.01" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="USD" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="effective_from"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Effective From</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="effective_to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Effective To</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" />
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Enabled</SelectItem>
                      <SelectItem value="INACTIVE">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="remark"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Remark</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={4} placeholder="Enter remark" />
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
                {mode === "create" ? "Create Price" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
