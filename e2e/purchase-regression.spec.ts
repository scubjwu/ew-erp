import fs from "fs";
import path from "path";

import { test, expect, type Locator, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

type FactoryOrderFixture = {
  orderId: string;
  orderNo: string;
  itemId: string;
  itemColor: string | null;
  totalActiveContainers: number;
  firstPageContainerNumbers: string[];
};

type SeedOrderTemplate = {
  purchaseType: "FACTORY_ORDER" | "USED_CONTAINER" | "NEW_CONTAINER";
  supplierId: string | null;
  ownerId: string | null;
  buyerId: string | null;
  item: {
    locationCityId: string | null;
    depotId: string | null;
    containerSizeCodeId: string | null;
    containerTypeCodeId: string | null;
    containerConditionCodeId: string | null;
    color: string | null;
    flp: boolean;
    lbx: boolean;
    lockingBarsCount: number | null;
    ventsCount: number | null;
    machineType: string | null;
    yom: number | null;
    plannedPod: string | null;
    tareWeight: number | null;
    maximumWeight: number | null;
    cscNumber: string | null;
  };
};

function readEnvFile() {
  const envPath = path.join(process.cwd(), ".env.local");
  const raw = fs.readFileSync(envPath, "utf8");
  return Object.fromEntries(
    raw
      .split(/\r?\n/)
      .filter(Boolean)
      .filter((line) => !line.startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      })
  );
}

const env = readEnvFile();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function must<T>(
  promise: PromiseLike<{ data: T; error: { message: string } | null }>,
  label: string
) {
  const result = await promise;
  if (result.error) {
    throw new Error(`${label}: ${result.error.message}`);
  }
  return result.data;
}

async function pickFirstAutocompleteOption(page: Page, input: Locator) {
  await input.click();
  await input.fill("Reset");
  const debugState = page.locator("#debug-autocomplete-state").first();
  await expect.poll(async () => await debugState.getAttribute("data-options")).not.toBe("0");
  await input.press("Enter");
}

async function setAutocompleteCellToFirstOption(page: Page, testId: string) {
  await page.getByTestId(testId).click();
  const firstOption = page.getByRole("option").first();
  await expect(firstOption).toBeVisible();
  await firstOption.click();
}

async function setInputCellValue(page: Page, testId: string, value: string) {
  const cell = page.getByTestId(testId);
  await cell.click();
  const input = page.locator(`input[data-testid="${testId}"], textarea[data-testid="${testId}"]`);
  await expect(input).toBeVisible();
  await input.fill(value);
  await input.press("Enter");
}

async function chooseFirstOwner(page: Page) {
  const trigger = page.getByTestId("purchase-owner-trigger");
  await trigger.click();
  await trigger.press("ArrowDown");
  await trigger.press("Enter");
}

async function chooseFirstAssignedBuyer(page: Page) {
  const trigger = page.getByTestId("purchase-buyer-trigger");
  await trigger.click();
  await trigger.press("ArrowDown");
  await trigger.press("Enter");
}

async function choosePurchaseType(page: Page, label: string) {
  const trigger = page.getByTestId("purchase-type-trigger");
  await trigger.click();
  await trigger.press("ArrowDown");
  if (label === "Used Container") {
    await trigger.press("ArrowDown");
  } else if (label === "New Container") {
    await trigger.press("ArrowDown");
    await trigger.press("ArrowDown");
  }
  await trigger.press("Enter");
}

async function chooseOwnerByLabel(page: Page, ownerLabel: string) {
  const trigger = page.getByTestId("purchase-owner-trigger");
  await trigger.click();
  await trigger.press("ArrowDown");
  await trigger.press("Enter");
}

async function fillMinimalFactoryOrder(
  page: Page,
  {
    ownerLabel,
    plannedQty,
    unitPrice,
  }: {
    ownerLabel: string;
    plannedQty: number;
    unitPrice: number;
  }
) {
  await pickFirstAutocompleteOption(page, page.getByRole("combobox", { name: "Supplier" }));
  await chooseOwnerByLabel(page, ownerLabel);
  await chooseFirstAssignedBuyer(page);
  await setAutocompleteCellToFirstOption(page, "purchase-item-0-location");
  await setAutocompleteCellToFirstOption(page, "purchase-item-0-depot");
  await setAutocompleteCellToFirstOption(page, "purchase-item-0-size-type");
  await setAutocompleteCellToFirstOption(page, "purchase-item-0-color");
  await setInputCellValue(page, "purchase-item-0-vents", "12");
  await setInputCellValue(page, "purchase-item-0-planned-qty", String(plannedQty));
  await setInputCellValue(page, "purchase-item-0-unit-price", String(unitPrice));
}

