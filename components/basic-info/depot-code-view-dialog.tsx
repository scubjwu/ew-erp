"use client";

import { ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DepotCodeRow } from "@/types/depot-code";

type DepotCodeViewDialogProps = {
  open: boolean;
  depot: DepotCodeRow | null;
  onOpenChange: (open: boolean) => void;
};

type TabKey = "info" | "tariff" | "settlement" | "attachment";

const DEPOT_TYPE_LABELS: Record<string, string> = {
  CONTRACT: "Contract",
  FACTORY_YARD: "Factory Yard",
  SHIPPING_LINES: "Shipping Lines",
  TRADER: "Trader",
  CONSIGNMENT: "Consignment",
  VENDOR: "Vendor",
  OTHER: "Other",
};

const STATUS_LABELS: Record<string, string> = {
  NORMAL: "Normal",
  SUSPEND: "Suspend",
};

function formatNumber(value: string | number | null | undefined) {
  if (value == null || value === "") return "-";
  const parsed = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(parsed)) return String(value);
  return parsed.toFixed(2);
}

function Field({
  label,
  value,
  className,
}: {
  label: string;
  value: string | null | undefined;
  className?: string;
}) {
  return (
    <div
      className={`space-y-1 rounded-md border border-border/70 bg-muted/20 p-3 ${
        className ?? ""
      }`}
    >
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="break-words text-sm">{value?.trim() ? value : "-"}</div>
    </div>
  );
}

function TariffField({
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
      <div className="text-sm">{formatNumber(value)}</div>
    </div>
  );
}

function getAdditionalCostRows(depot: DepotCodeRow) {
  const dynamicRows =
    (depot.depot_additional_costs ?? []).map((row) => ({
      id: row.id,
      cost_item: row.cost_item,
      rate: row.rate,
      currency: row.currency,
      remark: row.remark,
    })) ?? [];

  if (dynamicRows.length > 0) return dynamicRows;

  const legacyRows: Array<{
    id: string;
    cost_item: string;
    rate: string | number;
    currency: string;
    remark: string | null;
  }> = [];

  const currency = depot.currency ?? "USD";
  const legacyItems: Array<[string, string | number | null | undefined]> = [
    ["PTI", depot.pti_cost],
    ["Inspection Fee", depot.inspection_cost],
    ["Survey Fee", depot.survey_cost],
    ["Minimum Repair Cost", depot.min_repair_cost],
    ["Estimate Recovery Fee", depot.est_recovery_fee],
    ["User Return Surcharge In", depot.user_return_surcharge_in],
    ["User Return Surcharge Out", depot.user_return_surcharge_out],
  ];

  for (const [cost_item, rate] of legacyItems) {
    const numeric = Number(rate ?? 0);
    if (!Number.isFinite(numeric) || numeric <= 0) continue;
    legacyRows.push({
      id: `legacy-${cost_item}`,
      cost_item,
      rate: numeric,
      currency,
      remark: null,
    });
  }

  return legacyRows;
}

