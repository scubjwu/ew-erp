"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";

import { revalidateRegionCodesPage } from "@/app/basic-info/regions/actions";
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
import type { RegionCode } from "@/types/region-code";

const regionCodeSchema = z.object({
  region_code: z.string().trim().min(1, "Region code is required"),
  region_name: z.string().trim(),
  description: z.string().trim(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

type RegionCodeFormValues = z.infer<typeof regionCodeSchema>;

const DEFAULT_VALUES: RegionCodeFormValues = {
  region_code: "",
  region_name: "",
  description: "",
  status: "ACTIVE",
};

function toFormValues(region: RegionCode | null): RegionCodeFormValues {
  if (!region) return DEFAULT_VALUES;
  return {
    region_code: region.region_code,
    region_name: region.region_name,
    description: region.description ?? "",
    status: region.status,
  };
}

type RegionCodeFormDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  region: RegionCode | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void> | void;
};

export function RegionCodeFormDialog({
  open,
  mode,
  region,
  onOpenChange,
  onSaved,
}: RegionCodeFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const form = useForm<RegionCodeFormValues>({
    resolver: zodResolver(regionCodeSchema) as Resolver<RegionCodeFormValues>,
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    form.reset(toFormValues(region));
  }, [form, region, open]);

  async function onSubmit(values: RegionCodeFormValues) {
    setSaving(true);
    try {
      const supabase = createBrowserClient();
      const payload = {
        region_code: values.region_code,
        region_name: values.region_name || values.region_code,
        description: values.description || null,
        status: values.status,
      };

      if (mode === "create") {
        const { error } = await supabase.from("region_codes").insert(payload);
        if (error) throw error;
      } else {
        if (!region) throw new Error("Missing region record");
        const { error } = await supabase
          .from("region_codes")
          .update(payload)
          .eq("id", region.id);
        if (error) throw error;
      }

      await revalidateRegionCodesPage();
      await onSaved();
      onOpenChange(false);
      toast({
        title: mode === "create" ? "Region created" : "Region updated",
        description: payload.region_code,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: mode === "create" ? "Could not create region" : "Could not update region",
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
          <DialogTitle>{mode === "create" ? "New Region" : "Edit Region"}</DialogTitle>
          <DialogDescription>
            Maintain region master data used by cities and depots.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="region_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Region Code</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter region code" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="region_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Region Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter region name" />
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
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div />
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
            <DialogFooter className="md:col-span-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                {mode === "create" ? "Create Region" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
