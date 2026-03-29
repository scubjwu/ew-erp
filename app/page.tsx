import { redirect } from "next/navigation";

/** Default landing: Inventory Command Center (sidebar &quot;Inventory&quot; is active). */
export default function Home() {
  redirect("/inventory/center");
}
