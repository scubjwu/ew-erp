"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { RegionCode } from "@/types/region-code";

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
  row: RegionCode | null;
  onOpenChange: (open: boolean) => void;
};

export function RegionCodeViewDialog({ open, row, onOpenChange }: Props) {
  if (!row) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Region Details</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Region Code" value={row.region_code} />
          <Field label="Region Name" value={row.region_name} />
          <Field label="Status" value={row.status} />
          <Field label="Created By" value={row.created_by} />
          <div className="md:col-span-2">
            <Field label="Description" value={row.description} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
