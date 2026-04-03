import { notFound } from "next/navigation";

import {
  getLesseeById,
  getLesseePicOptions,
  getLesseeRegionOptions,
} from "@/app/partners/lessee/actions";
import { LesseeForm } from "@/components/lessees/lessee-form";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { id: string };
};

export default async function EditLesseePage({ params }: PageProps) {
  const [lessee, regionOptions, picOptions] = await Promise.all([
    getLesseeById(params.id),
    getLesseeRegionOptions(),
    getLesseePicOptions(),
  ]);

  if (!lessee) notFound();

  return (
    <LesseeForm
      key={`${lessee.id}:${lessee.updated_at}`}
      mode="edit"
      initialLessee={lessee}
      regionOptions={regionOptions}
      picOptions={picOptions}
    />
  );
}
