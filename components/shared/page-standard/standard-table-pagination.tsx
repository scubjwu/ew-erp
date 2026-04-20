import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

export function StandardTablePagination({
  leadingContent,
  summary,
  page,
  totalPages,
  onPrevious,
  onNext,
  previousDisabled,
  nextDisabled,
}: {
  leadingContent?: ReactNode;
  summary: ReactNode;
  page: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm text-muted-foreground">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span>Page {page} of {totalPages}</span>
          <span>({summary})</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={previousDisabled}
              onClick={onPrevious}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={nextDisabled}
              onClick={onNext}
            >
              Next
            </Button>
          </div>
        </div>
        {leadingContent ? <div className="flex items-center">{leadingContent}</div> : null}
      </div>
    </div>
  );
}
