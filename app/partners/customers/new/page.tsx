import { CustomerForm } from "@/components/customers/customer-form";

export default function NewPartnerCustomerPage() {
  return (
    <div className="min-h-screen bg-background">
      <CustomerForm mode="create" />
    </div>
  );
}
