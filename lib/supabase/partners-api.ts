import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  PARTNER_SECTIONS,
  type PartnerSectionOverview,
} from "@/types/partners";

async function countTable(tableName?: string): Promise<{
  totalCount: number | null;
  available: boolean;
  errorMessage?: string;
}> {
  if (!tableName) {
    return {
      totalCount: 0,
      available: true,
    };
  }

  const supabase = createServerSupabaseClient();
  const { count, error } = await supabase
    .from(tableName)
    .select("*", { count: "exact", head: true });

  if (error) {
    return {
      totalCount: null,
      available: false,
      errorMessage: error.message,
    };
  }

  return {
    totalCount: count ?? 0,
    available: true,
  };
}

export async function getPartnersOverview(): Promise<PartnerSectionOverview[]> {
  const counts = await Promise.all(
    PARTNER_SECTIONS.map((section) => countTable(section.tableName))
  );

  return PARTNER_SECTIONS.map((section, index) => ({
    ...section,
    ...counts[index],
  }));
}
