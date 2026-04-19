"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";

import { revalidateSizeCodePages } from "@/app/basic-info/size-codes/actions";
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
import { toast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";
import { createBrowserClient } from "@/lib/supabase/client";
import type { SizeCodeRow } from "@/types/size-code";

const schema = z.object({
  code: z.string().trim().min(1, "Size code is required"),
  name: z.string().trim().min(1, "Size name is required"),
});

type FormValues = z.infer<typeof schema>;

const DEFAULT_VALUES: FormValues = {
  code: "",
  name: "",
};

function toFormValues(row: SizeCodeRow | null): FormValues {
  if (!row) return DEFAULT_VALUES;
  return {
    code: row.code,
    name: row.name,
  };
}

type Props = {
  open: boolean;
  mode: "create" | "edit";
  row: SizeCodeRow | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void> | void;
};

export function SizeCodeFormDialog({
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
  }, [form, row, open]);

  async function onSubmit(values: FormValues) {
    setSaving(true);
    try {
      const supabase = createBrowserClient();
      const payload = {
        size_code: values.code,
        size_name: values.name,
        remark: values.name,
        status: "ACTIVE",
      };

      if (mode === "create") {
        const { error } = await supabase.from("container_size_codes").insert(payload);
        if (error) throw error;
      } else {
        if (!row) throw new Error("Missing size code record");
        const { error } = await supabase
          .from("container_size_codes")
          .update(payload)
          .eq("id", row.id);
        if (error) throw error;
      }

      await revalidateSizeCodePages();
      await onSaved();
      onOpenChange(false);
      toast({
        title: mode === "create" ? "Size code created" : "Size code updated",
        description: values.code,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title:
          mode === "create" ? "Could not create size code" : "Could not update size code",
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
          <DialogTitle>{mode === "create" ? "New Size Code" : "Edit Size Code"}</DialogTitle>
          <DialogDescription>
            Maintain size code and size name.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Size Code</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter size code" />
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
                  <FormLabel>Size Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter size name" />
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
                {mode === "create" ? "Create Size Code" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
