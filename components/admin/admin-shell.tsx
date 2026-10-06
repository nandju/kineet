import Link from "next/link";
import { ShieldCheck, Building2, ScrollText } from "lucide-react";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/admin" className="inline-flex items-center gap-2 font-display font-bold text-lg">
            <ShieldCheck className="w-5 h-5" />
            Chapnet Admin
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/admin" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <Building2 className="w-4 h-4" /> Organisations
            </Link>
            <Link href="/admin/logs" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ScrollText className="w-4 h-4" /> Activité
            </Link>
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              Retour au dashboard
            </Link>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-10">{children}</main>
    </div>
  );
}
