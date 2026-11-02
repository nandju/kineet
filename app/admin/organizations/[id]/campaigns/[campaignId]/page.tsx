import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlatformAdminRole } from "@/lib/auth/admin-guard";
import { adminGetCampaignDetail, adminListCampaignRecipients } from "@/lib/supabase/repositories/admin";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function AdminCampaignDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; campaignId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  if ((await getPlatformAdminRole()) !== "admin") notFound();

  const { id, campaignId } = await params;
  const { page: pageParam } = await searchParams;
  const page = Number(pageParam) || 1;
  const admin = createAdminClient();

  const campaign = await adminGetCampaignDetail(admin, id, campaignId);
  if (!campaign) notFound();

  const { items: recipients, total, totalPages } = await adminListCampaignRecipients(admin, campaignId, page);

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

      <Card>
        <CardHeader>
          <CardTitle>Message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {campaign.sujet && <p className="text-sm font-medium">{campaign.sujet}</p>}
          <p className="text-sm whitespace-pre-wrap">{campaign.message}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Destinataires ({total})</CardTitle>
        </CardHeader>
        <CardContent className="px-0 space-y-4">
          {recipients.length === 0 ? (
            <p className="text-sm text-muted-foreground px-6">Aucun destinataire enregistré.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Erreur</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipients.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.prenom} {r.nom}</TableCell>
                    <TableCell className="font-mono text-xs">{r.contact}</TableCell>
                    <TableCell className="capitalize">{r.statut}</TableCell>
                    <TableCell className="text-xs text-destructive">{r.erreur ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <div className="px-6">
            <AdminPagination
              basePath={`/admin/organizations/${id}/campaigns/${campaignId}`}
              page={page}
              totalPages={totalPages}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
