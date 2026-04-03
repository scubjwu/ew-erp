import { getUserRoleOptions } from "@/app/settings/users/actions";
import { UserForm } from "@/components/settings/user-form";

export const dynamic = "force-dynamic";

export default async function NewUserPage() {
  const roleOptions = await getUserRoleOptions();
  return <UserForm mode="create" roleOptions={roleOptions} />;
}
