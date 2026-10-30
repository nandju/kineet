import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlatformAdminRole } from "@/lib/auth/admin-guard";
import { adminGetOrganization } from "@/lib/supabase/repositories/admin";
import { DeleteOrgButton } from "@/components/admin/delete-org-button";

export default async function AdminOrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if ((await getPlatformAdminRole()) !== "admin") notFound();

  const { id } = await params;
  const admin = createAdminClient();
  const org = await adminGetOrganization(admin, id);

  if (!org) notFound();

  return (
    <div className="space-y-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl tracking-tight mb-2">{org.name}</h1>
          <p className="text-muted-foreground font-mono text-sm">
            {org.slug} — créée le {format(new Date(org.createdAt), "d MMM yyyy", { locale: fr })}
          </p>
        </div>
        <DeleteOrgButton organizationId={org.id} organizationName={org.name} />
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-xl">Membres ({org.members.length})</h2>
        <div className="border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="p-3 font-medium">Nom</th>
                <th className="p-3 font-medium">Rôle</th>
                <th className="p-3 font-medium">Depuis</th>
              </tr>
            </thead>
            <tbody>
              {org.members.map((m) => (
                <tr key={m.userId} className="border-b border-border last:border-0">
                  <td className="p-3">{m.name || "—"}</td>
                  <td className="p-3 capitalize">{m.role}</td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">
                    {format(new Date(m.createdAt), "d MMM yyyy", { locale: fr })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl">Fournisseurs configurés</h2>
        {org.providers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun fournisseur configuré.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {org.providers.map((p) => (
              <span key={p.type} className="px-3 py-1.5 border border-border text-sm capitalize">
                {p.type} — <span className="text-muted-foreground">{p.status}</span>
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl">Campagnes récentes</h2>
        {org.recentCampaigns.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune campagne.</p>
        ) : (
          <div className="border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="p-3 font-medium">Nom</th>
                  <th className="p-3 font-medium">Canal</th>
                  <th className="p-3 font-medium">Statut</th>
                  <th className="p-3 font-medium">Créée le</th>
                </tr>
              </thead>
              <tbody>
                {org.recentCampaigns.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-secondary/50">
                    <td className="p-3">
                      <Link href={`/admin/organizations/${org.id}/campaigns/${c.id}`} className="font-medium hover:underline">
                        {c.nom}
                      </Link>
                    </td>
                    <td className="p-3 capitalize">{c.canal}</td>
                    <td className="p-3 capitalize">{c.statut}</td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">
                      {format(new Date(c.dateCreation), "d MMM yyyy", { locale: fr })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
