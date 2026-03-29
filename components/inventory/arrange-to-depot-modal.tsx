"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { createBrowserClient } from "@/lib/supabase/client";
import type { InventoryRow } from "@/types/inventory";

import { SearchableCombobox, type ComboboxOption } from "./searchable-combobox";

type ArrangeToDepotModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRows: InventoryRow[];
  onConfirmSuccess: () => void;
};

type DepotOption = ComboboxOption & {
  meta?: {
    address?: string;
    tel?: string;
  };
};

async function fetchDepots(q: string): Promise<DepotOption[]> {
  const supabase = createBrowserClient();
  const term = q.trim();
  const pattern = `%${term}%`;

  for (const table of ["depots", "Depots"]) {
    const query = supabase
      .from(table)
      .select("*")
      .order("depot_name", { ascending: true })
      .limit(20);

    const { data, error } = term
      ? await query.ilike("depot_name", pattern)
      : await query;

    if (error) continue;

    return (data ?? [])
      .filter((r) => String((r as Record<string, unknown>).depot_name ?? "").trim())
      .map((r) => {
        const rec = r as Record<string, unknown>;
        const name = String(rec.depot_name ?? "");
        const addr = String(rec.depot_addr ?? rec.address ?? "");
        const tel = String(rec.depot_tel ?? rec.tel ?? "");
        return {
          value: String(rec.id),
          label: name,
          meta: {
            address: addr,
            tel,
          },
        };
      });
  }

  return [];
}

export function ArrangeToDepotModal({
  open,
  onOpenChange,
  selectedRows,
  onConfirmSuccess,
}: ArrangeToDepotModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [depotOptions, setDepotOptions] = useState<DepotOption[]>([]);
  const [loadingDepots, setLoadingDepots] = useState(false);

  const [targetDepotId, setTargetDepotId] = useState("");
  const [targetDepotName, setTargetDepotName] = useState("");
  const [depotAddress, setDepotAddress] = useState("");
  const [depotTel, setDepotTel] = useState("");
  const [status, setStatus] = useState("EW Depot");
  const [gateInCode, setGateInCode] = useState("");

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setTargetDepotId("");
    setTargetDepotName("");
    setDepotAddress("");
    setDepotTel("");
    setStatus("EW Depot");
    setGateInCode("");

    setLoadingDepots(true);
    void fetchDepots("").then((rows) => {
      setDepotOptions(rows);
      setLoadingDepots(false);
    });
  }, [open]);

  const qty = selectedRows.length;
  const subject = useMemo(() => {
    if (!targetDepotName) return `Inbound Advice - ${qty} Units`;
    return `Inbound Advice for ${targetDepotName} - ${qty} Units`;
  }, [targetDepotName, qty]);

  const body = useMemo(() => {
    return [
      "Dear Depot Team,",
      "",
      `Please arrange inbound for ${qty} unit(s).`,
      `Target Depot: ${targetDepotName || "N/A"}`,
      `Address: ${depotAddress || "N/A"}`,
      `Tel: ${depotTel || "N/A"}`,
      `Status: ${status}`,
      gateInCode ? `Gate-in Code: ${gateInCode}` : "",
      "",
      "Regards,",
      "EW ERP",
    ]
      .filter(Boolean)
      .join("\n");
  }, [qty, targetDepotName, depotAddress, depotTel, status, gateInCode]);

  const invalidStep1 = !targetDepotId;

  function onConfirm() {
    toast({
      title: "Depot arrangement prepared",
      description: `Inbound advice drafted for ${targetDepotName || "target depot"}.`,
    });
    onConfirmSuccess();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Arrange to Depot</DialogTitle>
          <DialogDescription>
            Step {step} of 2 · {qty} selected unit(s)
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs text-muted-foreground">Subject (Auto)</Label>
              <Input
                value={subject}
                readOnly
                className="h-9 bg-muted/40"
                placeholder={`Inbound Advice - ${qty} Units`}
              />
            </div>
            <SearchableCombobox
              label="Target Depot"
              placeholder="Select target depot"
              value={targetDepotId}
              required
              options={depotOptions}
              loading={loadingDepots}
              onSearchChange={(q) => {
                setLoadingDepots(true);
                void fetchDepots(q).then((rows) => {
                  setDepotOptions(rows);
                  setLoadingDepots(false);
                });
              }}
              onSelect={(option) => {
                setTargetDepotId(option?.value ?? "");
                setTargetDepotName(option?.label ?? "");
                setDepotAddress(option?.meta?.address ?? "");
                setDepotTel(option?.meta?.tel ?? "");
              }}
            />

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EW Depot">EW Depot</SelectItem>
                  <SelectItem value="Awaiting Gate-in">Awaiting Gate-in</SelectItem>
                  <SelectItem value="Hold">Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Depot Address</Label>
              <Input
                value={depotAddress}
                onChange={(e) => setDepotAddress(e.target.value)}
                className="h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Depot Tel</Label>
              <Input
                value={depotTel}
                onChange={(e) => setDepotTel(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs text-muted-foreground">Gate-in Code</Label>
              <Input
                value={gateInCode}
                onChange={(e) => setGateInCode(e.target.value)}
                className="h-9"
                placeholder="Optional"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Email Subject</Label>
            <Input value={subject} readOnly className="h-9 bg-muted/40" />
            <Label className="text-xs text-muted-foreground">Email Body</Label>
            <textarea
              className="min-h-[220px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={body}
              readOnly
            />
          </div>
        )}

        <DialogFooter>
          {step === 2 && (
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
          )}
          {step === 1 ? (
            <Button disabled={invalidStep1} onClick={() => setStep(2)}>
              Next
            </Button>
          ) : (
            <Button onClick={onConfirm}>Confirm & Send</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
