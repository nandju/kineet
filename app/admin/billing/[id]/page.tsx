import { notFound } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlatformAdminRole } from "@/lib/auth/admin-guard";
import { adminGetOrganizationBilling, adminListPaymentLinks } from "@/lib/supabase/repositories/admin";
import { PaymentLinkForm } from "@/components/admin/payment-link-form";
import { PaymentLinkRow } from "@/components/admin/payment-link-row";

export default async function AdminBillingOrgPage({ params }: { params: Promise<{ id: string }> }) {
  const role = await getPlatformAdminRole();
  if (!role) notFound();

  const { id } = await params;
  const admin = createAdminClient();
  const org = await adminGetOrganizationBilling(admin, id);
  if (!org) notFound();

  const links = await adminListPaymentLinks(admin, id);

  const isActive = org.paidUntil && new Date(org.paidUntil) > new Date();

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-3xl tracking-tight mb-2">{org.name}</h1>
        <p className="text-muted-foreground font-mono text-sm">{org.slug}</p>
        <p className="mt-2 text-sm">
          {org.paidUntil ? (
            <span className={isActive ? "text-emerald-600" : "text-destructive"}>
              {isActive ? "Actif jusqu'au " : "Expiré le "}
              {format(new Date(org.paidUntil), "d MMM yyyy", { locale: fr })}
            </span>
          ) : (
            <span className="text-muted-foreground">Non suivi — aucun paiement enregistré, accès non restreint.</span>
          )}
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="font-display text-xl">Générer un lien de paiement</h2>
        <p className="text-sm text-muted-foreground max-w-xl">
          Le lien est créé auprès de SasPay. Son slug est affiché ci-dessous ; SasPay ne documente pas encore de
          champ d'URL publique pour les liens de paiement — vérifiez l'URL exacte à partager dans le tableau de bord SasPay.
        </p>
        <PaymentLinkForm organizationId={id} />
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl">Historique ({links.length})</h2>
        {links.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun lien généré pour cette organisation.</p>
        ) : (
          <div className="border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="p-3 font-medium">Facture</th>
                  <th className="p-3 font-medium">Montant</th>
                  <th className="p-3 font-medium">Statut</th>
                  <th className="p-3 font-medium">Slug SasPay</th>
                  <th className="p-3 font-medium">Créé le</th>
                  <th className="p-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {links.map((link) => (
                  <PaymentLinkRow key={link.id} link={link} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
