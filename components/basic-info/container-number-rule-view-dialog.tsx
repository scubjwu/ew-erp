"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ContainerNumberRuleRow } from "@/types/container-number-rule";

type Props = {
  open: boolean;
  row: ContainerNumberRuleRow | null;
  onOpenChange: (open: boolean) => void;
};

function Field({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="space-y-1 rounded-md border border-border/70 bg-muted/20 p-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="break-words text-sm">{value ?? "-"}</div>
    </div>
  );
}

export function ContainerNumberRuleViewDialog({
  open,
  row,
  onOpenChange,
}: Props) {
  if (!row) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Container Number Rule Details</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Size" value={row.sizeCode} />
          <Field label="Prefix" value={row.prefix} />
          <Field label="Serial Length" value={row.serialLength} />
          <Field label="Start Serial" value={row.startSerial} />
          <Field label="End Serial" value={row.endSerial} />
          <Field label="Current Serial" value={row.currentSerial} />
          <Field label="Remaining Available" value={row.remainingAvailable} />
          <Field label="Example Container Number" value={row.exampleContainerNumber} />
          <Field label="Status" value={row.status === "ACTIVE" ? "Enabled" : "Disabled"} />
          <Field label="Remark" value={row.remark} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
