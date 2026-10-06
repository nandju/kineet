import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Users } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminListOrganizations } from "@/lib/supabase/repositories/admin";

export default async function AdminOrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const admin = createAdminClient();
  const organizations = await adminListOrganizations(admin, q);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl tracking-tight mb-2">Organisations</h1>
        <p className="text-muted-foreground">{organizations.length} organisation(s) sur la plateforme.</p>
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
              <th className="p-3 font-medium">Membres</th>
              <th className="p-3 font-medium">Créée le</th>
            </tr>
          </thead>
          <tbody>
            {organizations.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-8 text-center text-muted-foreground">Aucune organisation.</td>
              </tr>
            ) : (
              organizations.map((org) => (
                <tr key={org.id} className="border-b border-border last:border-0 hover:bg-secondary/50">
                  <td className="p-3">
                    <Link href={`/admin/organizations/${org.id}`} className="font-medium hover:underline">
                      {org.name}
                    </Link>
                    <span className="block text-xs text-muted-foreground font-mono">{org.slug}</span>
                  </td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Users className="w-3.5 h-3.5" /> {org.memberCount}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">
                    {format(new Date(org.createdAt), "d MMM yyyy", { locale: fr })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
