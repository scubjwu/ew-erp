"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ConditionCodeRow } from "@/types/condition-code";

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
  row: ConditionCodeRow | null;
  onOpenChange: (open: boolean) => void;
};

export function ConditionCodeViewDialog({
  open,
  row,
  onOpenChange,
}: Props) {
  if (!row) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Condition Code Details</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Condition Code" value={row.code} />
          <Field label="Condition Name" value={row.name} />
          <Field label="Enabled" value={row.status === "ACTIVE" ? "Enabled" : "Disabled"} />
          <div className="md:col-span-2">
            <Field label="Description" value={row.description} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

