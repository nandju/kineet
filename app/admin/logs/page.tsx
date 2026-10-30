import { notFound } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlatformAdminRole } from "@/lib/auth/admin-guard";
import { adminListRecentActivity } from "@/lib/supabase/repositories/admin";

export default async function AdminLogsPage() {
  if ((await getPlatformAdminRole()) !== "admin") notFound();

  const admin = createAdminClient();
  const entries = await adminListRecentActivity(admin);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl tracking-tight mb-2">Activité</h1>
        <p className="text-muted-foreground">Campagnes récentes, toutes organisations confondues.</p>
      </div>

      <div className="border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="p-3 font-medium">Organisation</th>
              <th className="p-3 font-medium">Campagne</th>
              <th className="p-3 font-medium">Statut</th>
              <th className="p-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-muted-foreground">Aucune activité.</td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id} className="border-b border-border last:border-0">
                  <td className="p-3">{entry.organizationName}</td>
                  <td className="p-3">{entry.label}</td>
                  <td className="p-3 capitalize">{entry.status}</td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">
                    {format(new Date(entry.createdAt), "d MMM yyyy HH:mm", { locale: fr })}
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
