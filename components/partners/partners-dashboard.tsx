import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Boxes,
  Factory,
  Handshake,
  PackagePlus,
  Truck,
  Users,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type {
  PartnerSectionOverview,
  PartnerSectionSlug,
} from "@/types/partners";

type PartnersDashboardProps = {
  sections: PartnerSectionOverview[];
};

const SECTION_ICONS: Record<PartnerSectionSlug, LucideIcon> = {
  customers: Users,
  vendors: Truck,
  lessee: Handshake,
  lessor: Factory,
  "material-vendors": PackagePlus,
  "container-owners": Boxes,
};

function formatCount(value: number | null) {
  if (value === null) return "N/A";
  return new Intl.NumberFormat("en-US").format(value);
}

export function PartnersDashboard({ sections }: PartnersDashboardProps) {
  const availableCount = sections.filter((section) => section.available).length;

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-6 py-6 sm:px-8">
      <section className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.06),_transparent_42%),linear-gradient(135deg,_#ffffff_0%,_#f8fbff_55%,_#f3f7fb_100%)] px-8 py-8 shadow-sm">
        <div className="absolute inset-y-0 right-0 hidden w-[32%] bg-[radial-gradient(circle_at_center,_rgba(15,23,42,0.08),_transparent_68%)] lg:block" />
        <div className="relative grid gap-8 lg:grid-cols-[1.4fr,0.8fr]">
          <div className="space-y-4">
            <div className="inline-flex items-center rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-500 shadow-sm">
              Partners
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Partners Center
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                Manage your commercial counterparties, operating partners, and
                ownership-related entities from one consolidated workspace.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
              <div className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                Modules
              </div>
              <div className="mt-3 text-3xl font-semibold text-slate-950">
                {availableCount}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                active partner modules
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
              <div className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                Coverage
              </div>
              <div className="mt-3 text-3xl font-semibold text-slate-950">
                {sections.length}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                partner categories ready to use
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => {
          const Icon = SECTION_ICONS[section.slug];

          return (
            <Link key={section.slug} href={section.href} className="group block">
              <Card className="h-full border-slate-200 bg-white/95 transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/70">
                <CardContent className="flex h-full flex-col gap-5 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="grid min-w-0 grid-cols-[48px_minmax(0,1fr)] items-start gap-4">
                      <div className="mt-0.5 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 transition-colors group-hover:border-slate-300 group-hover:bg-slate-950 group-hover:text-white">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <h2 className="text-lg font-semibold text-slate-950">
                          {section.title}
                        </h2>
                        <p className="text-sm leading-6 text-slate-600">
                          {section.description}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-slate-600" />
                  </div>

                  <div className="mt-auto flex items-end justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4">
                    <div>
                      <div className="text-4xl font-semibold tracking-tight text-slate-950">
                        {formatCount(section.totalCount)}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        {section.countLabel}
                      </div>
                    </div>
                    <div className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400 transition-colors group-hover:text-slate-600">
                      Open
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
