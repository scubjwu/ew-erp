import { redirect } from "next/navigation";

type PageProps = {
  params: { id: string };
};

export default function EditCustomerPage({ params }: PageProps) {
  redirect(`/partners/customers/${params.id}`);
}
