import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlatformAdminRole } from "@/lib/auth/admin-guard";
import { adminListOrganizationsBilling } from "@/lib/supabase/repositories/admin";

function billingBadge(paidUntil: string | null) {
  if (!paidUntil) return { label: "Non suivi", className: "text-muted-foreground" };
  const isActive = new Date(paidUntil) > new Date();
  return isActive
    ? { label: `Actif jusqu'au ${format(new Date(paidUntil), "d MMM yyyy", { locale: fr })}`, className: "text-emerald-600" }
    : { label: `Expiré le ${format(new Date(paidUntil), "d MMM yyyy", { locale: fr })}`, className: "text-destructive" };
}

export default async function AdminBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const role = await getPlatformAdminRole();
  if (!role) notFound();

  const { q } = await searchParams;
  const admin = createAdminClient();
  const organizations = await adminListOrganizationsBilling(admin, q);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl tracking-tight mb-2">Facturation</h1>
        <p className="text-muted-foreground">{organizations.length} organisation(s).</p>
      </div>

      <form className="max-w-sm">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Rechercher par nom..."
          className="w-full h-10 px-3 border border-border bg-input rounded-sm text-sm"
        />
      </form>

      <div className="border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="p-3 font-medium">Nom</th>
              <th className="p-3 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody>
            {organizations.length === 0 ? (
              <tr>
                <td colSpan={2} className="p-8 text-center text-muted-foreground">Aucune organisation.</td>
              </tr>
            ) : (
              organizations.map((org) => {
                const badge = billingBadge(org.paidUntil);
                return (
                  <tr key={org.id} className="border-b border-border last:border-0 hover:bg-secondary/50">
                    <td className="p-3">
                      <Link href={`/admin/billing/${org.id}`} className="font-medium hover:underline">
                        {org.name}
                      </Link>
                      <span className="block text-xs text-muted-foreground font-mono">{org.slug}</span>
                    </td>
                    <td className={`p-3 ${badge.className}`}>{badge.label}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
