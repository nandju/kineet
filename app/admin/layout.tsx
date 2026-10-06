import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 404 rather than a visible "access denied" — don't reveal this route exists.
  if (!user) notFound();

  let isAdmin = false;
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle();
    isAdmin = !!data;
  } catch {
    isAdmin = false;
  }

  if (!isAdmin) notFound();

  return <AdminShell>{children}</AdminShell>;
}
