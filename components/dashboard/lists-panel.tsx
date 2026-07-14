"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { FileSpreadsheet, Plus, Trash2, Upload, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { notify } from "@/lib/kineet/notify";
import { generateId, parseSpreadsheetFile } from "@/lib/kineet/campaign-utils";
import { createClient } from "@/lib/supabase/client";
import {
  listDistributionLists,
  createDistributionList,
  deleteDistributionList,
  listDistributionListRecipients,
  addDistributionListRecipients,
  deleteDistributionListRecipient,
  type DistributionList,
  type DistributionListRecipientRow,
} from "@/lib/supabase/repositories/distribution-lists";

interface DraftRecipient { id: string; lastName: string; firstName: string; contact: string }

function emptyDraft(): DraftRecipient {
  return { id: generateId("draft"), lastName: "", firstName: "", contact: "" };
}

export function ListsPanel() {
  const [supabase] = useState(() => createClient());
  const [userId, setUserId] = useState<string | null>(null);
  const [lists, setLists] = useState<DistributionList[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newRecipients, setNewRecipients] = useState<DraftRecipient[]>([emptyDraft()]);
  const [creating, setCreating] = useState(false);
  const createFileRef = useRef<HTMLInputElement>(null);

  const [detail, setDetail] = useState<DistributionList | null>(null);
  const [detailRecipients, setDetailRecipients] = useState<DistributionListRecipientRow[] | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [addDraft, setAddDraft] = useState<DraftRecipient[]>([emptyDraft()]);
  const detailFileRef = useRef<HTMLInputElement>(null);

  const refreshLists = async (uid: string) => {
    setLoading(true);
    try {
      setLists(await listDistributionLists(supabase, uid));
    } catch {
      notify.error("Erreur", "Impossible de charger les listes de diffusion.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) return;
      setUserId(user.id);
      await refreshLists(user.id);
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const resetCreateForm = () => {
    setNewName("");
    setNewDescription("");
    setNewRecipients([emptyDraft()]);
  };

  const handleCreateImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await parseSpreadsheetFile(file, null);
      if (result.empty) {
        notify.error("Fichier vide", "Le fichier ne contient aucune donnée.");
        return;
      }
      setNewRecipients(result.recipients.map((r) => ({ id: r.id, lastName: r.lastName, firstName: r.firstName, contact: r.contact })));
      notify.success("Import terminé", `${result.recipients.length} contact(s) importé(s).`);
    } catch {
      notify.error("Erreur d'import", "Impossible de lire le fichier.");
    }
    e.target.value = "";
  };

  const createList = async () => {
    if (!userId) return;
    if (!newName.trim()) {
      notify.error("Nom requis", "Donnez un nom à votre liste de diffusion.");
      return;
    }
    const validDrafts = newRecipients.filter((r) => r.lastName.trim() && r.firstName.trim() && r.contact.trim());
    setCreating(true);
    try {
      const list = await createDistributionList(supabase, userId, newName.trim(), newDescription.trim() || undefined);
      if (validDrafts.length > 0) {
        await addDistributionListRecipients(
          supabase,
          list.id,
          validDrafts.map((r) => ({ nom: r.lastName, prenom: r.firstName, contact: r.contact })),
        );
      }
      notify.success("Liste créée", `"${list.nom}" a été créée avec ${validDrafts.length} contact(s).`);
      setCreateOpen(false);
      resetCreateForm();
      await refreshLists(userId);
    } catch {
      notify.error("Erreur", "La liste n'a pas pu être créée.");
    } finally {
      setCreating(false);
    }
  };

  const openDetail = async (list: DistributionList) => {
    setDetail(list);
    setDetailRecipients(null);
    setAddDraft([emptyDraft()]);
    setLoadingDetail(true);
    try {
      setDetailRecipients(await listDistributionListRecipients(supabase, list.id));
    } catch {
      notify.error("Erreur", "Impossible de charger les destinataires de cette liste.");
      setDetailRecipients([]);
    } finally {
      setLoadingDetail(false);
    }
  };

  const removeRecipientFromList = async (recipientId: string) => {
    if (!detail) return;
    try {
      await deleteDistributionListRecipient(supabase, recipientId);
      setDetailRecipients((prev) => prev?.filter((r) => r.id !== recipientId) ?? null);
      setLists((prev) => prev.map((l) => (l.id === detail.id ? { ...l, recipientCount: l.recipientCount - 1 } : l)));
    } catch {
      notify.error("Erreur", "Le destinataire n'a pas pu être supprimé.");
    }
  };

  const addRecipientsToDetail = async () => {
    if (!detail) return;
    const validDrafts = addDraft.filter((r) => r.lastName.trim() && r.firstName.trim() && r.contact.trim());
    if (validDrafts.length === 0) {
      notify.error("Aucun contact valide", "Renseignez au moins nom, prénom et contact.");
      return;
    }
    try {
      await addDistributionListRecipients(
        supabase,
        detail.id,
        validDrafts.map((r) => ({ nom: r.lastName, prenom: r.firstName, contact: r.contact })),
      );
      notify.success("Contacts ajoutés", `${validDrafts.length} contact(s) ajouté(s) à la liste.`);
      setAddDraft([emptyDraft()]);
      setLists((prev) => prev.map((l) => (l.id === detail.id ? { ...l, recipientCount: l.recipientCount + validDrafts.length } : l)));
      setDetailRecipients(await listDistributionListRecipients(supabase, detail.id));
    } catch {
      notify.error("Erreur", "Les contacts n'ont pas pu être ajoutés.");
    }
  };

  const handleDetailImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await parseSpreadsheetFile(file, null);
      if (result.empty) {
        notify.error("Fichier vide", "Le fichier ne contient aucune donnée.");
        return;
      }
      setAddDraft(result.recipients.map((r) => ({ id: r.id, lastName: r.lastName, firstName: r.firstName, contact: r.contact })));
      notify.success("Import terminé", `${result.recipients.length} contact(s) prêt(s) à ajouter — cliquez "Ajouter".`);
    } catch {
      notify.error("Erreur d'import", "Impossible de lire le fichier.");
    }
    e.target.value = "";
  };

  const removeList = async (list: DistributionList) => {
    try {
      await deleteDistributionList(supabase, list.id);
      setLists((prev) => prev.filter((l) => l.id !== list.id));
      if (detail?.id === list.id) setDetail(null);
      notify.success("Liste supprimée", `"${list.nom}" a été supprimée.`);
    } catch {
      notify.error("Erreur", "La liste n'a pas pu être supprimée.");
    }
  };

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-4xl tracking-tight mb-2">Listes de diffusion</h1>
          <p className="text-muted-foreground">Préconfigurez vos destinataires pour les réutiliser dans vos campagnes.</p>
        </div>
        <Button className="rounded-full bg-foreground text-background" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Nouvelle liste
        </Button>
      </motion.div>

      <div className="border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead>Nom</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Destinataires</TableHead>
              <TableHead>Créée le</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-12">Chargement...</TableCell></TableRow>
            ) : lists.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-12">Aucune liste de diffusion. Créez-en une pour commencer.</TableCell></TableRow>
            ) : (
              lists.map((list) => (
                <TableRow key={list.id} className="border-border cursor-pointer hover:bg-secondary/50" onClick={() => openDetail(list)}>
                  <TableCell className="font-medium flex items-center gap-2"><Users className="w-4 h-4 text-muted-foreground" />{list.nom}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{list.description || "—"}</TableCell>
                  <TableCell className="font-mono text-sm">{list.recipientCount.toLocaleString("fr-FR")}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">{format(new Date(list.createdAt), "d MMM yyyy", { locale: fr })}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); removeList(list); }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create list dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetCreateForm(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nouvelle liste de diffusion</DialogTitle>
            <DialogDescription>Nommez votre liste et ajoutez des contacts manuellement ou par import.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nom de la liste</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="h-11 bg-input" placeholder="Clients VIP" />
              </div>
              <div className="space-y-2">
                <Label>Description (optionnel)</Label>
                <Input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} className="h-11 bg-input" />
              </div>
            </div>

            <Tabs defaultValue="manual" className="space-y-4">
              <TabsList>
                <TabsTrigger value="manual">Saisie manuelle</TabsTrigger>
                <TabsTrigger value="import">Import Excel</TabsTrigger>
              </TabsList>
              <TabsContent value="manual" className="space-y-3">
                <ScrollArea className="max-h-64">
                  <div className="space-y-3 pr-3">
                    {newRecipients.map((r) => (
                      <div key={r.id} className="grid sm:grid-cols-4 gap-3 items-start border border-border p-3">
                        <Input placeholder="Nom" value={r.lastName} onChange={(e) => setNewRecipients((prev) => prev.map((x) => x.id === r.id ? { ...x, lastName: e.target.value } : x))} className="h-10 bg-input" />
                        <Input placeholder="Prénom" value={r.firstName} onChange={(e) => setNewRecipients((prev) => prev.map((x) => x.id === r.id ? { ...x, firstName: e.target.value } : x))} className="h-10 bg-input" />
                        <Input placeholder="Email ou téléphone" value={r.contact} onChange={(e) => setNewRecipients((prev) => prev.map((x) => x.id === r.id ? { ...x, contact: e.target.value } : x))} className="h-10 bg-input" />
                        <Button variant="ghost" size="icon" onClick={() => setNewRecipients((prev) => prev.length > 1 ? prev.filter((x) => x.id !== r.id) : prev)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <Button variant="outline" className="rounded-full" onClick={() => setNewRecipients((prev) => [...prev, emptyDraft()])}>
                  <Plus className="w-4 h-4 mr-2" /> Ajouter une ligne
                </Button>
              </TabsContent>
              <TabsContent value="import" className="space-y-4">
                <div className="border border-dashed border-border p-8 text-center cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => createFileRef.current?.click()}>
                  <Upload className="w-6 h-6 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm">Importer un fichier .xlsx ou .csv</p>
                  <input ref={createFileRef} type="file" accept=".xlsx,.csv,.xls" className="hidden" onChange={handleCreateImport} />
                </div>
                {newRecipients.length > 0 && newRecipients.some((r) => r.lastName || r.contact) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileSpreadsheet className="w-4 h-4" /> {newRecipients.length} contact(s) prêt(s)
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button className="rounded-full bg-foreground text-background" onClick={createList} disabled={creating}>
              {creating ? "Création..." : "Créer la liste"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={detail !== null} onOpenChange={(open) => { if (!open) setDetail(null); }}>
        <DialogContent className="max-w-2xl">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>{detail.nom}</DialogTitle>
                <DialogDescription>{detail.description || "Aucune description."}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <ScrollArea className="h-56 border border-border">
                  {loadingDetail ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Chargement...</p>
                  ) : !detailRecipients || detailRecipients.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Aucun contact dans cette liste.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border hover:bg-transparent">
                          <TableHead>Nom</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailRecipients.map((r) => (
                          <TableRow key={r.id} className="border-border">
                            <TableCell className="text-sm">{r.prenom} {r.nom}</TableCell>
                            <TableCell className="font-mono text-sm">{r.contact}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => removeRecipientFromList(r.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </ScrollArea>

                <div className="space-y-3 border-t border-border pt-4">
                  <Label className="text-xs text-muted-foreground">Ajouter des contacts</Label>
                  {addDraft.map((r) => (
                    <div key={r.id} className="grid sm:grid-cols-4 gap-3 items-start">
                      <Input placeholder="Nom" value={r.lastName} onChange={(e) => setAddDraft((prev) => prev.map((x) => x.id === r.id ? { ...x, lastName: e.target.value } : x))} className="h-10 bg-input" />
                      <Input placeholder="Prénom" value={r.firstName} onChange={(e) => setAddDraft((prev) => prev.map((x) => x.id === r.id ? { ...x, firstName: e.target.value } : x))} className="h-10 bg-input" />
                      <Input placeholder="Email ou téléphone" value={r.contact} onChange={(e) => setAddDraft((prev) => prev.map((x) => x.id === r.id ? { ...x, contact: e.target.value } : x))} className="h-10 bg-input" />
                      <Button variant="ghost" size="icon" onClick={() => setAddDraft((prev) => prev.length > 1 ? prev.filter((x) => x.id !== r.id) : prev)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-3">
                    <Button variant="outline" size="sm" className="rounded-full" onClick={() => setAddDraft((prev) => [...prev, emptyDraft()])}>
                      <Plus className="w-4 h-4 mr-2" /> Ligne
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-full" onClick={() => detailFileRef.current?.click()}>
                      <Upload className="w-4 h-4 mr-2" /> Importer
                    </Button>
                    <input ref={detailFileRef} type="file" accept=".xlsx,.csv,.xls" className="hidden" onChange={handleDetailImport} />
                    <Button size="sm" className="rounded-full bg-foreground text-background ml-auto" onClick={addRecipientsToDetail}>
                      Ajouter à la liste
                    </Button>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" className="rounded-full text-destructive" onClick={() => removeList(detail)}>
                  <Trash2 className="w-4 h-4 mr-2" /> Supprimer la liste
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
