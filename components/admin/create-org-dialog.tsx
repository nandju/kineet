"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { notify } from "@/lib/kineet/notify";

export function CreateOrgDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setName("");
    setAdminEmail("");
    setInviteLink(null);
  };

  const handleCreate = () => {
    if (!name.trim() || !adminEmail.trim()) {
      notify.error("Champs manquants", "Nom et e-mail de l'admin sont requis.");
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/admin/organizations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), adminEmail: adminEmail.trim() }),
      });
      const data = await res.json();
      if (!data.success) {
        notify.error("Erreur", data.error ?? "L'organisation n'a pas pu être créée.");
        return;
      }
      setInviteLink(`${window.location.origin}/invite/${data.inviteToken}`);
      router.refresh();
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button className="rounded-full">
          <Plus className="w-4 h-4 mr-2" /> Nouvelle organisation
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer une organisation</DialogTitle>
          <DialogDescription>
            L'organisation est créée sans membre ; la personne désignée ci-dessous en devient l'admin en activant son compte via le lien d'invitation.
          </DialogDescription>
        </DialogHeader>

        {inviteLink ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Organisation créée. Partagez ce lien avec l'admin désigné :
            </p>
            <div className="flex items-center gap-2">
              <Input readOnly value={inviteLink} className="h-10 bg-input text-xs font-mono" />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(inviteLink);
                  notify.success("Copié", "Le lien d'invitation est dans le presse-papiers.");
                }}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <Button className="w-full rounded-full" onClick={() => setOpen(false)}>
              Terminé
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom de l'organisation</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-11 bg-input" placeholder="Agence Dupont" />
            </div>
            <div className="space-y-2">
              <Label>E-mail de l'admin</Label>
              <Input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="h-11 bg-input"
                placeholder="admin@agence-dupont.fr"
              />
            </div>
            <Button className="w-full rounded-full" onClick={handleCreate} disabled={pending}>
              {pending ? "Création..." : "Créer et générer le lien d'invitation"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
