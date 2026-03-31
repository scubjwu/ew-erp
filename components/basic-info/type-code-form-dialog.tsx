"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { revalidateTypeCodePages } from "@/app/basic-info/type-codes/actions";
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
import type { TypeCodeRow } from "@/types/type-code";

const schema = z.object({
  code: z.string().trim().min(1, "Type code is required"),
  typeDescription: z.string().trim().min(1, "Type description is required"),
  remark: z.string().trim(),
  enabled: z.enum(["ENABLED", "DISABLED"]),
});

type FormValues = z.infer<typeof schema>;

const DEFAULT_VALUES: FormValues = {
  code: "",
  typeDescription: "",
  remark: "",
  enabled: "ENABLED",
};

function toFormValues(row: TypeCodeRow | null): FormValues {
  if (!row) return DEFAULT_VALUES;
  return {
    code: row.code,
    typeDescription: row.typeDescription ?? "",
    remark: row.remark ?? "",
    enabled: row.status === "ACTIVE" ? "ENABLED" : "DISABLED",
  };
}

type Props = {
  open: boolean;
  mode: "create" | "edit";
  row: TypeCodeRow | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void> | void;
};

export function TypeCodeFormDialog({
  open,
  mode,
  row,
  onOpenChange,
  onSaved,
}: Props) {
  const [saving, setSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
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
        type_code: values.code,
        type_description: values.typeDescription,
        remark: values.remark || null,
        status: values.enabled === "ENABLED" ? "ACTIVE" : "INACTIVE",
      };

      if (mode === "create") {
        const { error } = await supabase
          .from("container_type_codes")
          .insert(payload);
        if (error) throw error;
      } else {
        if (!row) throw new Error("Missing type code record");
        const { error } = await supabase
          .from("container_type_codes")
          .update(payload)
          .eq("id", row.id);
        if (error) throw error;
      }

      await revalidateTypeCodePages();
      await onSaved();
      onOpenChange(false);
      toast({
        title: mode === "create" ? "Type code created" : "Type code updated",
        description: values.code,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: mode === "create" ? "Could not create type code" : "Could not update type code",
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
          <DialogTitle>{mode === "create" ? "New Type Code" : "Edit Type Code"}</DialogTitle>
          <DialogDescription>
            Maintain type code, type description, remark, and enabled status.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type Code</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter type code" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="typeDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type Description</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter type description" />
                  </FormControl>
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
                {mode === "create" ? "Create Type Code" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

