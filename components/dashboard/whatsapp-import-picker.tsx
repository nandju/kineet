"use client";

import { useEffect, useState } from "react";
import { Loader2, MessageCircle, Users, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWhatsAppSession } from "@/lib/hooks/use-whatsapp-session";

export interface WhatsAppRecipient {
  lastName: string;
  firstName: string;
  contact: string;
}

interface WhatsAppGroup {
  id: string;
  name: string;
  participantCount: number;
}

interface WhatsAppContact {
  id: string;
  name: string;
  number: string;
}

function splitName(name: string): { lastName: string; firstName: string } {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return { lastName: name.trim() || "Contact WhatsApp", firstName: "" };
  return { lastName: parts[parts.length - 1], firstName: parts.slice(0, -1).join(" ") };
}

export function WhatsAppImportPicker({ onImport }: { onImport: (recipients: WhatsAppRecipient[]) => void }) {
  const { state, connect } = useWhatsAppSession();

  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [groupMembersCache, setGroupMembersCache] = useState<Record<string, WhatsAppContact[]>>({});
  const [loadingGroupId, setLoadingGroupId] = useState<string | null>(null);

  useEffect(() => {
    if (state.status !== "connected") return;
    let active = true;
    setLoadingLists(true);
    Promise.all([
      fetch("/api/whatsapp/groups").then((r) => r.json()),
      fetch("/api/whatsapp/contacts").then((r) => r.json()),
    ])
      .then(([groupsRes, contactsRes]) => {
        if (!active) return;
        if (groupsRes.success) setGroups(groupsRes.groups);
        if (contactsRes.success) setContacts(contactsRes.contacts);
      })
      .finally(() => active && setLoadingLists(false));
    return () => {
      active = false;
    };
  }, [state.status]);

  const toggleGroup = async (group: WhatsAppGroup) => {
    const next = new Set(selectedGroupIds);
    if (next.has(group.id)) {
      next.delete(group.id);
      setSelectedGroupIds(next);
      return;
    }
    next.add(group.id);
    setSelectedGroupIds(next);

    if (!groupMembersCache[group.id]) {
      setLoadingGroupId(group.id);
      try {
        const res = await fetch(`/api/whatsapp/groups/${encodeURIComponent(group.id)}/members`);
        const data = await res.json();
        if (data.success) {
          setGroupMembersCache((prev) => ({ ...prev, [group.id]: data.members }));
        }
      } finally {
        setLoadingGroupId(null);
      }
    }
  };

  const toggleContact = (id: string) => {
    const next = new Set(selectedContactIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedContactIds(next);
  };

  const selectionCount =
    selectedContactIds.size +
    Array.from(selectedGroupIds).reduce((sum, gId) => sum + (groupMembersCache[gId]?.length ?? 0), 0);

  const handleImport = () => {
    const byNumber = new Map<string, WhatsAppRecipient>();

    contacts
      .filter((c) => selectedContactIds.has(c.id))
      .forEach((c) => {
        const { lastName, firstName } = splitName(c.name);
        byNumber.set(c.number, { lastName, firstName, contact: c.number });
      });

    selectedGroupIds.forEach((gId) => {
      (groupMembersCache[gId] ?? []).forEach((m) => {
        const { lastName, firstName } = splitName(m.name);
        byNumber.set(m.number, { lastName, firstName, contact: m.number });
      });
    });

    onImport(Array.from(byNumber.values()));
  };

  if (state.status !== "connected") {
    return (
      <div className="border border-dashed border-border p-8 text-center space-y-4">
        <MessageCircle className="w-6 h-6 mx-auto text-muted-foreground" />
        {state.status === "qr" && state.qr ? (
          <>
            <p className="text-sm">Scannez ce QR code avec WhatsApp (Appareils liés) sur votre téléphone.</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={state.qr} alt="QR code de connexion WhatsApp" className="mx-auto w-48 h-48" />
          </>
        ) : state.status === "connecting" ? (
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Connexion en cours...
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Connectez votre WhatsApp pour importer vos groupes et contacts.
            </p>
            <Button variant="outline" className="rounded-full" onClick={connect}>
              Connecter mon WhatsApp
            </Button>
          </>
        )}
        {state.status === "error" && (
          <p className="text-sm text-destructive">{state.error ?? "La connexion a échoué."}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {loadingLists ? (
        <p className="text-sm text-muted-foreground text-center py-8 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Chargement des groupes et contacts...
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Users className="w-3.5 h-3.5" /> Groupes ({groups.length})
            </p>
            <ScrollArea className="h-48 border border-border">
              <div className="p-2 space-y-1">
                {groups.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-2">Aucun groupe trouvé.</p>
                ) : (
                  groups.map((g) => (
                    <label key={g.id} className="flex items-center gap-2 p-2 text-sm hover:bg-secondary/50 cursor-pointer rounded">
                      <Checkbox checked={selectedGroupIds.has(g.id)} onCheckedChange={() => toggleGroup(g)} />
                      <span className="flex-1 truncate">{g.name}</span>
                      {loadingGroupId === g.id ? (
                        <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                      ) : (
                        <span className="text-xs text-muted-foreground">{g.participantCount}</span>
                      )}
                    </label>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <User className="w-3.5 h-3.5" /> Contacts ({contacts.length})
            </p>
            <ScrollArea className="h-48 border border-border">
              <div className="p-2 space-y-1">
                {contacts.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-2">Aucun contact trouvé.</p>
                ) : (
                  contacts.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 p-2 text-sm hover:bg-secondary/50 cursor-pointer rounded">
                      <Checkbox checked={selectedContactIds.has(c.id)} onCheckedChange={() => toggleContact(c.id)} />
                      <span className="flex-1 truncate">{c.name}</span>
                      <span className="text-xs text-muted-foreground font-mono">{c.number}</span>
                    </label>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{selectionCount} contact(s) sélectionné(s)</span>
        <Button size="sm" className="rounded-full bg-foreground text-background" disabled={selectionCount === 0} onClick={handleImport}>
          Ajouter la sélection
        </Button>
      </div>
    </div>
  );
}
