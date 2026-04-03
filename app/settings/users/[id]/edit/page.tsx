import { notFound } from "next/navigation";

import { getUserById, getUserRoleOptions } from "@/app/settings/users/actions";
import { UserForm } from "@/components/settings/user-form";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { id: string };
};

export default async function EditUserPage({ params }: PageProps) {
  const [user, roleOptions] = await Promise.all([
    getUserById(params.id),
    getUserRoleOptions(),
  ]);

  if (!user) notFound();

  return (
    <UserForm
      key={`${user.id}:${user.updated_at}`}
      mode="edit"
      initialUser={user}
      roleOptions={roleOptions}
    />
  );
}
