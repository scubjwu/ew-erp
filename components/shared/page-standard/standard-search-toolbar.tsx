import type { FormEventHandler, ReactNode } from "react";

import { cn } from "@/lib/utils";

export function StandardSearchToolbar({
  children,
  onSubmit,
  primaryActions,
  className,
  fieldsClassName,
  actionsClassName,
}: {
  children: ReactNode;
  onSubmit: FormEventHandler<HTMLFormElement>;
  primaryActions?: ReactNode;
  className?: string;
  fieldsClassName?: string;
  actionsClassName?: string;
}) {
  return (
    <form
      className={cn("rounded-xl border bg-card p-4 shadow-sm", className)}
      onSubmit={onSubmit}
    >
      <div
        className={cn(
          "grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]",
          fieldsClassName
        )}
      >
        {children}
      </div>
      {primaryActions ? (
        <div
          className={cn(
            "mt-3 flex flex-wrap items-center justify-end gap-2",
            actionsClassName
          )}
        >
            {primaryActions}
        </div>
      ) : null}
    </form>
  );
}
