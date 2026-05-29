import type { Metadata } from "next";

import { InventoryCommandCenter } from "@/components/inventory/inventory-command-center";

export const metadata: Metadata = {
  title: "In-Transit Inventory — EW ERP",
  description:
    "V8.0 inventory grid: Carrier vs 调运公司, collapsible search, date ranges, sortable columns, pagination, smart paste, export.",
};

/**
 * In-Transit Inventory route. Full UI lives in `InventoryCommandCenter`
 * (filters, power table, pagination, exports, action dock).
 */
export default function InventoryCenterPage() {
  return <InventoryCommandCenter />;
}
