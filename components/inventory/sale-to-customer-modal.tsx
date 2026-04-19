"use client";

import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
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
import { updateInventoryData } from "@/lib/supabase/inventory-api";
import type { InventoryRow } from "@/types/inventory";

import { SearchableCombobox, type ComboboxOption } from "./searchable-combobox";

type SaleToCustomerModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRows: InventoryRow[];
  onConfirmSuccess: () => void;
};

const EDITABLE_STATUS_OPTIONS = [
  "Gatebuy",
  "Unsold",
  "Invoiced",
  "EW Depot",
  "Misuse",
  "Consignment",
  "Other",
] as const;

type GroupForm = {
  price: string;
  orderNum: string;
  gateInRef: string;
};

type ReleaseEmailOrderGroup = {
  specs: string;
  condition: string;
  color: string;
  engine: string;
  price: string;
  dpp: string;
  units: string[];
  gateInRef: string;
};

type ReleaseEmailPayloadDraft = {
  customerName: string;
  depotInfo: {
    name: string;
    address: string;
    tel: string;
  };
  orderGroups: ReleaseEmailOrderGroup[];
  subject: string;
  salesRepName: string;
};

type DepotOption = {
  name: string;
  addr: string;
  tel: string;
};

type CustomerRow = {
  id: string;
  company_name: string | null;
  depot_info: unknown;
};

type SalesRepRow = {
  id: string;
  full_name: string | null;
};

async function fetchCustomers(q: string): Promise<CustomerRow[]> {
  const supabase = createBrowserClient();
  const term = q.trim();
  const pattern = `%${term}%`;

  const query = supabase
    .from("customers")
    .select("id, company_name, depot_info")
    .order("company_name", { ascending: true })
    .limit(30);

  const { data, error } = term
    ? await query.ilike("company_name", pattern)
    : await query;

  if (error) throw error;
  return (data ?? []) as CustomerRow[];
}

async function fetchSalesReps(q: string): Promise<SalesRepRow[]> {
  const supabase = createBrowserClient();
  const term = q.trim();
  const pattern = `%${term}%`;

  const query = supabase
    .from("users")
    .select("id, full_name")
    .order("full_name", { ascending: true })
    .limit(30);

  const { data, error } = term
    ? await query.ilike("full_name", pattern)
    : await query;

  if (error) throw error;
  return (data ?? []) as SalesRepRow[];
}

function makeGroupKey(row: InventoryRow): string {
  return `${row.specs || "Unknown"} | ${row.condition || "Unknown"} | ${
    row.color || "Unknown"
  } | ${row.engine || "Unknown"}`;
}

