"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CityLogisticsRow } from "@/types/city-logistics";

function Field({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="space-y-1 rounded-md border border-border/70 bg-muted/20 p-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="break-words text-sm">{value?.trim() ? value : "-"}</div>
    </div>
  );
}

type Props = {
  open: boolean;
  row: CityLogisticsRow | null;
  onOpenChange: (open: boolean) => void;
};

export function CityLogisticsViewDialog({ open, row, onOpenChange }: Props) {
  if (!row) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>City Details</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="City Code" value={row.city_code} />
          <Field label="City / Port Name" value={row.city_name} />
          <Field label="Region" value={row.region_codes?.region_name ?? row.region} />
          <Field label="Country" value={row.country} />
          <div className="md:col-span-2">
            <Field label="Remark" value={row.remark} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
