import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  BASIC_INFO_SECTIONS,
  type BasicInfoSectionOverview,
} from "@/types/basic-info";

async function countTable(tableName: string): Promise<{
  totalCount: number | null;
  available: boolean;
  errorMessage?: string;
}> {
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

export async function getBasicInfoOverview(): Promise<
  BasicInfoSectionOverview[]
> {
  const counts = await Promise.all(
    BASIC_INFO_SECTIONS.map((section) => countTable(section.tableName))
  );

  return BASIC_INFO_SECTIONS.map((section, index) => ({
    ...section,
    ...counts[index],
  }));
}
