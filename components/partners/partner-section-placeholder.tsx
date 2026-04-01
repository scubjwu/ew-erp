import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type PartnerSectionPlaceholderProps = {
  title: string;
  description: string;
};

export function PartnerSectionPlaceholder({
  title,
  description,
}: PartnerSectionPlaceholderProps) {
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-6 py-6 sm:px-8">
      <section className="rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.04),_transparent_40%),linear-gradient(135deg,_#ffffff_0%,_#f8fbff_55%,_#f3f7fb_100%)] px-8 py-8 shadow-sm">
        <div className="space-y-4">
          <div className="inline-flex items-center rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-500 shadow-sm">
            Partners
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              {title}
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
              {description}
            </p>
          </div>
        </div>
      </section>

      <Card className="border-slate-200 bg-white/95">
        <CardContent className="flex flex-col gap-4 p-6">
          <h2 className="text-lg font-semibold text-slate-950">
            Module scaffold ready
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            This partner module has been added to the new Partners structure.
            The detailed list, filters, and forms can now be implemented on top
            of this route without changing the navigation again.
          </p>
          <div>
            <Button asChild variant="outline">
              <Link href="/partners">Back to Partners Center</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
