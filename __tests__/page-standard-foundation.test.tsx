import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  AutocompleteFilterInput,
  type AutocompleteFilterOption,
} from "@/components/shared/page-standard/autocomplete-filter-input";
import {
  FormActionBar,
  FORM_ACTION_BAR_CLASS,
} from "@/components/shared/page-standard/form-action-bar";
import { StandardSearchToolbar } from "@/components/shared/page-standard/standard-search-toolbar";
import { StandardTablePagination } from "@/components/shared/page-standard/standard-table-pagination";
import {
  ACTIONS_STICKY_CELL_CLASS,
  ACTIONS_STICKY_HEAD_CLASS,
  type SortableColumnConfig,
} from "@/components/shared/page-standard/table-standard";

function AutocompleteHarness({
  options,
}: {
  options: AutocompleteFilterOption[];
}) {
  const [value, setValue] = React.useState("");
  const [inputValue, setInputValue] = React.useState("");

  return (
    <AutocompleteFilterInput
      label="Vendor"
      placeholder="Search vendor"
      options={options}
      value={value}
      inputValue={inputValue}
      onInputChange={setInputValue}
      onSelect={(option) => {
        setValue(option?.value ?? "");
        setInputValue(option?.label ?? "");
      }}
      onClear={() => {
        setValue("");
        setInputValue("");
      }}
    />
  );
}

describe("page standard foundation", () => {
  it("filters autocomplete options and supports keyboard selection", async () => {
    const user = userEvent.setup();
    render(
      <AutocompleteHarness
        options={[
          {
            value: "S00001",
            label: "S00001",
            secondaryLabel: "Vendor One",
            searchText: "S00001 Vendor One",
          },
          {
            value: "S00002",
            label: "S00002",
            secondaryLabel: "Vendor Two",
            searchText: "S00002 Vendor Two",
          },
        ]}
      />
    );

    const input = screen.getByRole("combobox", { name: "Vendor" });
    await user.click(input);
    await user.type(input, "two");

    expect(screen.getByRole("option", { name: /S00002/i })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /S00001/i })).not.toBeInTheDocument();

    await user.keyboard("{ArrowDown}{Enter}");

    expect(input).toHaveValue("S00002");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("keeps free text input and closes on escape without forcing selection", async () => {
    const user = userEvent.setup();
    render(
      <AutocompleteHarness
        options={[
          {
            value: "SHA",
            label: "SHA",
            secondaryLabel: "Shanghai",
            searchText: "SHA Shanghai",
          },
        ]}
      />
    );

    const input = screen.getByRole("combobox", { name: "Vendor" });
    await user.click(input);
    await user.type(input, "freeform");
    await user.keyboard("{Escape}");

    expect(input).toHaveValue("freeform");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("submits search toolbar on enter", () => {
    const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
    });

    render(
      <StandardSearchToolbar
        onSubmit={onSubmit}
        primaryActions={<button type="submit">Search</button>}
      >
        <input aria-label="Search term" />
      </StandardSearchToolbar>
    );

    const input = screen.getByLabelText("Search term");
    fireEvent.submit(input.closest("form") as HTMLFormElement);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
  });

  it("renders form action bar slots with sticky class", () => {
    render(
      <FormActionBar
        leftActions={<button type="button">Cancel</button>}
        rightActions={<button type="submit">Save</button>}
      />
    );

    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" }).closest(`.${FORM_ACTION_BAR_CLASS.split(" ")[0]}`)).toBeTruthy();
  });

  it("renders a shared table pagination footer", async () => {
    const user = userEvent.setup();
    const onPrevious = vi.fn();
    const onNext = vi.fn();

    render(
      <StandardTablePagination
        summary="Showing 1-20 of 48 rows"
        page={1}
        totalPages={3}
        onPrevious={onPrevious}
        onNext={onNext}
        previousDisabled
      />
    );

    expect(screen.getByText("Showing 1-20 of 48 rows")).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
  });

  it("exposes reusable sticky action classes and sortable column contract", () => {
    const columns: Array<SortableColumnConfig<"vendorCode">> = [
      {
        key: "vendorCode",
        label: "Vendor Code",
        sortable: true,
        sortKey: "vendorCode",
        align: "left",
        kind: "data",
      },
      {
        key: "actions",
        label: "Actions",
        sortable: false,
        sticky: "actions",
        kind: "actions",
      },
    ];

    expect(columns[0].sortKey).toBe("vendorCode");
    expect(columns[1].kind).toBe("actions");
    expect(ACTIONS_STICKY_HEAD_CLASS).toContain("sticky right-0");
    expect(ACTIONS_STICKY_CELL_CLASS).toContain("sticky right-0");
  });
});
