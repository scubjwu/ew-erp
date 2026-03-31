"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { OperationPriceRow } from "@/types/operation-price-config";

type Props = {
  open: boolean;
  row: OperationPriceRow | null;
  onOpenChange: (open: boolean) => void;
};

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

export function OperationPriceViewDialog({ open, row, onOpenChange }: Props) {
  if (!row) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Operation Price Details</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Size" value={row.container_size_codes?.size_code ?? null} />
          <Field
            label="Condition"
            value={row.container_condition_codes?.condition_name ?? null}
          />
          <Field label="Additional Price" value={String(row.addon_price ?? "")} />
          <Field label="Currency" value={row.currency} />
          <Field label="Effective From" value={row.effective_from} />
          <Field label="Effective To" value={row.effective_to} />
          <Field
            label="Status"
            value={row.status === "ACTIVE" ? "Enabled" : "Disabled"}
          />
          <Field label="Remark" value={row.remark} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
