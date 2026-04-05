import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export const FORM_ACTION_BAR_CLASS =
  "sticky bottom-0 z-30 mt-2 rounded-xl border border-border bg-background/95 shadow-[0_-12px_20px_-16px_hsl(var(--foreground)/0.28)] backdrop-blur supports-[backdrop-filter]:bg-background/90";
export const FORM_ACTION_BAR_LEFT_CLASS = "flex items-center gap-2";
export const FORM_ACTION_BAR_RIGHT_CLASS = "flex items-center gap-2 justify-end";

export function FormActionBar({
  leftActions,
  rightActions,
  className,
  contentClassName,
}: {
  leftActions?: ReactNode;
  rightActions?: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <div className={cn(FORM_ACTION_BAR_CLASS, className)}>
      <div
        className={cn(
          "flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center",
          leftActions ? "sm:justify-between" : "sm:justify-end",
          contentClassName
        )}
      >
        {leftActions ? <div className={FORM_ACTION_BAR_LEFT_CLASS}>{leftActions}</div> : null}
        <div className={FORM_ACTION_BAR_RIGHT_CLASS}>{rightActions}</div>
      </div>
    </div>
  );
}
