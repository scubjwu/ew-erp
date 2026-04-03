import {
  getLesseePicOptions,
  getLesseeRegionOptions,
} from "@/app/partners/lessee/actions";
import { LesseeForm } from "@/components/lessees/lessee-form";

export const dynamic = "force-dynamic";

export default async function NewLesseePage() {
  const [regionOptions, picOptions] = await Promise.all([
    getLesseeRegionOptions(),
    getLesseePicOptions(),
  ]);

  return <LesseeForm mode="create" regionOptions={regionOptions} picOptions={picOptions} />;
}
