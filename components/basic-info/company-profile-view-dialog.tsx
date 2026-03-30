"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { CompanyProfile } from "@/types/company-profile";

type CompanyProfileViewDialogProps = {
  open: boolean;
  company: CompanyProfile | null;
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
    <div className="space-y-1">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
        {value && value.trim() ? value : "-"}
      </div>
    </div>
  );
}

export function CompanyProfileViewDialog({
  open,
  company,
  onOpenChange,
}: CompanyProfileViewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Company Details</DialogTitle>
          <DialogDescription>
            Full company profile information in read-only mode.
          </DialogDescription>
        </DialogHeader>

        {!company ? null : (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Company Name" value={company.company_name_cn} />
            <Field label="English Name" value={company.company_name_en} />
            <Field label="Address" value={company.address_cn} />
            <Field label="English Address" value={company.address_en} />
            <Field label="Phone" value={company.phone} />
            <Field label="Fax" value={company.fax} />
            <Field label="Email" value={company.email} />
            <Field label="Postal Code" value={company.postal_code} />
            <Field label="Date" value={company.record_date} />
            <Field label="Location" value={company.location_code} />
            <Field label="Business Number" value={company.business_code} />
            <Field label="System Number" value={company.system_code} />
            <Field label="Data Number" value={company.data_code} />
            <Field label="Group Number" value={company.group_code} />
            <Field
              label="Certificate Number"
              value={company.certificate_code}
            />
            <Field label="Invoice Number" value={company.invoice_code} />
            <Field label="Version Info" value={company.version_info} />
            <Field label="Status" value={company.status} />
            <div className="md:col-span-2">
              <Separator className="my-2" />
            </div>
            <div className="md:col-span-2">
              <Field label="Remark" value={company.remark} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
