import { notFound } from "next/navigation";

import { getCustomerById } from "@/app/customers/actions";
import { CustomerForm } from "@/components/customers/customer-form";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { id: string };
};

export default async function EditPartnerCustomerPage({ params }: PageProps) {
  const customer = await getCustomerById(params.id);
  if (!customer) {
    notFound();
  }

  return (
    <CustomerForm
      key={`${customer.id}:${customer.updated_at}`}
      mode="edit"
      initialCustomer={customer}
    />
  );
}

