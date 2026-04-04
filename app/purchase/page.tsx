import { redirect } from "next/navigation";

export const metadata = {
  title: "Purchase — EW ERP",
};

export const dynamic = "force-dynamic";

export default function PurchasePage() {
  redirect("/purchase/po-management");
}
