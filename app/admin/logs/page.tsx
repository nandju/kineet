import { notFound } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlatformAdminRole } from "@/lib/auth/admin-guard";
import { adminListPlatformLogs, type AdminLogEntry } from "@/lib/supabase/repositories/admin";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const KIND_LABEL: Record<AdminLogEntry["kind"], string> = {
  campaign: "Campagne",
  organization_created: "Organisation",
  payment_link: "Paiement",
  webhook: "Webhook",
  admin_action: "Action admin",
};

const KIND_VARIANT: Record<AdminLogEntry["kind"], "default" | "secondary" | "outline"> = {
  campaign: "secondary",
  organization_created: "default",
  payment_link: "default",
  webhook: "outline",
  admin_action: "outline",
};

export default async function AdminLogsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  if ((await getPlatformAdminRole()) !== "admin") notFound();

  const { page: pageParam } = await searchParams;
  const page = Number(pageParam) || 1;
  const admin = createAdminClient();
  const { items: entries, total, totalPages } = await adminListPlatformLogs(admin, page);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl tracking-tight mb-2">Activité</h1>
        <p className="text-muted-foreground">
          {total} évènement(s) — campagnes, organisations, paiements, webhooks et actions admin, toutes organisations confondues.
        </p>
      </div>

      <Card className="p-0 overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Organisation</TableHead>
                <TableHead>Détail</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Par</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    Aucune activité.
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <Badge variant={KIND_VARIANT[entry.kind]} className="whitespace-nowrap">
                        {KIND_LABEL[entry.kind]}
                      </Badge>
                    </TableCell>
                    <TableCell>{entry.organizationName}</TableCell>
                    <TableCell className="max-w-xs truncate">{entry.label}</TableCell>
                    <TableCell className="capitalize">{entry.status}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{entry.actorEmail ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(entry.createdAt), "d MMM yyyy HH:mm", { locale: fr })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AdminPagination basePath="/admin/logs" page={page} totalPages={totalPages} />
    </div>
  );
}
