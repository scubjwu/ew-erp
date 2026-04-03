import type { MaterialCategory } from "@/types/material-vendor";
import { MATERIAL_CATEGORY_CODE_PREFIX } from "@/types/material-vendor";

export function prefixForMaterialCategory(category: MaterialCategory) {
  return MATERIAL_CATEGORY_CODE_PREFIX[category];
}

export function formatMaterialVendorCode(category: MaterialCategory, sequence: number) {
  return `${prefixForMaterialCategory(category)}${String(sequence).padStart(4, "0")}`;
}
