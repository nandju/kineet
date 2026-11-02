import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlatformAdminRole } from "@/lib/auth/admin-guard";
import { adminGetOrganization } from "@/lib/supabase/repositories/admin";
import { DeleteOrgButton } from "@/components/admin/delete-org-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function AdminOrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if ((await getPlatformAdminRole()) !== "admin") notFound();

  const { id } = await params;
  const admin = createAdminClient();
  const org = await adminGetOrganization(admin, id);

  if (!org) notFound();

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl tracking-tight mb-2">{org.name}</h1>
          <p className="text-muted-foreground font-mono text-sm">
            {org.slug} — créée le {format(new Date(org.createdAt), "d MMM yyyy", { locale: fr })}
          </p>
        </div>
        <DeleteOrgButton organizationId={org.id} organizationName={org.name} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Membres ({org.members.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Depuis</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {org.members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                    Aucun membre.
                  </TableCell>
                </TableRow>
              ) : (
                org.members.map((m) => (
                  <TableRow key={m.userId}>
                    <TableCell>{m.name || "—"}</TableCell>
                    <TableCell className="capitalize">{m.role}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {format(new Date(m.createdAt), "d MMM yyyy", { locale: fr })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fournisseurs configurés</CardTitle>
        </CardHeader>
        <CardContent>
          {org.providers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun fournisseur configuré.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {org.providers.map((p) => (
                <Badge key={p.type} variant="secondary" className="capitalize text-sm py-1.5 px-3">
                  {p.type} — <span className="text-muted-foreground ml-1">{p.status.replace(/_/g, " ")}</span>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Campagnes récentes</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {org.recentCampaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground px-6">Aucune campagne.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Créée le</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {org.recentCampaigns.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link href={`/admin/organizations/${org.id}/campaigns/${c.id}`} className="font-medium hover:underline">
                        {c.nom}
                      </Link>
                    </TableCell>
                    <TableCell className="capitalize">{c.canal}</TableCell>
                    <TableCell className="capitalize">{c.statut}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {format(new Date(c.dateCreation), "d MMM yyyy", { locale: fr })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
