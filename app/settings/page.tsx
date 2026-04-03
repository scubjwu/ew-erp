import Link from "next/link";
import { ChevronRight, Shield } from "lucide-react";

export const metadata = {
  title: "System Settings — EW ERP",
};

export default function SystemSettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">System Settings</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Manage system-level administration, user setup, and operational configuration from one place.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Link
            href="/settings/users"
            className="group rounded-xl border bg-card p-5 shadow-sm transition hover:border-primary/40 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Shield className="size-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">User Management</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Maintain user identities, role assignments, and account status.
                  </p>
                </div>
              </div>
              <ChevronRight className="mt-1 size-5 text-muted-foreground transition group-hover:text-primary" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
