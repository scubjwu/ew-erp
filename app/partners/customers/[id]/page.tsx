import { notFound } from "next/navigation";

import { getCustomerById } from "@/app/customers/actions";
import { CustomerForm } from "@/components/customers/customer-form";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ViewPartnerCustomerPage({ params }: PageProps) {
  const { id } = await params;
  const customer = await getCustomerById(id);
  if (!customer) {
    notFound();
  }

  return (
    <CustomerForm
      key={`${customer.id}:${customer.updated_at}`}
      mode="view"
      initialCustomer={customer}
    />
  );
}
