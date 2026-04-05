import type { ReactNode } from "react";

export function StandardListPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>

      {actions ? (
        <div className="flex flex-wrap items-center justify-start gap-2 xl:justify-end">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
