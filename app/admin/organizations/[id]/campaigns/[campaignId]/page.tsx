import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlatformAdminRole } from "@/lib/auth/admin-guard";
import { adminGetCampaignDetail } from "@/lib/supabase/repositories/admin";

export default async function AdminCampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string; campaignId: string }>;
}) {
  if ((await getPlatformAdminRole()) !== "admin") notFound();

  const { id, campaignId } = await params;
  const admin = createAdminClient();
  const campaign = await adminGetCampaignDetail(admin, id, campaignId);

  if (!campaign) notFound();

  return (
    <div className="space-y-8">
      <Link href={`/admin/organizations/${id}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> {campaign.organizationName}
      </Link>

      <div>
        <h1 className="font-display text-3xl tracking-tight mb-2">{campaign.nom}</h1>
        <p className="text-muted-foreground text-sm">
          <span className="capitalize">{campaign.canal}</span> — <span className="capitalize">{campaign.statut}</span> — créée le{" "}
          {format(new Date(campaign.dateCreation), "d MMM yyyy", { locale: fr })}
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-xl">Message</h2>
        <div className="border border-border p-4 space-y-2 bg-secondary/30">
          {campaign.sujet && <p className="text-sm font-medium">{campaign.sujet}</p>}
          <p className="text-sm whitespace-pre-wrap">{campaign.message}</p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl">Destinataires ({campaign.recipients.length})</h2>
        {campaign.recipients.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun destinataire enregistré.</p>
        ) : (
          <div className="border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="p-3 font-medium">Nom</th>
                  <th className="p-3 font-medium">Contact</th>
                  <th className="p-3 font-medium">Statut</th>
                  <th className="p-3 font-medium">Erreur</th>
                </tr>
              </thead>
              <tbody>
                {campaign.recipients.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="p-3">{r.prenom} {r.nom}</td>
                    <td className="p-3 font-mono text-xs">{r.contact}</td>
                    <td className="p-3 capitalize">{r.statut}</td>
                    <td className="p-3 text-xs text-destructive">{r.erreur ?? "—"}</td>
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
