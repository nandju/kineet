import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listMyOrganizations } from "@/lib/supabase/repositories/organizations";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const organizations = await listMyOrganizations(supabase, user.id);

  if (organizations.length === 0) {
    redirect("/onboarding/organisation");
  }

  redirect(`/org/${organizations[0].slug}/dashboard`);
}
