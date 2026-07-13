"use client";

import { useState } from "react";
import {
  Home,
  PlusCircle,
  History,
  User,
  Settings,
  LogOut,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DashboardProvider, useDashboard, type DashboardSection } from "@/lib/kineet/dashboard-context";
import { HomePanel } from "./home-panel";
import { NewCampaignPanel } from "./new-campaign-panel";
import { HistoryPanel } from "./history-panel";
import { ProfilePanel } from "./profile-panel";
import { SettingsPanelV2 } from "./settings-panel-v2";

const NAV: { id: DashboardSection; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Accueil", icon: Home },
  { id: "campaign", label: "Nouvelle campagne", icon: PlusCircle },
  { id: "history", label: "Historique", icon: History },
  { id: "profile", label: "Profil", icon: User },
  { id: "settings", label: "Paramètres", icon: Settings },
];

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { section, setSection, logout } = useDashboard();

  return (
    <nav className="flex flex-col h-full">
      <div className="p-6 border-b border-sidebar-border">
        <a href="/" className="inline-flex items-center gap-2">
          <span className="font-display text-xl tracking-tight">KINEET</span>
          <span className="font-mono text-[10px] mt-0.5 text-muted-foreground">TM</span>
        </a>
      </div>
      <div className="flex-1 p-4 space-y-1">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => { setSection(id); onNavigate?.(); }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors rounded-sm",
              section === id
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </button>
        ))}
      </div>
      <div className="p-4 border-t border-sidebar-border">
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-sidebar-foreground/70 hover:text-destructive transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </div>
    </nav>
  );
}

function DashboardContent() {
  const { section } = useDashboard();
  const [mobileOpen, setMobileOpen] = useState(false);

  const panels: Record<DashboardSection, React.ReactNode> = {
    home: <HomePanel />,
    campaign: <NewCampaignPanel />,
    history: <HistoryPanel />,
    profile: <ProfilePanel />,
    settings: <SettingsPanelV2 />,
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden lg:flex w-64 flex-col border-r border-sidebar-border bg-sidebar shrink-0">
        <SidebarNav />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-border">
          <a href="/" className="font-display text-lg">KINEET</a>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon"><Menu className="w-5 h-5" /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 bg-sidebar">
              <SidebarNav onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
        </header>
        <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
          {panels[section]}
        </main>
      </div>
    </div>
  );
}

export function DashboardApp() {
  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  );
}
