import { notFound } from "next/navigation";
import { getPlatformAdminRole } from "@/lib/auth/admin-guard";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const role = await getPlatformAdminRole();

  // 404 rather than a visible "access denied" — don't reveal this route exists.
  if (!role) notFound();

  return <AdminShell role={role}>{children}</AdminShell>;
}