async function currentGeneratedOrderNo(page: Page) {
  return page.locator('input[readonly]').first().inputValue();
}

async function waitForDetailPage(page: Page) {
  await expect(page.getByRole("heading", { name: "Purchase Order Detail", exact: true })).toBeVisible();
}

function isPurchaseDetailUrl(url: string) {
  return /\/purchase\/po-management\/[^/]+$/.test(url) && !url.endsWith("/new") && !url.endsWith("/edit");
}

async function findFactoryOrderFixture(): Promise<FactoryOrderFixture> {
  const candidateOrders = await must(
    supabase
      .from("purchase_order")
      .select("id,order_no")
      .eq("purchase_type", "FACTORY_ORDER")
      .in("order_status", ["SUBMITTED", "IN_PRODUCTION", "PARTIAL_RELEASED", "RELEASED"])
      .order("created_at", { ascending: true })
      .limit(20),
    "load factory order candidates"
  );

  for (const order of candidateOrders ?? []) {
    const items = await must(
      supabase
        .from("purchase_order_item")
        .select("id,color")
        .eq("purchase_order_id", order.id)
        .order("line_no", { ascending: true })
        .limit(10),
      `load items for ${order.order_no}`
    );

    for (const item of items ?? []) {
      const containers = await must(
        supabase
          .from("purchase_order_container")
          .select("container_number", { count: "exact" })
          .eq("purchase_order_item_id", item.id)
          .neq("container_status", "CANCELLED")
          .not("container_number", "is", null)
          .order("container_number", { ascending: true })
          .limit(20),
        `load containers for ${order.order_no}`
      );

      const firstPageContainerNumbers = (containers ?? [])
        .map((row) => row.container_number)
        .filter((value): value is string => Boolean(value))
        .slice(0, 2);
      const totalActiveContainers = (containers as typeof containers & { length: number })?.length ?? 0;

      const countResult = await supabase
        .from("purchase_order_container")
        .select("id", { count: "exact", head: true })
        .eq("purchase_order_item_id", item.id)
        .neq("container_status", "CANCELLED")
        .not("container_number", "is", null);
      if (countResult.error) {
        throw new Error(`count active containers for ${order.order_no}: ${countResult.error.message}`);
      }
      const exactCount = countResult.count ?? totalActiveContainers;

      if (firstPageContainerNumbers.length >= 2 && exactCount >= 20) {
        return {
          orderId: order.id,
          orderNo: order.order_no,
          itemId: item.id,
          itemColor: item.color ?? null,
          totalActiveContainers: exactCount,
          firstPageContainerNumbers,
        };
      }
    }
  }

  throw new Error("Could not find a seeded FACTORY_ORDER fixture with at least 20 active numbered containers.");
}

