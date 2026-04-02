export type PartnerSectionSlug =
  | "customers"
  | "vendors"
  | "lessee"
  | "lessor"
  | "material-vendors"
  | "container-owners";

export type PartnerSectionMeta = {
  slug: PartnerSectionSlug;
  title: string;
  description: string;
  href: string;
  countLabel: string;
  tableName?: string;
};

export type PartnerSectionOverview = PartnerSectionMeta & {
  totalCount: number | null;
  available: boolean;
  errorMessage?: string;
};

export const PARTNER_SECTIONS: readonly PartnerSectionMeta[] = [
  {
    slug: "customers",
    title: "Customers",
    description:
      "Maintain customer companies, commercial profiles, credit controls, and depot relationships.",
    href: "/partners/customers",
    countLabel: "managed customers",
    tableName: "customers",
  },
  {
    slug: "vendors",
    title: "Vendors",
    description:
      "Vendor workflow is not currently backed by an active master-data table.",
    href: "/partners/vendors",
    countLabel: "managed vendors",
  },
  {
    slug: "lessee",
    title: "Lessee",
    description:
      "Maintain lessee counterparties for lease-out operations and commercial management.",
    href: "/partners/lessee",
    countLabel: "managed lessees",
  },
  {
    slug: "lessor",
    title: "Lessor",
    description:
      "Maintain lessor counterparties that provide leased equipment and related terms.",
    href: "/partners/lessor",
    countLabel: "managed lessors",
  },
  {
    slug: "material-vendors",
    title: "Material Vendors",
    description:
      "Maintain material supply partners used for repair, refurbishment, and operating support.",
    href: "/partners/material-vendors",
    countLabel: "managed material vendors",
  },
  {
    slug: "container-owners",
    title: "Container Owners",
    description:
      "Maintain ownership counterparties and principals connected to container assets.",
    href: "/partners/container-owners",
    countLabel: "managed container owners",
  },
] as const;

export function getPartnerSection(
  slug: string
): PartnerSectionMeta | undefined {
  return PARTNER_SECTIONS.find((section) => section.slug === slug);
}
