"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Copy, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDashboard } from "@/lib/kineet/dashboard-context";
import { createClient } from "@/lib/supabase/client";
import { notify } from "@/lib/kineet/notify";
import {
  listMembers,
  listInvites,
  createInvite,
  deleteInvite,
  updateMemberRole,
  removeMember,
  type OrganizationMember,
  type OrganizationInvite,
  type OrganizationRole,
} from "@/lib/supabase/repositories/organizations";

export function MembersPanel() {
  const { organizationId, organizationName, organizationRole, userId } = useDashboard();
  const [supabase] = useState(() => createClient());
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [invites, setInvites] = useState<OrganizationInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrganizationRole>("member");
  const [inviting, setInviting] = useState(false);

  const canManage = organizationRole === "owner" || organizationRole === "admin";

  const refresh = async (orgId: string) => {
    setLoading(true);
    try {
      const [m, i] = await Promise.all([listMembers(supabase, orgId), listInvites(supabase, orgId)]);
      setMembers(m);
      setInvites(i);
    } catch {
      notify.error("Erreur", "Impossible de charger les membres.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (organizationId) refresh(organizationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const sendInvite = async () => {
    if (!organizationId || !userId) return;
    if (!inviteEmail.trim()) {
      notify.error("E-mail requis", "Indiquez l'e-mail de la personne à inviter.");
      return;
    }
    setInviting(true);
    try {
      const invite = await createInvite(supabase, organizationId, userId, inviteEmail.trim(), inviteRole);
      const link = `${window.location.origin}/invite/${invite.token}`;
      await navigator.clipboard.writeText(link).catch(() => {});
      notify.success("Invitation créée", "Le lien a été copié dans le presse-papiers — partagez-le avec la personne invitée.");
      setInviteEmail("");
      await refresh(organizationId);
    } catch {
      notify.error("Erreur", "L'invitation n'a pas pu être créée.");
    } finally {
      setInviting(false);
    }
  };

  const copyInviteLink = async (token: string) => {
    const link = `${window.location.origin}/invite/${token}`;
    await navigator.clipboard.writeText(link).catch(() => {});
    notify.success("Lien copié", "Le lien d'invitation est dans votre presse-papiers.");
  };

  const cancelInvite = async (inviteId: string) => {
    if (!organizationId) return;
    try {
      await deleteInvite(supabase, inviteId);
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } catch {
      notify.error("Erreur", "L'invitation n'a pas pu être annulée.");
    }
  };

  const changeRole = async (member: OrganizationMember, role: OrganizationRole) => {
    if (!organizationId) return;
    try {
      await updateMemberRole(supabase, organizationId, member.userId, role);
      setMembers((prev) => prev.map((m) => (m.userId === member.userId ? { ...m, role } : m)));
    } catch {
      notify.error("Erreur", "Le rôle n'a pas pu être mis à jour.");
    }
  };

  const kickMember = async (member: OrganizationMember) => {
    if (!organizationId) return;
    try {
      await removeMember(supabase, organizationId, member.userId);
      setMembers((prev) => prev.filter((m) => m.userId !== member.userId));
      notify.success("Membre retiré", "La personne n'a plus accès à cette organisation.");
    } catch {
      notify.error("Erreur", "Le membre n'a pas pu être retiré.");
    }
  };

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-4xl tracking-tight mb-2">Membres</h1>
        <p className="text-muted-foreground">{organizationName} — gérez qui a accès à cette organisation.</p>
      </motion.div>

      {canManage && (
        <div className="border border-border p-6 space-y-4">
          <div className="flex items-center gap-3">
            <UserPlus className="w-5 h-5" />
            <h2 className="font-display text-xl">Inviter un membre</h2>
          </div>
          <div className="grid sm:grid-cols-[1fr_auto_auto] gap-3">
            <Input
              placeholder="email@exemple.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="h-11 bg-input"
            />
            <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as OrganizationRole)}>
              <SelectTrigger className="h-11 w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Membre</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Button className="rounded-full bg-foreground text-background h-11" onClick={sendInvite} disabled={inviting}>
              {inviting ? "Création..." : "Inviter"}
            </Button>
          </div>

          {invites.length > 0 && (
            <div className="pt-2 space-y-2">
              <Label className="text-xs text-muted-foreground">Invitations en attente</Label>
              {invites.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between gap-3 text-sm py-2 border-t border-border">
                  <span>{invite.email} <span className="text-muted-foreground">({invite.role})</span></span>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => copyInviteLink(invite.token)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => cancelInvite(invite.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead>Nom</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Membre depuis</TableHead>
              {canManage && <TableHead className="w-24" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-12">Chargement...</TableCell></TableRow>
            ) : (
              members.map((member) => (
                <TableRow key={member.userId} className="border-border">
                  <TableCell className="font-medium">{member.name || "—"}{member.userId === userId && " (vous)"}</TableCell>
                  <TableCell>
                    {canManage && member.role !== "owner" && member.userId !== userId ? (
                      <Select value={member.role} onValueChange={(v) => changeRole(member, v as OrganizationRole)}>
                        <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Membre</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-sm capitalize">{member.role}</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {format(new Date(member.createdAt), "d MMM yyyy", { locale: fr })}
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      {member.role !== "owner" && member.userId !== userId && (
                        <Button variant="ghost" size="icon" onClick={() => kickMember(member)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
