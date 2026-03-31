"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { revalidateConditionCodePages } from "@/app/basic-info/condition-codes/actions";
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
import type { ConditionCodeRow } from "@/types/condition-code";

const schema = z.object({
  code: z.string().trim().min(1, "Condition code is required"),
  name: z.string().trim().min(1, "Condition name is required"),
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

function toFormValues(row: ConditionCodeRow | null): FormValues {
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
  row: ConditionCodeRow | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void> | void;
};

export function ConditionCodeFormDialog({
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
        condition_code: values.code,
        condition_name: values.name,
        description: values.description || null,
        status: values.enabled === "ENABLED" ? "ACTIVE" : "INACTIVE",
      };

      if (mode === "create") {
        const { error } = await supabase
          .from("container_condition_codes")
          .insert(payload);
        if (error) throw error;
      } else {
        if (!row) throw new Error("Missing condition code record");
        const { error } = await supabase
          .from("container_condition_codes")
          .update(payload)
          .eq("id", row.id);
        if (error) throw error;
      }

      await revalidateConditionCodePages();
      await onSaved();
      onOpenChange(false);
      toast({
        title:
          mode === "create"
            ? "Condition code created"
            : "Condition code updated",
        description: values.code,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title:
          mode === "create"
            ? "Could not create condition code"
            : "Could not update condition code",
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
            {mode === "create" ? "New Condition Code" : "Edit Condition Code"}
          </DialogTitle>
          <DialogDescription>
            Maintain condition code, condition name, remark, and enabled status.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Condition Code</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter condition code" />
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
                  <FormLabel>Condition Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter condition name" />
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
                {mode === "create" ? "Create Code" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

