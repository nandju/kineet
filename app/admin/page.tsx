import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Users } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlatformAdminRole } from "@/lib/auth/admin-guard";
import { adminListOrganizations } from "@/lib/supabase/repositories/admin";
import { CreateOrgDialog } from "@/components/admin/create-org-dialog";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function AdminOrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  if ((await getPlatformAdminRole()) !== "admin") notFound();

  const { q, page: pageParam } = await searchParams;
  const page = Number(pageParam) || 1;
  const admin = createAdminClient();
  const { items: organizations, total, totalPages } = await adminListOrganizations(admin, q, page);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl tracking-tight mb-2">Organisations</h1>
          <p className="text-muted-foreground">{total} organisation(s) sur la plateforme.</p>
        </div>
        <CreateOrgDialog />
      </div>

      <form className="max-w-sm">
        <Input type="text" name="q" defaultValue={q ?? ""} placeholder="Rechercher par nom..." className="h-10 bg-input" />
      </form>

      <Card className="p-0 overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Membres</TableHead>
                <TableHead>Créée le</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-32 text-center text-muted-foreground">
                    Aucune organisation.
                  </TableCell>
                </TableRow>
              ) : (
                organizations.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell>
                      <Link href={`/admin/organizations/${org.id}`} className="font-medium hover:underline">
                        {org.name}
                      </Link>
                      <span className="block text-xs text-muted-foreground font-mono">{org.slug}</span>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Users className="w-3.5 h-3.5" /> {org.memberCount}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {format(new Date(org.createdAt), "d MMM yyyy", { locale: fr })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AdminPagination basePath="/admin" params={{ q }} page={page} totalPages={totalPages} />
    </div>
  );
}