export function DepotCodeViewDialog({
  open,
  depot,
  onOpenChange,
}: DepotCodeViewDialogProps) {
  const [tab, setTab] = useState<TabKey>("info");

  const tabs = useMemo(
    () =>
      [
        ["info", "Info"],
        ["tariff", "Tariff"],
        ["settlement", "Settlement"],
        ["attachment", "Attachment"],
      ] as Array<[TabKey, string]>,
    []
  );

  if (!depot) return null;

  const regionName =
    depot.cities?.region_codes?.region_name ?? depot.cities?.region ?? null;
  const additionalCostRows = getAdditionalCostRows(depot);
  const attachmentLinks =
    (depot.depot_attachment_links ?? []).map((row) => row.url).filter(Boolean) ?? [];
  if (attachmentLinks.length === 0 && depot.depot_attachment_url?.trim()) {
    attachmentLinks.push(depot.depot_attachment_url.trim());
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>Depot Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 border-b border-border pb-2">
            {tabs.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`rounded-md border px-3 py-1.5 text-sm ${
                  tab === key
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "info" && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Depot Code" value={depot.depot_code} />
              <Field
                label="Type"
                value={
                  DEPOT_TYPE_LABELS[depot.depot_type ?? ""] ??
                  depot.depot_type ??
                  "-"
                }
              />
              <Field
                label="Status"
                value={STATUS_LABELS[depot.status] ?? depot.status}
              />
              <Field
                label="Primary Depot"
                value={depot.is_primary_depot ? "Yes" : "No"}
              />
              <Field label="Depot Name" value={depot.depot_name} />
              <Field label="Depot Name in Chinese" value={depot.depot_name_cn} />
              <Field label="Region" value={regionName} />
              <Field label="City Code" value={depot.cities?.city_code} />
              <Field
                label="Address"
                value={depot.depot_address}
                className="md:col-span-2"
              />
              <Field
                label="Chinese Address"
                value={depot.depot_address_cn}
                className="md:col-span-2"
              />
              <Field label="City" value={depot.cities?.city_name} />
              <Field
                label="Country"
                value={depot.country_name ?? depot.cities?.country ?? null}
              />
              <Field label="Contact Person (Gate)" value={depot.contact_person} />
              <Field
                label="Contact Email (Gate)"
                value={depot.gate_email ?? depot.contact_email}
              />
              <Field label="Phone" value={depot.depot_tel} />
              <Field label="Fax" value={depot.fax} />
              <Field label="Contact Email (Owner)" value={depot.contact_email} />
              <Field label="Account Email" value={depot.account_email} />
            </div>
          )}

          {tab === "tariff" && (
            <div className="space-y-5">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <TariffField label="Gate In 20" value={depot.gate_in_20_cost} />
                <TariffField label="Gate Out 20" value={depot.gate_out_20_cost} />
                <TariffField label="Lift In 20" value={depot.lift_in_20_cost} />
                <TariffField label="Lift Out 20" value={depot.lift_out_20_cost} />
                <TariffField label="Gate In 40" value={depot.gate_in_40_cost} />
                <TariffField label="Gate Out 40" value={depot.gate_out_40_cost} />
                <TariffField label="Lift In 40" value={depot.lift_in_40_cost} />
                <TariffField label="Lift Out 40" value={depot.lift_out_40_cost} />
                <TariffField label="Storage 20 / Day" value={depot.storage_rate_20} />
                <TariffField label="Storage 40 / Day" value={depot.storage_rate_40} />
                <TariffField label="Labour Cost" value={depot.labour_cost} />
                <TariffField label="Free Day" value={depot.free_days} />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Additional / Miscellaneous Costs</h3>
                    <p className="text-xs text-muted-foreground">
                      Dynamic tariff items such as PTI, decal removal, shifting, and other depot-specific charges.
                    </p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-md border border-border/70">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30 text-left">
                      <tr>
                        <th className="px-3 py-2 font-medium">Cost Item</th>
                        <th className="px-3 py-2 font-medium">Rate</th>
                        <th className="px-3 py-2 font-medium">Currency</th>
                        <th className="px-3 py-2 font-medium">Remark</th>
                      </tr>
                    </thead>
                    <tbody>
                      {additionalCostRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-3 py-6 text-center text-sm text-muted-foreground"
                          >
                            No additional tariff rows configured.
                          </td>
                        </tr>
                      ) : (
                        additionalCostRows.map((row) => (
                          <tr key={row.id} className="border-t border-border/60">
                            <td className="px-3 py-2">{row.cost_item}</td>
                            <td className="px-3 py-2">{formatNumber(row.rate)}</td>
                            <td className="px-3 py-2">{row.currency || "-"}</td>
                            <td className="px-3 py-2">{row.remark?.trim() ? row.remark : "-"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tab === "settlement" && (
            <div className="grid gap-3">
              <Field label="Settlement Cycle" value={depot.settlement_cycle} />
              <Field label="Payment Remark" value={depot.payment_remark} />
              <Field label="Other Terms Remark" value={depot.other_terms_remark} />
            </div>
          )}

          {tab === "attachment" && (
            <div className="grid gap-3">
              <Field label="Data Updated On" value={depot.data_updated_on} />
              <Field label="Remark" value={depot.remark} />
              <div className="space-y-1 rounded-md border border-border/70 bg-muted/20 p-3">
                <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Depot Attachments
                </div>
                {attachmentLinks.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {attachmentLinks.map((url, index) => (
                      <a
                        key={`${url}-${index}`}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-sky-600 hover:text-sky-500"
                      >
                        View depot contract {attachmentLinks.length > 1 ? index + 1 : ""}
                        <ExternalLink className="size-3.5" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No attachment link configured.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
