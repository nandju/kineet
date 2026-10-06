import { DashboardApp } from "@/components/dashboard/dashboard-app";

export default async function OrgDashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <DashboardApp orgSlug={slug} />;
}
