"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";

import { revalidateCityLogisticsPage } from "@/app/basic-info/cities/actions";
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
import type { CityLogisticsRow, RegionOption } from "@/types/city-logistics";

const cityLogisticsSchema = z.object({
  city_code: z.string().trim().min(1, "City code is required"),
  city_name: z.string().trim().min(1, "City / port name is required"),
  region_id: z.string().trim().nullable(),
  country: z.string().trim().min(1, "Country is required"),
  remark: z.string().trim(),
});

type CityLogisticsFormValues = z.infer<typeof cityLogisticsSchema>;

const DEFAULT_VALUES: CityLogisticsFormValues = {
  city_code: "",
  city_name: "",
  region_id: null,
  country: "",
  remark: "",
};

function toFormValues(city: CityLogisticsRow | null): CityLogisticsFormValues {
  if (!city) return DEFAULT_VALUES;
  return {
    city_code: city.city_code,
    city_name: city.city_name,
    region_id: city.region_id,
    country: city.country,
    remark: city.remark ?? "",
  };
}

type CityLogisticsFormDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  city: CityLogisticsRow | null;
  regionOptions: RegionOption[];
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void> | void;
};

export function CityLogisticsFormDialog({
  open,
  mode,
  city,
  regionOptions,
  onOpenChange,
  onSaved,
}: CityLogisticsFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const form = useForm<CityLogisticsFormValues>({
    resolver: zodResolver(cityLogisticsSchema) as Resolver<CityLogisticsFormValues>,
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    form.reset(toFormValues(city));
  }, [city, form, open]);

  async function onSubmit(values: CityLogisticsFormValues) {
    setSaving(true);
    try {
      const selectedRegion =
        regionOptions.find((option) => option.id === values.region_id) ?? null;
      const payload = {
        city_code: values.city_code,
        city_name: values.city_name,
        region_id: values.region_id,
        region: selectedRegion?.region_name ?? null,
        country: values.country,
        remark: values.remark || null,
      };

      const supabase = createBrowserClient();
      if (mode === "create") {
        const { error } = await supabase.from("cities").insert(payload);
        if (error) throw error;
      } else {
        if (!city) throw new Error("Missing city record");
        const { error } = await supabase
          .from("cities")
          .update(payload)
          .eq("id", city.id);
        if (error) throw error;
      }

      await revalidateCityLogisticsPage();
      await onSaved();
      onOpenChange(false);
      toast({
        title: mode === "create" ? "City created" : "City updated",
        description: payload.city_code,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: mode === "create" ? "Could not create city" : "Could not update city",
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
          <DialogTitle>{mode === "create" ? "New City" : "Edit City"}</DialogTitle>
          <DialogDescription>
            Maintain city / port standard data and its region mapping.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="city_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City Code</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter city code" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="city_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City / Port Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter city / port name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="region_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Region</FormLabel>
                  <Select
                    onValueChange={(value) =>
                      field.onChange(value === "__none__" ? null : value)
                    }
                    value={field.value ?? "__none__"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select region" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">No Region</SelectItem>
                      {regionOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.region_name}
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
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter country" />
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
            <DialogFooter className="md:col-span-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                {mode === "create" ? "Create City" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