async function findInternalNumberingOwnerLabel() {
  const owner = await must(
    supabase
      .from("container_owners")
      .select("container_owner_code, legal_company_name, company_name")
      .eq("uses_internal_container_numbering", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .single(),
    "load internal-numbering owner"
  );

  return [owner.container_owner_code, owner.legal_company_name ?? owner.company_name]
    .filter(Boolean)
    .join(" · ");
}

async function fetchOrderStatus(orderNo: string) {
  const row = await must(
    supabase.from("purchase_order").select("order_status").eq("order_no", orderNo).single(),
    `load order status for ${orderNo}`
  );
  return row.order_status;
}

async function fetchContainerSnapshot(containerNumber: string) {
  return must(
    supabase
      .from("purchase_order_container")
      .select("tare_weight, maximum_weight, color")
      .eq("container_number", containerNumber)
      .single(),
    `load container snapshot for ${containerNumber}`
  );
}

async function fetchSeedOrderTemplate(
  purchaseType: "FACTORY_ORDER" | "USED_CONTAINER" | "NEW_CONTAINER" = "USED_CONTAINER"
): Promise<SeedOrderTemplate> {
  const order = await must(
    supabase
      .from("purchase_order")
      .select("id,purchase_type,supplier_id,owner_id,buyer_id")
      .eq("purchase_type", purchaseType)
      .limit(1)
      .single(),
    `load ${purchaseType} order template`
  );

  const item = await must(
    supabase
      .from("purchase_order_item")
      .select(
        "location_city_id,depot_id,container_size_code_id,container_type_code_id,container_condition_code_id,color,flp,lbx,locking_bars_count,vents_count,machine_type,yom,planned_pod,tare_weight,maximum_weight,csc_number"
      )
      .eq("purchase_order_id", order.id)
      .limit(1)
      .single(),
    `load ${purchaseType} item template`
  );

  return {
    purchaseType: order.purchase_type,
    supplierId: order.supplier_id,
    ownerId: order.owner_id,
    buyerId: order.buyer_id,
    item: {
      locationCityId: item.location_city_id,
      depotId: item.depot_id,
      containerSizeCodeId: item.container_size_code_id,
      containerTypeCodeId: item.container_type_code_id,
      containerConditionCodeId: item.container_condition_code_id,
      color: item.color,
      flp: item.flp,
      lbx: item.lbx,
      lockingBarsCount: item.locking_bars_count,
      ventsCount: item.vents_count,
      machineType: item.machine_type,
      yom: item.yom,
      plannedPod: item.planned_pod,
      tareWeight: item.tare_weight,
      maximumWeight: item.maximum_weight,
      cscNumber: item.csc_number,
    },
  };
}

async function seedOrderWithItem(status: "DRAFT" | "SUBMITTED") {
  const template = await fetchSeedOrderTemplate(status === "DRAFT" ? "USED_CONTAINER" : "FACTORY_ORDER");
  const orderNo = `POE2E${Date.now()}`;
  const purchaseDate = new Date().toISOString().slice(0, 10);

  const order = await must(
    supabase
      .from("purchase_order")
      .insert({
        order_no: orderNo,
        purchase_type: template.purchaseType,
        supplier_id: template.supplierId,
        owner_id: template.ownerId,
        buyer_id: template.buyerId,
        purchase_date: purchaseDate,
        order_status: status,
        payment_mode: "PREPAYMENT",
        remark: `E2E ${status}`,
      })
      .select("id,order_no")
      .single(),
    `seed ${status} order`
  );

  await must(
    supabase.from("purchase_order_item").insert({
      purchase_order_id: order.id,
      line_no: 1,
      location_city_id: template.item.locationCityId,
      depot_id: template.item.depotId,
      container_size_code_id: template.item.containerSizeCodeId,
      container_type_code_id: template.item.containerTypeCodeId,
      container_condition_code_id: template.item.containerConditionCodeId,
      color: template.item.color,
      flp: template.item.flp,
      lbx: template.item.lbx,
      locking_bars_count: template.item.lockingBarsCount,
      vents_count: template.item.ventsCount,
      machine_type: template.item.machineType,
      yom: template.item.yom,
      planned_pod: template.item.plannedPod,
      tare_weight: template.item.tareWeight,
      maximum_weight: template.item.maximumWeight,
      csc_number: template.item.cscNumber,
      planned_qty: 1,
      unit_price: 123,
      settlement_price: 123,
      line_amount: 123,
    }),
    `seed ${status} item`
  );

  return { orderId: order.id, orderNo: order.order_no };
}

async function chooseAlternativeColor(page: Page, currentColor: string | null) {
  await page.getByTestId("purchase-item-0-color").click();
  const options = page.getByRole("option");
  const count = await options.count();
  for (let index = 0; index < count; index += 1) {
    const text = (await options.nth(index).textContent())?.trim() ?? "";
    if (text && text !== currentColor) {
      await options.nth(index).click();
      return text;
    }
  }
  throw new Error("Could not find an alternate color option for factory order regression.");
}

test.describe.serial("Purchase browser regression", () => {
  let factoryFixture: FactoryOrderFixture;
  let internalOwnerLabel = "";
  let draftedOrder: { orderId: string; orderNo: string } | null = null;
  let submittedOrder: { orderId: string; orderNo: string } | null = null;

  test.beforeAll(async () => {
    factoryFixture = await findFactoryOrderFixture();
    internalOwnerLabel = await findInternalNumberingOwnerLabel();
  });

  test("PO Management loads with filters and list actions", async ({ page }) => {
    await page.goto("/purchase/po-management");

    await expect(page.getByRole("heading", { name: "PO Management" }).first()).toBeVisible();
    await expect(page.getByPlaceholder(/Vendor code or name/i)).toBeVisible();
    await expect(page.getByPlaceholder(/City code or name/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Search", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /View/i }).first()).toBeVisible();
  });

  test("PO detail loads from management and item container drill-down works", async ({ page }) => {
    await page.goto("/purchase/po-management");

    const firstViewLink = page.getByRole("link", { name: /View/i }).first();
    await expect(firstViewLink).toBeVisible();
    await firstViewLink.click();

    await waitForDetailPage(page);
    await expect(page.getByText("Finance Status")).toBeVisible();

    const viewContainersLink = page.getByRole("link", { name: /View Containers/i }).first();
    await expect(viewContainersLink).toBeVisible();
    await viewContainersLink.click();

    await expect(page.getByRole("heading", { name: "Container Details" })).toBeVisible();
    await expect(page.getByText(/Page 1 of/i)).toBeVisible();
  });

  test("Create Purchase Order page loads with draft actions", async ({ page }) => {
    await page.goto("/purchase/po-management/new");
    await expect(page.getByRole("heading", { name: "Create Purchase Order" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save Draft" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Line" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Cancel" })).toBeVisible();
  });

  test("Edit Purchase Order page loads and basic item actions render", async ({ page }) => {
    await page.goto(`/purchase/po-management/${factoryFixture.orderId}/edit`);
    await expect(page.getByRole("heading", { name: "Edit Purchase Order" })).toBeVisible();
    await expect(page.getByTestId("purchase-item-0-edit")).toBeVisible();
    await expect(page.getByRole("link", { name: "Cancel" })).toBeVisible();
  });

  test("Edit with item/container flow covers pagination, bulk update, and propagation", async ({ page }) => {
    test.fixme(true, "TODO M6: restore advanced edit + paginated container + bulk update browser regression.");
    await page.goto(`/purchase/po-management/${factoryFixture.orderId}/edit`);
    await expect(page.getByRole("heading", { name: "Edit Purchase Order" })).toBeVisible();

    const newPlannedPod = `M6-POD-${Date.now()}`;
    await setInputCellValue(page, "purchase-item-0-planned-pod", newPlannedPod);

    const selectedColor = await chooseAlternativeColor(page, factoryFixture.itemColor);

    const editButton = page.getByTestId("purchase-item-0-edit");
    await editButton.click();
    await expect(page.getByText(/Containers for line 1:/)).toBeVisible();
    await editButton.click();
    await expect(page.getByText(/Containers for line 1:/)).toHaveCount(0);
    await editButton.click();
    await expect(page.getByText(/Containers for line 1:/)).toBeVisible();

    await expect(page.getByText(/Page 1 of/i)).toBeVisible();
    await page.getByTestId("purchase-item-0-container-page-size").click();
    await page.getByRole("option", { name: "10" }).click();
    await expect(page.getByText("Page 1 of")).toBeVisible();
    await expect(page.getByText(/Showing 1-10 of/i)).toBeVisible();

    const firstColorCell = page.locator("div", { hasText: selectedColor }).first();
    await expect(firstColorCell).toBeVisible();

    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("Page 2 of")).toBeVisible();
    await page.getByRole("button", { name: "Previous" }).click();
    await expect(page.getByText("Page 1 of")).toBeVisible();

    await page.getByTestId("purchase-item-0-bulk-update").click();
    await expect(page.getByRole("heading", { name: "Excel Bulk Update - Containers" })).toBeVisible();

    const bulkPayload = [
      "Container Number\tTare Weight\tMaximum Weight",
      `${factoryFixture.firstPageContainerNumbers[0]}\t4321\t5432`,
      `${factoryFixture.firstPageContainerNumbers[1]}\t4321\t5432`,
    ].join("\n");
    await page
      .getByPlaceholder("Paste container updates from Excel...")
      .fill(bulkPayload);
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByRole("heading", { name: "Excel Bulk Update - Containers" })).toHaveCount(0);
    const saveChangesButton = page.getByRole("button", { name: "Save Changes" });
    await saveChangesButton.scrollIntoViewIfNeeded();

    await Promise.all([
      page.waitForURL(new RegExp(`/purchase/po-management/${factoryFixture.orderId}$`)),
      saveChangesButton.click(),
    ]);

    await waitForDetailPage(page);
    await expect(page.getByText(newPlannedPod)).toBeVisible();
    await expect(page.getByText(selectedColor)).toBeVisible();

    for (const containerNumber of factoryFixture.firstPageContainerNumbers) {
      await expect.poll(async () => fetchContainerSnapshot(containerNumber)).toEqual({
        tare_weight: 4321,
        maximum_weight: 5432,
        color: selectedColor,
      });
    }
  });

  test("Cancel flow marks the submitted PO as CANCELLED and reflects in management", async ({ page }) => {
    test.fixme(true, "TODO M6: restore create/submit/cancel browser regression with stable deterministic setup.");
    test.skip(!submittedOrder, "Submit regression did not produce an order to cancel.");

    await page.goto(`/purchase/po-management/${submittedOrder!.orderId}`);
    await waitForDetailPage(page);

    const cancelButton = page.getByRole("button", { name: "Cancel Entire PO" });
    await cancelButton.scrollIntoViewIfNeeded();
    await cancelButton.click();
    await expect(page.getByText("CANCELLED")).toBeVisible();
    await expect.poll(async () => fetchOrderStatus(submittedOrder!.orderNo)).toBe("CANCELLED");

    await page.goto("/purchase/po-management");
    const row = page.locator("tr", { hasText: submittedOrder!.orderNo }).first();
    await expect(row).toBeVisible();
    await expect(row.getByText("CANCELLED")).toBeVisible();
  });
});
