"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FinancialCodeCategory, FinancialCodeRow } from "@/types/financial-code";

function labelsForCategory(category: FinancialCodeCategory) {
  return category === "INCOME"
    ? {
        title: "Revenue Code",
        code: "Revenue Code",
        name: "Revenue Name",
      }
    : {
        title: "Expense Code",
        code: "Expense Code",
        name: "Expense Name",
      };
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
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
  category: FinancialCodeCategory;
  row: FinancialCodeRow | null;
  onOpenChange: (open: boolean) => void;
};

export function FinancialCodeViewDialog({
  open,
  category,
  row,
  onOpenChange,
}: Props) {
  if (!row) return null;
  const labels = labelsForCategory(category);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{labels.title} Details</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label={labels.code} value={row.code} />
          <Field label={labels.name} value={row.name} />
          <Field label="Enabled" value={row.status === "ACTIVE" ? "Enabled" : "Disabled"} />
          <div className="md:col-span-2">
            <Field label="Description" value={row.description} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
