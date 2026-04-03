import {
  getContainerOwnerPicOptions,
  getContainerOwnerRegionOptions,
} from "@/app/partners/container-owners/actions";
import { ContainerOwnerForm } from "@/components/container-owners/container-owner-form";

export const dynamic = "force-dynamic";

export default async function NewContainerOwnerPage() {
  const [regionOptions, picOptions] = await Promise.all([
    getContainerOwnerRegionOptions(),
    getContainerOwnerPicOptions(),
  ]);

  return (
    <ContainerOwnerForm
      mode="create"
      regionOptions={regionOptions}
      picOptions={picOptions}
    />
  );
}