function parseDepotInfo(raw: unknown): DepotOption[] {
  if (!raw) return [];

  const normalizeOne = (input: any): DepotOption | null => {
    const name =
      String(
        input?.name ??
          input?.depot_name ??
          input?.planned_depot_Name ??
          input?.depotName ??
          ""
      ).trim();
    const addr =
      String(
        input?.addr ??
          input?.address ??
          input?.depot_address ??
          input?.depot_addr ??
          input?.planned_depot_Addr ??
          input?.depotAddr ??
          ""
      ).trim();
    const tel =
      String(
        input?.tel ??
          input?.phone ??
          input?.depot_tel ??
          input?.planned_depot_Tel ??
          input?.depotTel ??
          ""
      ).trim();
    if (!name && !addr && !tel) return null;
    return { name, addr, tel };
  };

  if (Array.isArray(raw)) {
    return raw.map(normalizeOne).filter((v): v is DepotOption => Boolean(v));
  }

  if (typeof raw === "object") {
    const obj = raw as any;
    if (Array.isArray(obj.depots)) {
      return obj.depots
        .map(normalizeOne)
        .filter((v: DepotOption | null): v is DepotOption => Boolean(v));
    }

    const maybeSingle = normalizeOne(obj);
    if (maybeSingle) return [maybeSingle];

    const fromValues = Object.values(obj)
      .map(normalizeOne)
      .filter((v: DepotOption | null): v is DepotOption => Boolean(v));
    if (fromValues.length > 0) return fromValues;
  }

  return [];
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeEmails(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((v) => String(v ?? "").trim())
      .filter((v) => v.length > 0);
  }
  return String(raw)
    .split(/[;,]/)
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

export function SaleToCustomerModal({
  open,
  onOpenChange,
  selectedRows,
  onConfirmSuccess,
}: SaleToCustomerModalProps) {
  const [customerOptions, setCustomerOptions] = useState<ComboboxOption[]>([]);
  const [salesRepOptions, setSalesRepOptions] = useState<ComboboxOption[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingSalesReps, setLoadingSalesReps] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [recipients, setRecipients] = useState("");
  const [ccRecipients, setCcRecipients] = useState("");
  const [replyToEmail, setReplyToEmail] = useState("");
  const [previewPayload, setPreviewPayload] =
    useState<ReleaseEmailPayloadDraft | null>(null);

  // Global DB state
  const [customerId, setCustomerId] = useState("");
  const [customer, setCustomer] = useState("");
  const [salesId, setSalesId] = useState("");
  const [salesRep, setSalesRep] = useState("");
  const [status, setStatus] = useState("Gatebuy");
  const [depotName, setDepotName] = useState("");
  const [depotAddr, setDepotAddr] = useState("");
  const [depotTel, setDepotTel] = useState("");

  // Global ephemeral state (email only)
  const [dpp, setDpp] = useState("100");

  // Grouped DB state
  const [groupData, setGroupData] = useState<Record<string, GroupForm>>({});
  const [depotOptions, setDepotOptions] = useState<DepotOption[]>([]);

  const groups = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        label: string;
        count: number;
        units: string[];
        specs: string;
        condition: string;
        color: string;
        engine: string;
      }
    >();
    selectedRows.forEach((row) => {
      const key = makeGroupKey(row);
      if (!map.has(key)) {
        map.set(key, {
          key,
          label: key,
          count: 0,
          units: [],
          specs: row.specs,
          condition: row.condition,
          color: row.color,
          engine: row.engine,
        });
      }
      const group = map.get(key)!;
      group.count += 1;
      group.units.push(row.unit);
    });
    return Array.from(map.values());
  }, [selectedRows]);

  useEffect(() => {
    if (!open) {
      setCcRecipients("");
      setReplyToEmail("");
      return;
    }

    const firstRow = selectedRows[0];
    if (!firstRow) return;

    // 1. Group Data Pre-fill
    const initialGroupData = Object.fromEntries(
      groups.map((g) => {
        const refRow = selectedRows.find((r) => r.unit === g.units[0]);
        return [
          g.key,
          {
            price: refRow?.price ? String(refRow.price) : "",
            orderNum: refRow?.customerOrderNum || "",
            gateInRef: refRow?.gateInRef || "",
          },
        ];
      })
    ) as Record<string, GroupForm>;
    setGroupData(initialGroupData);

    // 2. Global Pre-fill Check
    const uniformStatus = selectedRows.every((r) => r.status === firstRow.status)
      ? firstRow.status
      : "Gatebuy";
    const uniformDepotName = selectedRows.every((r) => r.depotName === firstRow.depotName)
      ? firstRow.depotName
      : "";
    const uniformDepotAddr = selectedRows.every((r) => r.depotAddr === firstRow.depotAddr)
      ? firstRow.depotAddr
      : "";
    const uniformDepotTel = selectedRows.every((r) => r.depotTel === firstRow.depotTel)
      ? firstRow.depotTel
      : "";

    const uniformCustomerName = selectedRows.every((r) => r.customer === firstRow.customer)
      ? firstRow.customer
      : "";
    const uniformSalesRepName = selectedRows.every((r) => r.salesRep === firstRow.salesRep)
      ? firstRow.salesRep
      : "";

    const statusIsValid = EDITABLE_STATUS_OPTIONS.includes(
      uniformStatus as (typeof EDITABLE_STATUS_OPTIONS)[number]
    );
    setStatus(statusIsValid ? uniformStatus : "Gatebuy");
    setDepotName(uniformDepotName ?? "");
    setDepotAddr(uniformDepotAddr ?? "");
    setDepotTel(uniformDepotTel ?? "");
    setDpp("100");
    setIsPreviewOpen(false);
    setRecipients("");
    setPreviewPayload(null);
    setDepotOptions([]);

    const supabase = createBrowserClient();

    // 3. Resolve Customer ID
    if (uniformCustomerName) {
      void supabase
        .from("customers")
        .select("id, depot_info")
        .eq("company_name", uniformCustomerName)
        .single()
        .then(({ data }) => {
          if (data) {
            setCustomerId(String((data as any).id ?? ""));
            setCustomer(uniformCustomerName);
            const depots = parseDepotInfo((data as any).depot_info);
            setDepotOptions(depots);
          } else {
            setCustomerId("");
            setCustomer("");
          }
        });
    } else {
      setCustomerId("");
      setCustomer("");
    }

    // 4. Resolve Sales Rep ID
    if (uniformSalesRepName) {
      void supabase
        .from("users")
        .select("id")
        .eq("full_name", uniformSalesRepName)
        .single()
        .then(({ data }) => {
          if (data) {
            setSalesId(String((data as any).id ?? ""));
            setSalesRep(uniformSalesRepName);
          } else {
            setSalesId("");
            setSalesRep("");
          }
        });
    } else {
      setSalesId("");
      setSalesRep("");
    }

    // 5. Load Initial Dropdown Options
    setLoadingCustomers(true);
    void fetchCustomers("")
      .then((rows) => {
        setCustomerOptions(
          rows
            .filter((r) => String(r.company_name ?? "").trim().length > 0)
            .map((r) => ({
              value: r.id,
              label: String(r.company_name),
              meta: { depot_info: JSON.stringify(r.depot_info ?? null) },
            }))
        );
      })
      .finally(() => setLoadingCustomers(false));

    setLoadingSalesReps(true);
    void fetchSalesReps("")
      .then((rows) => {
        setSalesRepOptions(
          rows
            .filter((r) => String(r.full_name ?? "").trim().length > 0)
            .map((r) => ({
              value: r.id,
              label: String(r.full_name),
            }))
        );
      })
      .finally(() => setLoadingSalesReps(false));
  }, [open, groups, selectedRows]);

  const setGroupField = (groupKey: string, patch: Partial<GroupForm>) => {
    setGroupData((prev) => ({
      ...prev,
      [groupKey]: {
        ...(prev[groupKey] ?? { price: "", orderNum: "", gateInRef: "" }),
        ...patch,
      },
    }));
  };

  const recipientList = useMemo(
    () =>
      recipients
        .split(/[;,]/)
        .map((v) => v.trim())
        .filter((v) => v.length > 0),
    [recipients]
  );

  const previewHasEngine = useMemo(
    () =>
      (previewPayload?.orderGroups ?? []).some(
        (g) =>
          g.engine &&
          g.engine.trim().length > 0 &&
          g.engine.toLowerCase() !== "unknown" &&
          g.engine !== "-"
      ),
    [previewPayload]
  );

  async function handleSave(sendEmail: boolean) {
    if (selectedRows.length === 0) return;

    // 1. Validate Customer
    if (!customerId.trim()) {
      toast({
        title: "Validation Error",
        description: "Customer is required.",
        variant: "destructive",
      });
      return;
    }

    // 2. Validate Status
    if (!status.trim()) {
      toast({
        title: "Validation Error",
        description: "Status is required.",
        variant: "destructive",
      });
      return;
    }

    // 3. Validate Sales Rep
    if (!salesId.trim()) {
      toast({
        title: "Validation Error",
        description: "Sales Rep is required.",
        variant: "destructive",
      });
      return;
    }

    // 4. Validate Price for ALL grouped cards
    for (const row of selectedRows) {
      const key = makeGroupKey(row);
      const grouped = groupData[key];
      if (!grouped || !String(grouped.price).trim()) {
        toast({
          title: "Validation Error",
          description: "Price is required for all container groups.",
          variant: "destructive",
        });
        return;
      }
    }

    const payload: Record<string, string> = {};
    const arrangeDate = todayIsoDate();
    for (const row of selectedRows) {
      const key = makeGroupKey(row);
      const grouped = groupData[key] ?? { price: "", orderNum: "", gateInRef: "" };

      payload[`${row.id}::customer_id`] = customerId;
      payload[`${row.id}::status`] = status;
      if (salesId.trim()) {
        payload[`${row.id}::sales`] = salesId;
      }
      payload[`${row.id}::depotName`] = depotName;
      payload[`${row.id}::depotAddr`] = depotAddr;
      payload[`${row.id}::depotTel`] = depotTel;
      payload[`${row.id}::price`] = grouped.price;
      payload[`${row.id}::customerOrderNum`] = grouped.orderNum;
      payload[`${row.id}::gateInRef`] = grouped.gateInRef;
      payload[`${row.id}::salesDate`] = arrangeDate;
    }

    setIsSaving(true);
    try {
      const summary = await updateInventoryData(payload);
      if (summary.failed > 0) {
        toast({
          title: "Save partially failed.",
          description: `${summary.succeeded}/${summary.totalRows} rows updated.`,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Sale updates saved.",
        description: `${summary.succeeded} unit(s) updated.`,
      });

      if (sendEmail) {
        const orderGroups: ReleaseEmailOrderGroup[] = groups.map((group) => {
          const draft = groupData[group.key] ?? {
            price: "",
            orderNum: "",
            gateInRef: "",
          };
          return {
            specs: group.specs || "",
            condition: group.condition || "",
            color: group.color || "",
            engine: group.engine || "",
            price: draft.price,
            dpp,
            units: group.units,
            gateInRef: draft.gateInRef,
          };
        });

        let prefilledRecipients = "";
        let salesRepEmail = "";
        const uniqueSpecs = Array.from(
          new Set(selectedRows.map((r) => r.specs).filter(Boolean))
        ).join("/");
        const pod = selectedRows[0]?.pod || "";
        const subject = `EW Logistics_${customer}_${uniqueSpecs}_${pod}`;
        try {
          const supabase = createBrowserClient();
          const { data: customerRow, error: customerEmailError } = await supabase
            .from("customers")
            .select("purchasing_emails")
            .eq("id", customerId)
            .single();
          if (customerEmailError) throw customerEmailError;
          const emails = Array.from(
            new Set(normalizeEmails((customerRow as any)?.purchasing_emails))
          );
          prefilledRecipients = emails.join(", ");

          const { data: salesRow, error: salesEmailError } = await supabase
            .from("users")
            .select("email")
            .eq("id", salesId)
            .single();
          if (!salesEmailError) {
            salesRepEmail = String((salesRow as any)?.email ?? "");
          }
        } catch (error) {
          console.error("Failed to fetch customer email recipients:", error);
        }

        setRecipients(prefilledRecipients);
        setCcRecipients("");
        setReplyToEmail(salesRepEmail);
        setPreviewPayload({
          customerName: customer || "Customer",
          depotInfo: {
            name: depotName,
            address: depotAddr,
            tel: depotTel,
          },
          orderGroups,
          subject,
          salesRepName: salesRep || "-",
        });
        setIsPreviewOpen(true);
        toast({
          title: "Updates saved. Review email before sending.",
        });
        return;
      }

      onConfirmSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save sale updates:", error);
      toast({
        title: "Failed to save sale updates.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleFinalSend() {
    if (!previewPayload) return;
    if (recipientList.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please enter at least one recipient email.",
        variant: "destructive",
      });
      return;
    }

    const ccList = ccRecipients
      .split(/[;,]/)
      .map((v) => v.trim())
      .filter((v) => v.length > 0);

    setIsSaving(true);
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.functions.invoke("send-release-email", {
        body: {
          to: recipientList,
          cc: ccList,
          replyTo: replyToEmail,
          customerName: previewPayload.customerName,
          depotInfo: previewPayload.depotInfo,
          orderGroups: previewPayload.orderGroups,
          subject: previewPayload.subject,
          salesRepName: previewPayload.salesRepName,
        },
      });
      if (error) throw error;

      const stamp = todayIsoDate();
      const auditLine = `[${stamp}] Release email sent to ${recipientList.join(", ")}.`;
      const auditPayload: Record<string, string> = {};
      for (const row of selectedRows) {
        const existing = row.remark1 || "";
        auditPayload[`${row.id}::remark1`] = existing
          ? `${auditLine}\n${existing}`
          : auditLine;
      }
      const auditSummary = await updateInventoryData(auditPayload);
      if (auditSummary.failed > 0) {
        toast({
          title: "Email sent, but audit trail partially failed.",
          description: `${auditSummary.succeeded}/${auditSummary.totalRows} remarks updated.`,
          variant: "destructive",
        });
      } else {
        toast({ title: "Release email sent successfully." });
      }

      onConfirmSuccess();
      setIsPreviewOpen(false);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Failed to send release email.",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Sale to Customer</span>
            <Badge variant="secondary">{selectedRows.length} units</Badge>
          </DialogTitle>
        </DialogHeader>

        {!isPreviewOpen ? (
          <>
            <div className="space-y-4">
              <div className="mb-6 grid grid-cols-4 gap-4">
            <div className="col-span-1">
              <SearchableCombobox
                label="Customer"
                placeholder="Select customer"
                value={customerId}
                required
                options={customerOptions}
                loading={loadingCustomers}
                onSearchChange={(q) => {
                  setLoadingCustomers(true);
                  void fetchCustomers(q)
                    .then((rows) => {
                      const opts = rows
                        .filter((r) => String(r.company_name ?? "").trim().length > 0)
                        .map((r) => ({
                          value: r.id,
                          label: String(r.company_name),
                          meta: { depot_info: JSON.stringify(r.depot_info ?? null) },
                        }));
                      setCustomerOptions(opts);
                    })
                    .finally(() => setLoadingCustomers(false));
                }}
                onSelect={(option) => {
                  setCustomerId(option?.value ?? "");
                  setCustomer(option?.label ?? "");
                  if (!option?.value) {
                    setDepotOptions([]);
                    setDepotName("");
                    setDepotAddr("");
                    setDepotTel("");
                    return;
                  }
                  void (async () => {
                    try {
                      const supabase = createBrowserClient();
                      const { data, error } = await supabase
                        .from("customers")
                        .select("depot_info")
                        .eq("id", option.value)
                        .single();
                      if (error) throw error;
                      const depots = parseDepotInfo(data?.depot_info);
                      setDepotOptions(depots);
                      if (depots.length > 0) {
                        setDepotName(depots[0].name);
                        setDepotAddr(depots[0].addr);
                        setDepotTel(depots[0].tel);
                      } else {
                        setDepotName("");
                        setDepotAddr("");
                        setDepotTel("");
                      }
                    } catch (error) {
                      console.error("Failed to load depot_info for customer:", error);
                      setDepotOptions([]);
                    }
                  })();
                }}
              />
            </div>

            <div className="col-span-1 space-y-1">
              <Label className="text-xs text-muted-foreground">
                Status <span className="text-destructive">*</span>
              </Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EDITABLE_STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-1 space-y-1">
              <SearchableCombobox
                label="Sales Rep"
                placeholder="Select sales rep"
                value={salesId}
                required
                options={salesRepOptions}
                loading={loadingSalesReps}
                onSearchChange={(q) => {
                  setLoadingSalesReps(true);
                  void fetchSalesReps(q)
                    .then((rows) => {
                      const opts = rows
                        .filter((r) => String(r.full_name ?? "").trim().length > 0)
                        .map((r) => ({
                          value: r.id,
                          label: String(r.full_name),
                        }));
                      setSalesRepOptions(opts);
                    })
                    .finally(() => setLoadingSalesReps(false));
                }}
                onSelect={(option) => {
                  setSalesId(option?.value ?? "");
                  setSalesRep(option?.label ?? "");
                }}
              />
            </div>

            <div className="col-span-1 space-y-1">
              <Label className="text-xs text-muted-foreground">DPP (Email Only)</Label>
              <Input
                className="h-9"
                type="number"
                min={0}
                value={dpp}
                onChange={(e) => setDpp(e.target.value)}
              />
            </div>

            <div className="col-span-1 space-y-1">
              <Label className="text-xs text-muted-foreground">Depot Name</Label>
              <Input
                className="h-9"
                list="depot-options"
                placeholder="Type or select depot"
                value={depotName}
                onChange={(e) => {
                  const val = e.target.value;
                  setDepotName(val);
                  // Auto-fill address and tel if they pick/type a matching predefined depot
                  const matched = depotOptions.find(
                    (d) => d.name.toLowerCase() === val.toLowerCase()
                  );
                  if (matched) {
                    setDepotAddr(matched.addr);
                    setDepotTel(matched.tel);
                  }
                }}
              />
              <datalist id="depot-options">
                {depotOptions.map((d) => (
                  <option key={d.name} value={d.name} />
                ))}
              </datalist>
            </div>

            <div className="col-span-2 space-y-1">
              <Label className="text-xs text-muted-foreground">Depot Address</Label>
              <Input
                className="h-9"
                value={depotAddr}
                onChange={(e) => setDepotAddr(e.target.value)}
              />
            </div>

            <div className="col-span-1 space-y-1">
              <Label className="text-xs text-muted-foreground">Depot Tel</Label>
              <Input
                className="h-9"
                value={depotTel}
                onChange={(e) => setDepotTel(e.target.value)}
              />
            </div>
          </div>

              <div className="max-h-[360px] space-y-3 overflow-auto pr-1">
                {groups.map((group) => {
                  const draft = groupData[group.key] ?? {
                    price: "",
                    orderNum: "",
                    gateInRef: "",
                  };
                  return (
                    <Card key={group.key}>
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center justify-between gap-2 text-sm">
                          <span className="truncate">{group.label}</span>
                          <Badge variant="outline">{group.count} units</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">
                              Price <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              className="h-9"
                              type="number"
                              min={0}
                              value={draft.price}
                              onChange={(e) =>
                                setGroupField(group.key, { price: e.target.value })
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">
                              Customer Order #
                            </Label>
                            <Input
                              className="h-9"
                              value={draft.orderNum}
                              onChange={(e) =>
                                setGroupField(group.key, { orderNum: e.target.value })
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Gate in Ref</Label>
                            <Input
                              className="h-9"
                              value={draft.gateInRef}
                              onChange={(e) =>
                                setGroupField(group.key, { gateInRef: e.target.value })
                              }
                            />
                          </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Units: {group.units.join(", ")}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  void handleSave(false);
                }}
                disabled={isSaving || selectedRows.length === 0}
              >
                {isSaving ? "Saving..." : "Save Updates"}
              </Button>
              <Button
                onClick={() => {
                  void handleSave(true);
                }}
                disabled={isSaving || selectedRows.length === 0}
              >
                {isSaving ? "Saving..." : "Save and Send Email"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold">Email Preview: Release Confirmation</h3>
                <p className="text-xs text-muted-foreground">
                  Use a recipient email verified in Resend for testing.
                </p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">To (comma-separated)</Label>
                <Input
                  className="h-9"
                  placeholder="ops@example.com, purchasing@example.com"
                  value={recipients}
                  onChange={(e) => setRecipients(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Cc (comma-separated)</Label>
                <Input
                  className="h-9"
                  placeholder="finance@example.com, manager@example.com"
                  value={ccRecipients}
                  onChange={(e) => setCcRecipients(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Reply-To</Label>
                <Input
                  className="h-9"
                  placeholder="sales@example.com"
                  value={replyToEmail}
                  onChange={(e) => setReplyToEmail(e.target.value)}
                />
              </div>

              <div className="rounded-md border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Subject</p>
                <p className="mb-3 text-sm font-medium">{previewPayload?.subject || "-"}</p>

                <div className="space-y-2 text-xs">
                  <p>
                    <span className="font-medium">Customer:</span>{" "}
                    {previewPayload?.customerName || "-"}
                  </p>
                  <p>
                    <span className="font-medium">Depot:</span>{" "}
                    {previewPayload?.depotInfo.name || "-"}
                  </p>
                  <p>
                    <span className="font-medium">Address:</span>{" "}
                    {previewPayload?.depotInfo.address || "-"}
                  </p>
                  <p>
                    <span className="font-medium">Tel:</span>{" "}
                    {previewPayload?.depotInfo.tel || "-"}
                  </p>
                  <p>
                    <span className="font-medium">Sales Rep:</span>{" "}
                    {previewPayload?.salesRepName || "-"}
                  </p>
                </div>

                <div className="mt-3 overflow-auto rounded border bg-background">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/70">
                      <tr>
                        <th className="px-2 py-1 text-left">Specs</th>
                        <th className="px-2 py-1 text-left">Condition</th>
                        <th className="px-2 py-1 text-left">Color</th>
                        {previewHasEngine ? (
                          <th className="px-2 py-1 text-left">Machine Type</th>
                        ) : null}
                        <th className="px-2 py-1 text-right">Price</th>
                        <th className="px-2 py-1 text-right">DPP</th>
                        <th className="px-2 py-1 text-left">Gate in Ref</th>
                        <th className="px-2 py-1 text-left">Units</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(previewPayload?.orderGroups ?? []).map((g, idx) => (
                        <tr key={`${g.specs}-${idx}`} className="border-t">
                          <td className="px-2 py-1">{g.specs}</td>
                          <td className="px-2 py-1">{g.condition}</td>
                          <td className="px-2 py-1">{g.color || "-"}</td>
                          {previewHasEngine ? (
                            <td className="px-2 py-1">{g.engine || "-"}</td>
                          ) : null}
                          <td className="px-2 py-1 text-right">{g.price}</td>
                          <td className="px-2 py-1 text-right">
                            <Input
                              className="h-7 w-16 px-1.5 text-right text-xs"
                              value={g.dpp}
                              onChange={(e) => {
                                setPreviewPayload((prev) => {
                                  if (!prev) return prev;
                                  const newGroups = [...prev.orderGroups];
                                  newGroups[idx] = {
                                    ...newGroups[idx],
                                    dpp: e.target.value,
                                  };
                                  return { ...prev, orderGroups: newGroups };
                                });
                              }}
                            />
                          </td>
                          <td className="px-2 py-1">{g.gateInRef || "-"}</td>
                          <td className="px-2 py-1">{g.units.join(", ")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsPreviewOpen(false)}
                disabled={isSaving}
              >
                Back to Edit
              </Button>
              <Button onClick={() => void handleFinalSend()} disabled={isSaving}>
                {isSaving ? "Sending..." : "Confirm & Send Email"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
