import { redirect } from "next/navigation";

/** Default landing: Basic Info phase-one workbench. */
export default function Home() {
  redirect("/basic-info");
}
