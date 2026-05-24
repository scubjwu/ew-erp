import React, { createContext, useContext, type ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { toast } = vi.hoisted(() => ({
  toast: vi.fn(),
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: (...args: unknown[]) => toast(...args),
}));

const SelectContext = createContext<{ value?: string; onValueChange?: (value: string) => void } | null>(null);

vi.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: ReactNode;
    value?: string;
    onValueChange?: (value: string) => void;
  }) => (
    <SelectContext.Provider value={{ value, onValueChange }}>
      <div>{children}</div>
    </SelectContext.Provider>
  ),
  SelectTrigger: ({ children }: { children: ReactNode }) => <button type="button">{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => {
    const ctx = useContext(SelectContext);
    return <span>{ctx?.value || placeholder || ""}</span>;
  },
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => {
    const ctx = useContext(SelectContext);
    return (
      <button type="button" onClick={() => ctx?.onValueChange?.(value)}>
        {children}
      </button>
    );
  },
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import { PurchaseContainerBulkUpdateModal } from "@/components/purchase/purchase-container-bulk-update-modal";

describe("PurchaseContainerBulkUpdateModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("assigns number-only pasted container numbers into blank displayed rows in order", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();

    render(
      <PurchaseContainerBulkUpdateModal
        open
        onOpenChange={vi.fn()}
        itemKey="item-1"
        allowEstimatedOfflineDate={false}
        allowNumberOnlyAssignment
        allowedFields={["yom", "machineType"]}
        onResolveRows={vi.fn().mockResolvedValue([])}
        assignableRows={[
          { id: "row-1", itemKey: "item-1", containerNumber: null, persistedContainerNumber: null },
          { id: "row-2", itemKey: "item-1", containerNumber: "CIMU0000001", persistedContainerNumber: null },
        ]}
        itemRows={[
          { id: "row-1", itemKey: "item-1", containerNumber: null, persistedContainerNumber: null },
          { id: "row-2", itemKey: "item-1", containerNumber: "CIMU0000001", persistedContainerNumber: null },
          { id: "row-3", itemKey: "item-1", containerNumber: "MSCU1234567", persistedContainerNumber: "MSCU1234567" },
        ]}
        onApply={onApply}
      />
    );

    await user.type(
      screen.getByPlaceholderText("Paste container updates from Excel..."),
      "CIMU0597382{enter}CIMU0597084"
    );
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(onApply).toHaveBeenCalledWith([
      { id: "row-1", itemKey: "item-1", containerNumber: "CIMU0597382" },
      { id: "row-2", itemKey: "item-1", containerNumber: "CIMU0597084" },
    ]);
  });

  it("blocks number-only assignment when pasted numbers exceed blank displayed rows", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();

    render(
      <PurchaseContainerBulkUpdateModal
        open
        onOpenChange={vi.fn()}
        itemKey="item-1"
        allowEstimatedOfflineDate={false}
        allowNumberOnlyAssignment
        allowedFields={["yom", "machineType"]}
        onResolveRows={vi.fn().mockResolvedValue([])}
        assignableRows={[
          { id: "row-1", itemKey: "item-1", containerNumber: null, persistedContainerNumber: null },
        ]}
        itemRows={[
          { id: "row-1", itemKey: "item-1", containerNumber: null, persistedContainerNumber: null },
        ]}
        onApply={onApply}
      />
    );

    await user.type(
      screen.getByPlaceholderText("Paste container updates from Excel..."),
      "CIMU0597382{enter}CIMU0597084"
    );
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(onApply).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Some bulk update values are invalid.",
        variant: "destructive",
        description: "Pasted 2 container numbers, but only 1 blank container lines are available.",
      })
    );
  });

  it("rejects number-only assignment when pasted numbers collide with saved container rows", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();

    render(
      <PurchaseContainerBulkUpdateModal
        open
        onOpenChange={vi.fn()}
        itemKey="item-1"
        allowEstimatedOfflineDate={false}
        allowNumberOnlyAssignment
        allowedFields={["yom", "machineType"]}
        onResolveRows={vi.fn().mockResolvedValue([])}
        assignableRows={[
          { id: "row-1", itemKey: "item-1", containerNumber: null, persistedContainerNumber: null },
        ]}
        itemRows={[
          { id: "row-1", itemKey: "item-1", containerNumber: null, persistedContainerNumber: null },
          { id: "row-2", itemKey: "item-1", containerNumber: "MSCU1234567", persistedContainerNumber: "MSCU1234567" },
        ]}
        onApply={onApply}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("Paste container updates from Excel..."), {
      target: { value: "MSCU1234567" },
    });
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(onApply).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Some bulk update values are invalid.",
        variant: "destructive",
        description: "MSCU1234567: Container Number already exists on another line in this item.",
      })
    );
  });
});
