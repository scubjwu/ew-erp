"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";

import {
  createFinancialExchangeRate,
  updateFinancialExchangeRate,
} from "@/app/basic-info/financial-exchange-rates/actions";
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
import {
  FINANCIAL_EXCHANGE_RATE_CURRENCY_OPTIONS,
  type FinancialExchangeRateCurrency,
  type FinancialExchangeRateRow,
} from "@/types/dispatch-finance";

const schema = z
  .object({
    rateDate: z.string().trim().min(1, "Rate date is required"),
    fromCurrency: z.string().trim().min(1, "From currency is required"),
    toCurrency: z.string().trim().min(1, "To currency is required"),
    exchangeRate: z.coerce.number().gt(0, "Exchange rate must be greater than 0"),
    isActive: z.boolean(),
    remark: z.string().trim(),
  })
  .superRefine((value, ctx) => {
    if (value.fromCurrency === value.toCurrency) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["toCurrency"],
        message: "From and To currency must be different",
      });
    }
  });

type FormValues = z.infer<typeof schema>;

const DEFAULT_VALUES: FormValues = {
  rateDate: new Date().toISOString().slice(0, 10),
  fromCurrency: "USD",
  toCurrency: "CNY",
  exchangeRate: 1,
  isActive: true,
  remark: "",
};

function toFormValues(row: FinancialExchangeRateRow | null): FormValues {
  if (!row) return DEFAULT_VALUES;
  return {
    rateDate: row.rateDate,
    fromCurrency: row.fromCurrency,
    toCurrency: row.toCurrency,
    exchangeRate: row.exchangeRate,
    isActive: row.isActive,
    remark: row.remark ?? "",
  };
}

type Props = {
  open: boolean;
  mode: "create" | "edit";
  row: FinancialExchangeRateRow | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void> | void;
};

export function FinancialExchangeRateFormDialog({
  open,
  mode,
  row,
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
  }, [form, open, row]);

  async function onSubmit(values: FormValues) {
    setSaving(true);
    try {
      const payload = {
        rateDate: values.rateDate,
        fromCurrency: values.fromCurrency as FinancialExchangeRateCurrency,
        toCurrency: values.toCurrency as FinancialExchangeRateCurrency,
        exchangeRate: values.exchangeRate,
        isActive: values.isActive,
        remark: values.remark || null,
      };

      if (mode === "create") {
        await createFinancialExchangeRate(payload);
      } else {
        if (!row) throw new Error("Missing financial exchange rate record");
        await updateFinancialExchangeRate(row.id, payload);
      }

      await onSaved();
      onOpenChange(false);
      toast({
        title:
          mode === "create"
            ? "Financial exchange rate created"
            : "Financial exchange rate updated",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title:
          mode === "create"
            ? "Could not create financial exchange rate"
            : "Could not update financial exchange rate",
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
          <DialogTitle>
            {mode === "create" ? "New Financial Exchange Rate" : "Edit Financial Exchange Rate"}
          </DialogTitle>
          <DialogDescription>
            Maintain one effective-from financial exchange rate per currency direction. Each rate
            stays active until the next update starts.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="rateDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start From</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="exchangeRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Exchange Rate</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" min="0" step="0.00000001" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fromCurrency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From Currency</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FINANCIAL_EXCHANGE_RATE_CURRENCY_OPTIONS.map((currency) => (
                        <SelectItem key={currency} value={currency}>
                          {currency}
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
              name="toCurrency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To Currency</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FINANCIAL_EXCHANGE_RATE_CURRENCY_OPTIONS.map((currency) => (
                        <SelectItem key={currency} value={currency}>
                          {currency}
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
              name="isActive"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === "ACTIVE")}
                    value={field.value ? "ACTIVE" : "INACTIVE"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
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
                {mode === "create" ? "Create" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
