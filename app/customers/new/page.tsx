import { CustomerForm } from "@/components/customers/customer-form";

export default function NewCustomerPage() {
  return (
    <div className="min-h-screen bg-background">
      <CustomerForm mode="create" />
    </div>
  );
}
