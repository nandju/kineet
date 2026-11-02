import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlatformAdminRole } from "@/lib/auth/admin-guard";
import { adminListOrganizationsBilling } from "@/lib/supabase/repositories/admin";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const role = await getPlatformAdminRole();
  if (!role) notFound();

  const { q, page: pageParam } = await searchParams;
  const page = Number(pageParam) || 1;
  const admin = createAdminClient();
  const { items: organizations, total, totalPages } = await adminListOrganizationsBilling(admin, q, page);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl tracking-tight mb-2">Facturation</h1>
        <p className="text-muted-foreground">{total} organisation(s).</p>
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
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="h-32 text-center text-muted-foreground">
                    Aucune organisation.
                  </TableCell>
                </TableRow>
              ) : (
                organizations.map((org) => {
                  const badge = billingBadge(org.paidUntil);
                  return (
                    <TableRow key={org.id}>
                      <TableCell>
                        <Link href={`/admin/billing/${org.id}`} className="font-medium hover:underline">
                          {org.name}
                        </Link>
                        <span className="block text-xs text-muted-foreground font-mono">{org.slug}</span>
                      </TableCell>
                      <TableCell className={badge.className}>{badge.label}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AdminPagination basePath="/admin/billing" params={{ q }} page={page} totalPages={totalPages} />
    </div>
  );
}
