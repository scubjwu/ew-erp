export type UserStatus = "Active" | "Inactive";

export type UserRole = "Admin" | "Sales" | "Operations" | "Finance";

export type SystemUser = {
  id: string;
  user_code: string;
  email: string | null;
  full_name: string | null;
  role: string;
  status: UserStatus;
  phone: string | null;
  department: string | null;
  job_title: string | null;
  last_login_at: string;
  remarks: string | null;
  created_at: string;
  updated_at: string;
};

export const USER_STATUS_OPTIONS: UserStatus[] = ["Active", "Inactive"];

export const USER_ROLE_OPTIONS: UserRole[] = [
  "Admin",
  "Sales",
  "Operations",
  "Finance",
];
