"use client";

import { useState } from "react";
import { Building2, Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useDashboard } from "@/lib/kineet/dashboard-context";

export function OrgSwitcher() {
  const { organizationName, organizationSlug, organizations, switchOrganization, createOrganization } = useDashboard();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    await createOrganization(name.trim());
    setCreating(false);
    setCreateOpen(false);
    setName("");
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-sm hover:bg-sidebar-accent/50 transition-colors text-left"
          >
            <Building2 className="w-4 h-4 shrink-0 text-muted-foreground" />
            <span className="flex-1 truncate font-medium">{organizationName || "Organisation"}</span>
            <ChevronsUpDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Vos organisations</DropdownMenuLabel>
          {organizations.map((org) => (
            <DropdownMenuItem key={org.id} onClick={() => switchOrganization(org.slug)} className="gap-2">
              {org.slug === organizationSlug ? (
                <Check className="w-4 h-4" />
              ) : (
                <span className="w-4" />
              )}
              <span className="flex-1 truncate">{org.name}</span>
              <span className="text-xs text-muted-foreground capitalize">{org.role}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Nouvelle organisation
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle organisation</DialogTitle>
            <DialogDescription>Un espace complètement séparé, avec ses propres campagnes et membres.</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Nom de l'organisation"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11 bg-input"
          />
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button className="rounded-full bg-foreground text-background" onClick={handleCreate} disabled={creating}>
              {creating ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
