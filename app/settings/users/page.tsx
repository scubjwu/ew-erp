import {
  getUserRoleOptions,
  getUsers,
  getUserStatusOptions,
  type UserManagementQuery,
} from "@/app/settings/users/actions";
import { UsersDashboard } from "@/components/settings/users-dashboard";

export const metadata = {
  title: "User Management — EW ERP",
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function UserManagementPage() {
  const initialParams: UserManagementQuery = {
    userCode: "",
    fullName: "",
    role: "",
    status: "",
    page: 1,
    pageSize: PAGE_SIZE,
  };

  const [initial, roleOptions, statusOptions] = await Promise.all([
    getUsers(initialParams),
    getUserRoleOptions(),
    getUserStatusOptions(),
  ]);

  return (
    <UsersDashboard
      initial={initial}
      pageSize={PAGE_SIZE}
      roleOptions={roleOptions}
      statusOptions={statusOptions}
    />
  );
}
