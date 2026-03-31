"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SizeCodeRow } from "@/types/size-code";

type Props = {
  open: boolean;
  row: SizeCodeRow | null;
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

export function SizeCodeViewDialog({ open, row, onOpenChange }: Props) {
  if (!row) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Size Code Details</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Size Code" value={row.code} />
          <Field label="Size Name" value={row.name} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
