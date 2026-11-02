import { notFound } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlatformAdminRole } from "@/lib/auth/admin-guard";
import { adminGetOrganizationBilling, adminListPaymentLinks } from "@/lib/supabase/repositories/admin";
import { PaymentLinkForm } from "@/components/admin/payment-link-form";
import { PaymentLinkRow } from "@/components/admin/payment-link-row";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
    <div className="space-y-8">
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

      <Card>
        <CardHeader>
          <CardTitle>Générer un lien de paiement</CardTitle>
          <CardDescription>
            Génère une session de paiement SasPay et son lien hébergé (pay.saspay.me), prêt à copier et partager.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PaymentLinkForm organizationId={id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historique ({links.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {links.length === 0 ? (
            <p className="text-sm text-muted-foreground px-6">Aucun lien généré pour cette organisation.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Facture</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Lien</TableHead>
                  <TableHead>Créé le</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {links.map((link) => (
                  <PaymentLinkRow key={link.id} link={link} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
