"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, Building2, ScrollText, Wallet, Menu, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { PlatformAdminRole } from "@/lib/auth/admin-guard";

const NAV: { href: string; label: string; icon: typeof Building2; roles: PlatformAdminRole[] }[] = [
  { href: "/admin", label: "Organisations", icon: Building2, roles: ["admin"] },
  { href: "/admin/logs", label: "Activité", icon: ScrollText, roles: ["admin"] },
  { href: "/admin/billing", label: "Facturation", icon: Wallet, roles: ["admin", "comptabilite"] },
];

function SidebarNav({ role, onNavigate }: { role: PlatformAdminRole; onNavigate?: () => void }) {
  const pathname = usePathname();
  const items = NAV.filter((item) => item.roles.includes(role));

  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  return (
    <nav className="flex flex-col h-full">
      <div className="p-6 border-b border-sidebar-border">
        <Link href={role === "admin" ? "/admin" : "/admin/billing"} className="inline-flex items-center gap-2 font-display font-bold text-lg">
          <ShieldCheck className="w-5 h-5" />
          Chapnet Admin
        </Link>
      </div>
      <div className="flex-1 p-4 space-y-1">
        {items.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors rounded-sm",
              isActive(href)
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        ))}
      </div>
      <div className="p-4 border-t border-sidebar-border">
        <Link
          href="/dashboard"
          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour au dashboard
        </Link>
      </div>
    </nav>
  );
}

export function AdminShell({ children, role }: { children: React.ReactNode; role: PlatformAdminRole }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden lg:flex w-64 flex-col border-r border-sidebar-border bg-sidebar shrink-0">
        <SidebarNav role={role} />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-border">
          <Link href={role === "admin" ? "/admin" : "/admin/billing"} className="inline-flex items-center gap-2 font-display font-bold text-lg">
            <ShieldCheck className="w-5 h-5" />
            Chapnet Admin
          </Link>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 bg-sidebar">
              <SidebarNav role={role} onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
        </header>
        <main className="flex-1 px-6 py-10 lg:px-10 max-w-6xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
