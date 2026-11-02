import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listMyOrganizations } from "@/lib/supabase/repositories/organizations";
import { getPlatformAdminRole } from "@/lib/auth/admin-guard";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Platform admins (super-admin / comptabilité) belong to no organization —
  // sending them here would otherwise dead-end on "create an organization".
  const platformRole = await getPlatformAdminRole();
  if (platformRole) {
    redirect(platformRole === "admin" ? "/admin" : "/admin/billing");
  }

  const organizations = await listMyOrganizations(supabase, user.id);

  if (organizations.length === 0) {
    redirect("/onboarding/organisation");
  }

  redirect(`/org/${organizations[0].slug}/dashboard`);
}
