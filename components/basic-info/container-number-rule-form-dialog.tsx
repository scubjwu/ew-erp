"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";

import { revalidateContainerNumberRulePages } from "@/app/basic-info/container-number-rules/actions";
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
  ContainerNumberRuleRow,
  ContainerNumberRuleSizeOption,
} from "@/types/container-number-rule";

const schema = z
  .object({
    sizeCodeId: z.string().trim().min(1, "Size is required"),
    prefix: z.string().trim().min(1, "Prefix is required"),
    serialLength: z.coerce.number().int().min(1, "Serial length must be at least 1"),
    startSerial: z.coerce.number().int().min(0, "Start serial must be 0 or greater"),
    endSerial: z.coerce.number().int().min(0, "End serial must be 0 or greater"),
    currentSerial: z.coerce.number().int().min(0, "Current serial must be 0 or greater"),
    status: z.enum(["ACTIVE", "INACTIVE"]),
    remark: z.string().trim().optional(),
  })
  .refine((value) => value.endSerial >= value.startSerial, {
    path: ["endSerial"],
    message: "End serial must be greater than or equal to start serial",
  })
  .refine(
    (value) =>
      value.currentSerial >= value.startSerial && value.currentSerial <= value.endSerial,
    {
      path: ["currentSerial"],
      message: "Current serial must be within the serial range",
    }
  );

type FormValues = z.infer<typeof schema>;

const DEFAULT_VALUES: FormValues = {
  sizeCodeId: "",
  prefix: "",
  serialLength: 5,
  startSerial: 0,
  endSerial: 99999,
  currentSerial: 0,
  status: "ACTIVE",
  remark: "",
};

function padSerial(serial: number, serialLength: number) {
  return String(Math.max(0, serial)).padStart(serialLength, "0");
}

function toFormValues(row: ContainerNumberRuleRow | null): FormValues {
  if (!row) return DEFAULT_VALUES;
  return {
    sizeCodeId: row.sizeCodeId,
    prefix: row.prefix,
    serialLength: row.serialLength,
    startSerial: row.startSerial,
    endSerial: row.endSerial,
    currentSerial: row.currentSerial,
    status: row.status,
    remark: row.remark ?? "",
  };
}

type Props = {
  open: boolean;
  mode: "create" | "edit";
  row: ContainerNumberRuleRow | null;
  sizeOptions: ContainerNumberRuleSizeOption[];
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void> | void;
};

export function ContainerNumberRuleFormDialog({
  open,
  mode,
  row,
  sizeOptions,
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

  const sizeCodeId = form.watch("sizeCodeId");
  const prefix = form.watch("prefix");
  const serialLength = form.watch("serialLength");
  const currentSerial = form.watch("currentSerial");
  const endSerial = form.watch("endSerial");

  const nextSerial = Math.min(endSerial, currentSerial + 1);
  const exampleValue = `${prefix || "PREFIX"}${padSerial(nextSerial, serialLength || 1)}`;
  const remainingValue = Math.max(0, endSerial - currentSerial);
  const selectedSize = useMemo(
    () => sizeOptions.find((option) => option.id === sizeCodeId) ?? null,
    [sizeCodeId, sizeOptions]
  );

  async function onSubmit(values: FormValues) {
    setSaving(true);
    try {
      const supabase = createBrowserClient();
      const payload = {
        container_size_code_id: values.sizeCodeId,
        prefix: values.prefix,
        serial_length: values.serialLength,
        start_serial: values.startSerial,
        end_serial: values.endSerial,
        current_serial: values.currentSerial,
        status: values.status,
        example_container_number: `${values.prefix}${padSerial(
          Math.min(values.endSerial, values.currentSerial + 1),
          values.serialLength
        )}`,
        remark: values.remark || null,
      };

      if (mode === "create") {
        const { error } = await supabase.from("container_number_rules").insert(payload);
        if (error) throw error;
      } else {
        if (!row) throw new Error("Missing container number rule record");
        const { error } = await supabase
          .from("container_number_rules")
          .update(payload)
          .eq("id", row.id);
        if (error) throw error;
      }

      await revalidateContainerNumberRulePages();
      await onSaved();
      onOpenChange(false);
      toast({
        title: mode === "create" ? "Rule created" : "Rule updated",
        description: values.prefix,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: mode === "create" ? "Could not create rule" : "Could not update rule",
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
            {mode === "create" ? "New Container Number Rule" : "Edit Container Number Rule"}
          </DialogTitle>
          <DialogDescription>
            Maintain prefix, serial range, current serial, and the generated example number.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="sizeCodeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Size</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={mode === "edit"}
                  >
                    <FormControl>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sizeOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel>Example</FormLabel>
              <Input value={exampleValue} readOnly className="bg-muted/50 text-muted-foreground" />
            </FormItem>

            <FormField
              control={form.control}
              name="prefix"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prefix</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter prefix" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel>Selected Size</FormLabel>
              <Input
                value={selectedSize ? `${selectedSize.code} - ${selectedSize.name}` : "-"}
                readOnly
                className="bg-muted/50 text-muted-foreground"
              />
            </FormItem>

            <FormField
              control={form.control}
              name="serialLength"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Serial Length</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} step={1} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="startSerial"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Serial</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} step={1} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endSerial"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Serial</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} step={1} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currentSerial"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Serial</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} step={1} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel>Remaining Available</FormLabel>
              <Input
                value={String(remainingValue)}
                readOnly
                className="bg-muted/50 text-muted-foreground"
              />
            </FormItem>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-10">
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
                {mode === "create" ? "Create Rule" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
