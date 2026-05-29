import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { push, getDepotDispatchSummary, exportDepotDispatchSummary, getVendorReleaseSelectorRows, toast } =
  vi.hoisted(() => ({
    push: vi.fn(),
    getDepotDispatchSummary: vi.fn(),
    exportDepotDispatchSummary: vi.fn(),
    getVendorReleaseSelectorRows: vi.fn(),
    toast: vi.fn(),
  }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock("lucide-react", () => {
  const Icon = (props: { className?: string }) => <span data-testid="icon" className={props.className} />;
  return {
    Check: Icon,
    ChevronDown: Icon,
    ChevronUp: Icon,
    Download: Icon,
    RotateCcw: Icon,
    Search: Icon,
    X: Icon,
  };
});

vi.mock("@/hooks/use-toast", () => ({
  toast: (...args: unknown[]) => toast(...args),
}));

vi.mock("@/app/depot-inventory/actions", () => ({
  getDepotDispatchSummary: (...args: unknown[]) => getDepotDispatchSummary(...args),
  exportDepotDispatchSummary: (...args: unknown[]) => exportDepotDispatchSummary(...args),
  getVendorReleaseSelectorRows: (...args: unknown[]) => getVendorReleaseSelectorRows(...args),
}));

import { DepotDispatchSummaryDashboard } from "@/components/depot-inventory/depot-dispatch-summary-dashboard";

describe("DepotDispatchSummaryDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDepotDispatchSummary.mockResolvedValue({
      rows: [],
      totalCount: 0,
      page: 1,
      pageSize: 20,
      filters: {
        region: "",
        city: "",
        depot: "",
        owner: "",
        sizeType: "",
        condition: "CW",
        color: "",
        machineType: "",
        page: 1,
        pageSize: 20,
      },
    });
  });

  it("submits the search when Enter is pressed on the condition trigger", async () => {
    const user = userEvent.setup();

    render(
      <DepotDispatchSummaryDashboard
        initial={{
          rows: [],
          totalCount: 0,
          page: 1,
          pageSize: 20,
          filters: {
            region: "",
            city: "",
            depot: "",
            owner: "",
            sizeType: "",
            condition: "CW",
            color: "",
            machineType: "",
            page: 1,
            pageSize: 20,
          },
        }}
        filterOptions={{
          regions: [],
          locations: [],
          depots: [],
          owners: [],
          suppliers: [],
          purchaseOrders: [],
          releases: [],
          colors: [],
          containerNumbers: [],
          sizeTypes: [],
          machineTypes: [],
          conditionCodes: ["CW", "IICL"],
        }}
      />
    );

    const trigger = screen
      .getAllByRole("combobox")
      .find((element) => element.tagName === "BUTTON" && element.textContent?.includes("CW"));
    expect(trigger).toBeTruthy();
    trigger!.focus();
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(getDepotDispatchSummary).toHaveBeenCalledWith(
        expect.objectContaining({
          condition: "CW",
          page: 1,
        })
      );
    });
  });

  it("disables release when a bucket has no source and no plannable quantity", () => {
    render(
      <DepotDispatchSummaryDashboard
        initial={{
          rows: [
            {
              id: "bucket-1",
              region: "CNSHK",
              city: "CNSHK · Shekou",
              depot: "CNSHKVDP · vendor depot",
              sizeType: "40HQ",
              condition: "CW",
              color: "-",
              machineType: "-",
              hasFactoryOrder: false,
              hasNewOrUsedPurchase: false,
              depotInventoryQty: 0,
              pendingOutboundQty: 0,
              availableDepotQty: 0,
              plannedDispatchQty: 10,
              plannableDepotQty: 0,
              pendingOfflineQty: 0,
              totalPlannableQty: 0,
              totalAvailableQty: 0,
              earliestEstimatedOfflineDate: null,
              earliestFreedayExpiryDate: null,
              shortageAlert: true,
            },
          ],
          totalCount: 1,
          page: 1,
          pageSize: 20,
          filters: {
            region: "",
            city: "",
            depot: "",
            owner: "",
            sizeType: "",
            condition: "",
            color: "",
            machineType: "",
            page: 1,
            pageSize: 20,
          },
        }}
        filterOptions={{
          regions: [],
          locations: [],
          depots: [],
          owners: [],
          suppliers: [],
          purchaseOrders: [],
          releases: [],
          colors: [],
          containerNumbers: [],
          sizeTypes: [],
          machineTypes: [],
          conditionCodes: ["CW"],
        }}
      />
    );

    const releaseButtons = screen.getAllByRole("button", { name: "Release" });
    expect(releaseButtons[0]).toBeDisabled();
  });
});
