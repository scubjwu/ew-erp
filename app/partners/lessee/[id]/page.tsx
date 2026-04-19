import { notFound } from "next/navigation";

import {
  getLesseeById,
  getLesseePicOptions,
  getLesseeRegionOptions,
} from "@/app/partners/lessee/actions";
import { LesseeForm } from "@/components/lessees/lessee-form";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ViewLesseePage({ params }: PageProps) {
  const { id } = await params;
  const [lessee, regionOptions, picOptions] = await Promise.all([
    getLesseeById(id),
    getLesseeRegionOptions(),
    getLesseePicOptions(),
  ]);

  if (!lessee) notFound();

  return (
    <LesseeForm
      key={`${lessee.id}:${lessee.updated_at}`}
      mode="view"
      initialLessee={lessee}
      regionOptions={regionOptions}
      picOptions={picOptions}
    />
  );
}
