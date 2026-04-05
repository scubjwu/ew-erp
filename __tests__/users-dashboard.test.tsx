import type { MouseEvent, ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { usersActions, toast, anchorClick } = vi.hoisted(() => ({
  usersActions: {
    exportUsers: vi.fn(),
    getUsers: vi.fn(),
  },
  toast: vi.fn(),
  anchorClick: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    onClick,
    ...rest
  }: {
    children: ReactNode;
    href: string;
    onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
  } & Record<string, unknown>) => (
    <a href={href} onClick={onClick} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("lucide-react", () => {
  const Icon = (props: { className?: string }) => (
    <span data-testid="lucide-mock-icon" className={props.className} />
  );
  return {
    ArrowDown: Icon,
    ArrowUp: Icon,
    ArrowUpDown: Icon,
    ChevronUp: Icon,
    Download: Icon,
    Eye: Icon,
    Pencil: Icon,
    Plus: Icon,
    RotateCcw: Icon,
    Search: Icon,
    ChevronDown: Icon,
    Check: Icon,
  };
});

vi.mock("@/hooks/use-toast", () => ({
  toast: (...args: unknown[]) => toast(...args),
}));

vi.mock("@/app/settings/users/actions", () => usersActions);

import { ACTIONS_STICKY_CELL_CLASS } from "@/components/shared/page-standard/table-standard";
import { UsersDashboard } from "@/components/settings/users-dashboard";
import type { SystemUser } from "@/types/system-user";

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

function usersResult(
  overrides?: Partial<Parameters<typeof UsersDashboard>[0]["initial"]>
): Parameters<typeof UsersDashboard>[0]["initial"] {
  return {
    rows: [
      {
        id: "user-1",
        user_code: "QA0001",
        full_name: "Alice Example",
        email: "alice@example.com",
        role: "Admin",
        status: "Active",
        phone: "123456",
        department: "IT",
        job_title: "Manager",
        last_login_at: "2026-04-01T00:00:00Z",
        created_at: "2026-04-01T00:00:00Z",
        updated_at: "2026-04-01T00:00:00Z",
        remarks: null,
      },
    ] as SystemUser[],
    totalCount: 1,
    page: 1,
    pageSize: 10,
    filters: {
      userCode: "",
      fullName: "",
      role: "",
      status: "",
    },
    sort: {
      sortBy: "userCode",
      sortDirection: "asc",
    },
    ...overrides,
  };
}

const filterOptions = {
  userCodes: [
    {
      value: "QA0001",
      label: "QA0001",
      secondaryLabel: "Alice Example",
      searchText: "QA0001 Alice Example",
    },
  ],
  fullNames: [
    {
      value: "Alice Example",
      label: "Alice Example",
      secondaryLabel: "QA0001",
      searchText: "Alice Example QA0001",
    },
  ],
};

describe("UsersDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installDownloadMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("supports autocomplete-assisted free text search on enter", async () => {
    const user = userEvent.setup();
    usersActions.getUsers.mockResolvedValueOnce(
      usersResult({
        filters: {
          userCode: "QA9999",
          fullName: "",
          role: "",
          status: "",
        },
      })
    );

    render(
      <UsersDashboard
        initial={usersResult()}
        pageSize={10}
        roleOptions={["Admin", "Sales"]}
        statusOptions={["Active", "Inactive"]}
        filterOptions={filterOptions}
      />
    );

    const input = screen.getByRole("combobox", { name: "User Code" });
    await user.clear(input);
    await user.type(input, "QA9999{Enter}");

    await waitFor(() =>
      expect(usersActions.getUsers).toHaveBeenCalledWith({
        userCode: "QA9999",
        fullName: "",
        role: "",
        status: "",
        sortBy: "userCode",
        sortDirection: "asc",
        page: 1,
        pageSize: 10,
      })
    );
  });

  it("sorts visible columns and exports with applied filters and sort", async () => {
    const user = userEvent.setup();
    usersActions.getUsers.mockResolvedValueOnce(
      usersResult({
        sort: { sortBy: "status", sortDirection: "asc" },
      })
    );
    usersActions.exportUsers.mockResolvedValue(usersResult().rows);

    render(
      <UsersDashboard
        initial={usersResult()}
        pageSize={10}
        roleOptions={["Admin", "Sales"]}
        statusOptions={["Active", "Inactive"]}
        filterOptions={filterOptions}
      />
    );

    await user.click(screen.getByRole("button", { name: /^Status$/i }));
    await waitFor(() =>
      expect(usersActions.getUsers).toHaveBeenCalledWith({
        userCode: "",
        fullName: "",
        role: "",
        status: "",
        sortBy: "status",
        sortDirection: "asc",
        page: 1,
        pageSize: 10,
      })
    );

    await user.click(screen.getByRole("button", { name: /Export CSV/i }));
    await waitFor(() =>
      expect(usersActions.exportUsers).toHaveBeenCalledWith({
        userCode: "",
        fullName: "",
        role: "",
        status: "",
        sortBy: "status",
        sortDirection: "asc",
      })
    );

    expect(anchorClick).toHaveBeenCalled();
    expect(screen.getByRole("link", { name: /View/i }).closest("td")).toHaveClass(
      ACTIONS_STICKY_CELL_CLASS.split(" ")[0]
    );
  });
});
