export type ColumnAlign = "left" | "center" | "right";

export type SortableColumnConfig<TSortKey extends string> = {
  key: string;
  label: string;
  sortable: boolean;
  sortKey?: TSortKey;
  align?: ColumnAlign;
  widthClass?: string;
  sticky?: "leading" | "actions";
  kind?: "data" | "actions";
};

export const ACTIONS_STICKY_HEAD_CLASS =
  "sticky right-0 z-30 w-[150px] min-w-[150px] bg-card border-l border-border shadow-[-12px_0_16px_-12px_hsl(var(--foreground)/0.24)]";

export const ACTIONS_STICKY_CELL_CLASS =
  "sticky right-0 z-20 w-[150px] min-w-[150px] bg-card border-l border-border shadow-[-12px_0_16px_-12px_hsl(var(--foreground)/0.18)]";

export function leadingStickyColumnClass(
  offset: string,
  kind: "head" | "cell",
  shadow = "shadow-[8px_0_12px_-12px_hsl(var(--foreground)/0.2)]"
) {
  const zIndex = kind === "head" ? "z-30" : "z-20";
  const baseShadow =
    kind === "head"
      ? shadow.replace("/0.2", "/0.28")
      : shadow;

  return `sticky ${offset} ${zIndex} bg-card border-r border-border ${baseShadow}`;
}
