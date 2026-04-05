import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { regionsActions, toast, anchorClick } = vi.hoisted(() => ({
  regionsActions: {
    exportRegionCodes: vi.fn(),
    getRegionCodes: vi.fn(),
  },
  toast: vi.fn(),
  anchorClick: vi.fn(),
}));

vi.mock("lucide-react", () => {
  const Icon = (props: { className?: string }) => (
    <span data-testid="lucide-mock-icon" className={props.className} />
  );
  return {
    ArrowDown: Icon,
    ArrowUp: Icon,
    ArrowUpDown: Icon,
    Download: Icon,
    Pencil: Icon,
    Plus: Icon,
    RotateCcw: Icon,
    Search: Icon,
  };
});

vi.mock("@/hooks/use-toast", () => ({
  toast: (...args: unknown[]) => toast(...args),
}));

vi.mock("@/components/basic-info/region-code-form-dialog", () => ({
  RegionCodeFormDialog: () => null,
}));
vi.mock("@/components/basic-info/region-code-view-dialog", () => ({
  RegionCodeViewDialog: () => null,
}));

vi.mock("@/app/basic-info/regions/actions", () => regionsActions);

import { ACTIONS_STICKY_CELL_CLASS } from "@/components/shared/page-standard/table-standard";
import { RegionCodesDashboard } from "@/components/basic-info/region-codes-dashboard";
import type { RegionCode } from "@/types/region-code";

function installDownloadMocks() {
  const originalCreateElement = document.createElement.bind(document);
  if (!("createObjectURL" in URL)) {
    Object.defineProperty(URL, "createObjectURL", {
      writable: true,
      value: vi.fn(() => "blob:mock"),
    });
  } else {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock");
  }
  if (!("revokeObjectURL" in URL)) {
    Object.defineProperty(URL, "revokeObjectURL", {
      writable: true,
      value: vi.fn(() => {}),
    });
  } else {
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  }
  vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
    if (tagName.toLowerCase() === "a") {
      const anchor = originalCreateElement(tagName) as HTMLAnchorElement;
      vi.spyOn(anchor, "click").mockImplementation(() => {
        anchorClick();
      });
      return anchor;
    }
    return originalCreateElement(tagName);
  });
}

function regionResult(
  overrides?: Partial<Parameters<typeof RegionCodesDashboard>[0]["initial"]>
): Parameters<typeof RegionCodesDashboard>[0]["initial"] {
  return {
    rows: [
      {
        id: "region-1",
        region_code: "CN",
        region_name: "China",
        description: null,
        status: "ACTIVE",
        created_by: "tester",
        updated_by: null,
        created_at: "2026-04-01T00:00:00Z",
        updated_at: "2026-04-01T00:00:00Z",
      },
    ] as RegionCode[],
    totalCount: 1,
    page: 1,
    pageSize: 10,
    filters: { q: "" },
    sort: {
      sortBy: "regionCode",
      sortDirection: "asc",
    },
    ...overrides,
  };
}

const filterOptions = {
  regions: [
    {
      value: "CN",
      label: "CN",
      secondaryLabel: "China",
      searchText: "CN China",
    },
  ],
};

describe("RegionCodesDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installDownloadMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("supports autocomplete-assisted free text search on enter", async () => {
    const user = userEvent.setup();
    regionsActions.getRegionCodes.mockResolvedValueOnce(
      regionResult({
        filters: { q: "USA" },
      })
    );

    render(
      <RegionCodesDashboard initial={regionResult()} pageSize={10} filterOptions={filterOptions} />
    );

    const input = screen.getByRole("combobox", { name: "Region" });
    await user.clear(input);
    await user.type(input, "USA{Enter}");

    await waitFor(() =>
      expect(regionsActions.getRegionCodes).toHaveBeenCalledWith({
        q: "USA",
        sortBy: "regionCode",
        sortDirection: "asc",
        page: 1,
        pageSize: 10,
      })
    );
  });

  it("sorts visible columns and exports with applied filters and sort", async () => {
    const user = userEvent.setup();
    regionsActions.getRegionCodes.mockResolvedValueOnce(
      regionResult({
        sort: { sortBy: "createdAt", sortDirection: "asc" },
      })
    );
    regionsActions.exportRegionCodes.mockResolvedValue(regionResult().rows);

    render(
      <RegionCodesDashboard initial={regionResult()} pageSize={10} filterOptions={filterOptions} />
    );

    await user.click(screen.getByRole("button", { name: /Created At/i }));
    await waitFor(() =>
      expect(regionsActions.getRegionCodes).toHaveBeenCalledWith({
        q: "",
        sortBy: "createdAt",
        sortDirection: "asc",
        page: 1,
        pageSize: 10,
      })
    );

    await user.click(screen.getByRole("button", { name: /Export CSV/i }));
    await waitFor(() =>
      expect(regionsActions.exportRegionCodes).toHaveBeenCalledWith({
        q: "",
        sortBy: "createdAt",
        sortDirection: "asc",
      })
    );

    expect(anchorClick).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /View/i }).closest("td")).toHaveClass(
      ACTIONS_STICKY_CELL_CLASS.split(" ")[0]
    );
  });
});
