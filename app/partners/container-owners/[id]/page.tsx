import { notFound } from "next/navigation";

import {
  getContainerOwnerById,
  getContainerOwnerPicOptions,
  getContainerOwnerRegionOptions,
} from "@/app/partners/container-owners/actions";
import { ContainerOwnerForm } from "@/components/container-owners/container-owner-form";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ViewContainerOwnerPage({ params }: PageProps) {
  const { id } = await params;
  const [owner, regionOptions, picOptions] = await Promise.all([
    getContainerOwnerById(id),
    getContainerOwnerRegionOptions(),
    getContainerOwnerPicOptions(),
  ]);

  if (!owner) notFound();

  return (
    <ContainerOwnerForm
      key={`${owner.id}:${owner.updated_at}`}
      mode="view"
      initialContainerOwner={owner}
      regionOptions={regionOptions}
      picOptions={picOptions}
    />
  );
}
