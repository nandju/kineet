"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Check,
  FileSpreadsheet,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Send,
  Trash2,
  Upload,
  Eye,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useDashboard } from "@/lib/kineet/dashboard-context";
import { notify } from "@/lib/kineet/notify";
import { isValidContact } from "@/lib/kineet/notify";
import type { Channel, Recipient } from "@/lib/kineet/types";
import { CHANNEL_LABELS } from "@/lib/kineet/types";
import {
  estimateCampaignCost,
  formatCurrency,
  generateId,
  parseSpreadsheetFile,
  replaceVariables,
  simulateSmtpConnection,
} from "@/lib/kineet/campaign-utils";
import { SAMPLE_FIRST_NAMES, SAMPLE_LAST_NAMES } from "@/lib/kineet/data";

type WizardView = "form" | "summary" | "sending" | "done";

interface SenderWhatsApp { number: string; name: string }
interface SenderEmail {
  name: string; email: string; smtpServer: string; port: string;
  username: string; password: string; replyTo: string; signature: string;
}
interface SenderSms { number: string; displayName: string }

const CHANNELS: { id: Channel; icon: typeof MessageSquare; desc: string }[] = [
  { id: "whatsapp", icon: MessageSquare, desc: "Messages instantanés personnalisés" },
  { id: "email", icon: Mail, desc: "Campagnes e-mail avec sujet et signature" },
  { id: "sms", icon: Phone, desc: "SMS courts à grande échelle" },
];

const STEPS = ["Canal", "Expéditeur", "Destinataires", "Message", "Aperçu"];

function emptyRecipient(): Recipient {
  return { id: generateId("rcp"), lastName: "", firstName: "", contact: "", valid: false };
}

export function NewCampaignPanel() {
  const { addCampaign, setSection } = useDashboard();

  const [view, setView] = useState<WizardView>("form");
  const [step, setStep] = useState(0);
  const [channel, setChannel] = useState<Channel | null>(null);

  const [waSender, setWaSender] = useState<SenderWhatsApp>({ number: "", name: "" });
  const [emailSender, setEmailSender] = useState<SenderEmail>({
    name: "", email: "", smtpServer: "", port: "587",
    username: "", password: "", replyTo: "", signature: "",
  });
  const [smsSender, setSmsSender] = useState<SenderSms>({ number: "", displayName: "" });
  const [senderErrors, setSenderErrors] = useState<Record<string, string>>({});

  const [recipients, setRecipients] = useState<Recipient[]>([emptyRecipient()]);
  const [importMeta, setImportMeta] = useState<{ total: number; valid: number; invalid: number; columns: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [messageErrors, setMessageErrors] = useState<Record<string, string>>({});

  const [sendProgress, setSendProgress] = useState({ sent: 0, pending: 0, failed: 0, total: 0, percent: 0, eta: 0 });

  const validRecipients = useMemo(() => recipients.filter((r) => r.valid), [recipients]);
  const previewRecipient = validRecipients[0] ?? {
    firstName: SAMPLE_FIRST_NAMES[0], lastName: SAMPLE_LAST_NAMES[0], contact: "demo@kineet.fr",
  };

  const senderLabel = useMemo(() => {
    if (channel === "whatsapp") return waSender.number || "—";
    if (channel === "email") return emailSender.email || "—";
    if (channel === "sms") return smsSender.number || "—";
    return "—";
  }, [channel, waSender, emailSender, smsSender]);

  const estimatedCost = channel ? formatCurrency(estimateCampaignCost(validRecipients.length, channel)) : "—";

  const validateChannel = () => {
    if (!channel) { notify.error("Canal non sélectionné", "Veuillez choisir un canal."); return false; }
    return true;
  };

  const validateSender = () => {
    const errs: Record<string, string> = {};
    if (channel === "whatsapp") {
      if (!waSender.number.trim()) errs.number = "Le numéro WhatsApp est requis.";
      else if (!isValidContact(waSender.number, "whatsapp")) errs.number = "Numéro invalide.";
    } else if (channel === "email") {
      if (!emailSender.name.trim()) errs.name = "Le nom de l'expéditeur est requis.";
      if (!emailSender.email.trim()) errs.email = "L'adresse e-mail est requise.";
      else if (!isValidContact(emailSender.email, "email")) errs.email = "Adresse e-mail invalide.";
      if (!emailSender.smtpServer.trim()) errs.smtpServer = "Le serveur SMTP est requis.";
      if (!emailSender.port.trim()) errs.port = "Le port est requis.";
      if (!emailSender.username.trim()) errs.username = "Le nom d'utilisateur SMTP est requis.";
      if (!emailSender.password.trim()) errs.password = "Le mot de passe SMTP est requis.";
    } else if (channel === "sms") {
      if (!smsSender.number.trim()) errs.number = "Le numéro d'envoi est requis.";
      else if (!isValidContact(smsSender.number, "sms")) errs.number = "Numéro invalide.";
      if (!smsSender.displayName.trim()) errs.displayName = "Le nom d'affichage est requis.";
    }
    setSenderErrors(errs);
    if (Object.keys(errs).length) { notify.error("Erreur de validation", "Veuillez corriger les champs indiqués."); return false; }
    return true;
  };

  const validateRecipients = () => {
    if (validRecipients.length === 0) {
      notify.error("Aucun destinataire", "Ajoutez au moins un destinataire valide.");
      return false;
    }
    return true;
  };

  const validateMessage = () => {
    const errs: Record<string, string> = {};
    if (channel === "email" && !subject.trim()) errs.subject = "L'objet est requis.";
    if (!message.trim()) errs.message = "Le message est requis.";
    setMessageErrors(errs);
    if (Object.keys(errs).length) { notify.error("Erreur de validation", "Veuillez compléter le message."); return false; }
    return true;
  };

  const goNext = () => {
    if (step === 0 && !validateChannel()) return;
    if (step === 1 && !validateSender()) return;
    if (step === 2 && !validateRecipients()) return;
    if (step === 3 && !validateMessage()) return;
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else setView("summary");
  };

  const goBack = () => {
    if (view === "summary") { setView("form"); setStep(3); return; }
    if (step > 0) setStep((s) => s - 1);
  };

  const updateRecipient = (id: string, field: keyof Recipient, value: string) => {
    setRecipients((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: value };
        updated.valid = Boolean(
          updated.lastName.trim() && updated.firstName.trim() &&
          channel && isValidContact(updated.contact, channel),
        );
        return updated;
      }),
    );
  };

  const addRecipient = () => {
    setRecipients((prev) => [...prev, emptyRecipient()]);
    notify.success("Destinataire ajouté", "Une nouvelle ligne a été ajoutée.");
  };

  const removeRecipient = (id: string) => {
    setRecipients((prev) => prev.length > 1 ? prev.filter((r) => r.id !== id) : prev);
    notify.info("Destinataire supprimé", "La ligne a été retirée.");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !channel) return;
    try {
      const result = await parseSpreadsheetFile(file, channel);
      if (result.empty) {
        notify.error("Fichier vide", "Le fichier Excel ou CSV ne contient aucune donnée.");
        return;
      }
      setRecipients(result.recipients.length ? result.recipients : [emptyRecipient()]);
      setImportMeta({ total: result.totalRows, valid: result.validRows, invalid: result.invalidRows, columns: result.detectedColumns });
      notify.success("Import terminé", `${result.validRows} ligne(s) valide(s) sur ${result.totalRows}.`);
    } catch {
      notify.error("Erreur d'import", "Impossible de lire le fichier.");
    }
    e.target.value = "";
  };

  const testConnection = async () => {
    if (!validateSender()) return;
    await new Promise((r) => setTimeout(r, 1200));
    const ok = simulateSmtpConnection(
      emailSender.email, emailSender.smtpServer, emailSender.port,
      emailSender.username, emailSender.password,
    );
    if (ok) notify.success("Connexion réussie", "Votre configuration SMTP est opérationnelle.");
    else notify.error("Connexion échouée", "Vérifiez vos identifiants SMTP.");
  };

  const startSending = useCallback(() => {
    const total = validRecipients.length;
    const failedCount = Math.max(1, Math.floor(total * 0.02));
    setView("sending");
    setSendProgress({ sent: 0, pending: total, failed: 0, total, percent: 0, eta: Math.ceil(total / 50) });

    let sent = 0;
    let failed = 0;
    const interval = setInterval(() => {
      sent += Math.min(Math.floor(Math.random() * 8) + 3, total - sent - failed);
      if (sent + failed >= total) {
        sent = total - failedCount;
        failed = failedCount;
        clearInterval(interval);
        setSendProgress({ sent, pending: 0, failed, total, percent: 100, eta: 0 });
        setTimeout(() => {
          addCampaign({
            id: generateId("cmp"),
            name: `Campagne ${CHANNEL_LABELS[channel!]} — ${new Date().toLocaleDateString("fr-FR")}`,
            channel: channel!,
            status: "sent",
            recipients: total,
            delivered: sent,
            failed,
            subject: channel === "email" ? subject : undefined,
            message,
            createdAt: new Date().toISOString(),
          });
          notify.success("Campagne envoyée", `${sent} message(s) distribué(s) avec succès.`);
          setView("done");
        }, 600);
        return;
      }
      const pending = total - sent - failed;
      const percent = Math.round(((sent + failed) / total) * 100);
      setSendProgress({ sent, pending, failed, total, percent, eta: Math.ceil(pending / 50) });
    }, 200);
  }, [validRecipients, channel, subject, message, addCampaign]);

  useEffect(() => {
    if (channel) {
      setRecipients((prev) =>
        prev.map((r) => ({
          ...r,
          valid: Boolean(r.lastName.trim() && r.firstName.trim() && isValidContact(r.contact, channel)),
        })),
      );
    }
  }, [channel]);

  if (view === "sending" || view === "done") {
    return (
      <div className="max-w-2xl mx-auto space-y-8 py-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4">
          {view === "done" ? (
            <>
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="font-display text-3xl">Campagne envoyée !</h2>
              <p className="text-muted-foreground">
                {sendProgress.sent} message(s) envoyé(s), {sendProgress.failed} échec(s).
              </p>
              <div className="flex gap-4 justify-center pt-4">
                <Button variant="outline" className="rounded-full" onClick={() => { setView("form"); setStep(0); setChannel(null); setRecipients([emptyRecipient()]); setMessage(""); setSubject(""); }}>
                  Nouvelle campagne
                </Button>
                <Button className="rounded-full bg-foreground text-background" onClick={() => setSection("history")}>
                  Voir l&apos;historique
                </Button>
              </div>
            </>
          ) : (
            <>
              <h2 className="font-display text-3xl">Envoi en cours...</h2>
              <Progress value={sendProgress.percent} className="h-2" />
              <div className="grid grid-cols-3 gap-4 text-sm pt-4">
                <div className="border border-border p-4"><p className="text-muted-foreground">Envoyés</p><p className="font-mono text-xl text-green-400">{sendProgress.sent}</p></div>
                <div className="border border-border p-4"><p className="text-muted-foreground">En attente</p><p className="font-mono text-xl">{sendProgress.pending}</p></div>
                <div className="border border-border p-4"><p className="text-muted-foreground">Échecs</p><p className="font-mono text-xl text-destructive">{sendProgress.failed}</p></div>
              </div>
              <p className="text-muted-foreground font-mono text-sm">Temps restant estimé : ~{sendProgress.eta}s</p>
            </>
          )}
        </motion.div>
      </div>
    );
  }

  if (view === "summary") {
    return (
      <div className="space-y-8 max-w-3xl">
        <h1 className="font-display text-4xl tracking-tight">Récapitulatif</h1>
        <div className="border border-border bg-card divide-y divide-border">
          {[
            ["Canal", CHANNEL_LABELS[channel!]],
            ["Expéditeur", senderLabel],
            ["Destinataires", `${validRecipients.length} contact(s)`],
            ...(channel === "email" ? [["Objet", subject]] : []),
            ["Message", message],
            ["Coût estimé", estimatedCost],
          ].map(([label, value]) => (
            <div key={label} className="p-5 flex flex-col sm:flex-row sm:items-start gap-2">
              <span className="text-sm text-muted-foreground w-36 shrink-0">{label}</span>
              <span className="text-sm whitespace-pre-wrap">{value}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-4">
          <Button variant="outline" className="rounded-full" onClick={() => { setView("form"); setStep(0); }}>
            <Pencil className="w-4 h-4 mr-2" /> Modifier
          </Button>
          <Button className="rounded-full bg-foreground text-background" onClick={startSending}>
            <Send className="w-4 h-4 mr-2" /> Envoyer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl tracking-tight mb-2">Nouvelle campagne</h1>
        <p className="text-muted-foreground">Créez et envoyez une campagne en quelques étapes.</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {STEPS.map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => i < step && setStep(i)}
            className={cn(
              "px-4 py-2 text-xs font-mono border transition-colors",
              i === step ? "border-foreground bg-foreground text-background" :
              i < step ? "border-border text-foreground cursor-pointer hover:bg-secondary" :
              "border-border text-muted-foreground",
            )}
          >
            {String(i + 1).padStart(2, "0")} {s}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {step === 0 && (
            <div className="grid sm:grid-cols-3 gap-4">
              {CHANNELS.map(({ id, icon: Icon, desc }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setChannel(id)}
                  className={cn(
                    "border p-6 text-left transition-all hover-lift",
                    channel === id ? "border-foreground bg-secondary" : "border-border bg-card",
                  )}
                >
                  <Icon className="w-6 h-6 mb-4 text-muted-foreground" />
                  <p className="font-display text-xl mb-2">{CHANNEL_LABELS[id]}</p>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                  {channel === id && <Check className="w-5 h-5 mt-4 text-green-400" />}
                </button>
              ))}
            </div>
          )}

          {step === 1 && channel === "whatsapp" && (
            <div className="border border-border bg-card p-6 space-y-5 max-w-lg">
              <div className="space-y-2">
                <Label>Numéro WhatsApp</Label>
                <Input value={waSender.number} onChange={(e) => setWaSender({ ...waSender, number: e.target.value })} className="h-11 bg-input" placeholder="+33 6 12 34 56 78" />
                {senderErrors.number && <p className="text-sm text-destructive">{senderErrors.number}</p>}
              </div>
              <div className="space-y-2">
                <Label>Nom de l&apos;expéditeur <span className="text-muted-foreground">(optionnel)</span></Label>
                <Input value={waSender.name} onChange={(e) => setWaSender({ ...waSender, name: e.target.value })} className="h-11 bg-input" />
              </div>
              <Alert><AlertTriangle className="w-4 h-4" /><AlertDescription>Le numéro utilisé doit être connecté à un fournisseur compatible WhatsApp.</AlertDescription></Alert>
            </div>
          )}

          {step === 1 && channel === "email" && (
            <div className="border border-border bg-card p-6 space-y-5 max-w-lg">
              {([
                ["name", "Nom de l'expéditeur", "text"],
                ["email", "Adresse e-mail", "email"],
                ["smtpServer", "Serveur SMTP", "text"],
                ["port", "Port", "text"],
                ["username", "Nom d'utilisateur SMTP", "text"],
                ["password", "Mot de passe SMTP", "password"],
                ["replyTo", "Adresse de réponse", "email"],
              ] as const).map(([key, label, type]) => (
                <div key={key} className="space-y-2">
                  <Label>{label}</Label>
                  <Input type={type} value={emailSender[key]} onChange={(e) => setEmailSender({ ...emailSender, [key]: e.target.value })} className="h-11 bg-input" />
                  {senderErrors[key] && <p className="text-sm text-destructive">{senderErrors[key]}</p>}
                </div>
              ))}
              <div className="space-y-2">
                <Label>Signature</Label>
                <Textarea value={emailSender.signature} onChange={(e) => setEmailSender({ ...emailSender, signature: e.target.value })} rows={3} className="bg-input" />
              </div>
              <Button variant="outline" className="rounded-full" onClick={testConnection}>Tester la connexion</Button>
            </div>
          )}

          {step === 1 && channel === "sms" && (
            <div className="border border-border bg-card p-6 space-y-5 max-w-lg">
              <div className="space-y-2">
                <Label>Numéro d&apos;envoi</Label>
                <Input value={smsSender.number} onChange={(e) => setSmsSender({ ...smsSender, number: e.target.value })} className="h-11 bg-input" />
                {senderErrors.number && <p className="text-sm text-destructive">{senderErrors.number}</p>}
              </div>
              <div className="space-y-2">
                <Label>Nom d&apos;affichage</Label>
                <Input value={smsSender.displayName} onChange={(e) => setSmsSender({ ...smsSender, displayName: e.target.value })} className="h-11 bg-input" />
                {senderErrors.displayName && <p className="text-sm text-destructive">{senderErrors.displayName}</p>}
              </div>
              <Alert><AlertDescription>Le numéro doit disposer d&apos;un forfait SMS actif ou être connecté à une passerelle SMS.</AlertDescription></Alert>
            </div>
          )}

          {step === 2 && (
            <Tabs defaultValue="manual" className="space-y-6">
              <TabsList>
                <TabsTrigger value="manual">Saisie manuelle</TabsTrigger>
                <TabsTrigger value="import">Import Excel</TabsTrigger>
              </TabsList>
              <TabsContent value="manual" className="space-y-4">
                {recipients.map((r) => (
                  <div key={r.id} className="grid sm:grid-cols-4 gap-3 items-start border border-border p-4">
                    <div><Label className="text-xs">Nom</Label><Input value={r.lastName} onChange={(e) => updateRecipient(r.id, "lastName", e.target.value)} className="h-10 bg-input mt-1" /></div>
                    <div><Label className="text-xs">Prénom</Label><Input value={r.firstName} onChange={(e) => updateRecipient(r.id, "firstName", e.target.value)} className="h-10 bg-input mt-1" /></div>
                    <div>
                      <Label className="text-xs">{channel === "email" ? "E-mail" : "Téléphone"}</Label>
                      <Input value={r.contact} onChange={(e) => updateRecipient(r.id, "contact", e.target.value)} className="h-10 bg-input mt-1" />
                    </div>
                    <div className="flex items-end gap-2 pb-0.5">
                      <Badge variant={r.valid ? "secondary" : "destructive"} className="text-xs">{r.valid ? "Valide" : "Invalide"}</Badge>
                      <Button variant="ghost" size="icon" onClick={() => removeRecipient(r.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="rounded-full" onClick={addRecipient}><Plus className="w-4 h-4 mr-2" /> Ajouter</Button>
              </TabsContent>
              <TabsContent value="import" className="space-y-4">
                <div
                  className="border border-dashed border-border p-12 text-center cursor-pointer hover:bg-secondary/50 transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
                  <p className="font-display text-lg mb-2">Importer un fichier</p>
                  <p className="text-sm text-muted-foreground">Formats acceptés : .xlsx, .csv</p>
                  <input ref={fileRef} type="file" accept=".xlsx,.csv,.xls" className="hidden" onChange={handleImport} />
                </div>
                {importMeta && (
                  <div className="border border-border p-4 space-y-3">
                    <div className="flex items-center gap-2"><FileSpreadsheet className="w-4 h-4" /><span className="font-mono text-sm">Aperçu de l&apos;import</span></div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div><p className="text-muted-foreground">Lignes</p><p className="font-mono">{importMeta.total}</p></div>
                      <div><p className="text-muted-foreground">Valides</p><p className="font-mono text-green-400">{importMeta.valid}</p></div>
                      <div><p className="text-muted-foreground">Invalides</p><p className="font-mono text-destructive">{importMeta.invalid}</p></div>
                    </div>
                    <p className="text-xs text-muted-foreground">Colonnes détectées : {importMeta.columns.join(", ") || "—"}</p>
                    <div className="border border-border overflow-hidden max-h-64 overflow-y-auto">
                      <Table>
                        <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Prénom</TableHead><TableHead>Contact</TableHead><TableHead></TableHead></TableRow></TableHeader>
                        <TableBody>
                          {recipients.map((r) => (
                            <TableRow key={r.id}>
                              <TableCell>{r.lastName}</TableCell>
                              <TableCell>{r.firstName}</TableCell>
                              <TableCell>{r.contact}</TableCell>
                              <TableCell><Button variant="ghost" size="icon" onClick={() => removeRecipient(r.id)}><Trash2 className="w-4 h-4" /></Button></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}

          {step === 3 && (
            <div className="border border-border bg-card p-6 space-y-5 max-w-2xl">
              {channel === "email" && (
                <div className="space-y-2">
                  <Label>Objet</Label>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="h-11 bg-input" />
                  {messageErrors.subject && <p className="text-sm text-destructive">{messageErrors.subject}</p>}
                </div>
              )}
              <div className="space-y-2">
                <div className="flex justify-between"><Label>Message</Label><span className="text-xs font-mono text-muted-foreground">{message.length} caractères</span></div>
                <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} className="bg-input resize-none" placeholder="Bonjour {{prénom}}, votre commande est prête." />
                {messageErrors.message && <p className="text-sm text-destructive">{messageErrors.message}</p>}
              </div>
              <p className="text-xs text-muted-foreground">Variables disponibles : <code className="font-mono">{`{{nom}}`}</code>, <code className="font-mono">{`{{prénom}}`}</code></p>
              {channel === "email" && emailSender.signature && (
                <div className="space-y-2"><Label>Signature</Label><p className="text-sm text-muted-foreground border border-border p-3">{emailSender.signature}</p></div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="border border-border bg-card p-6 max-w-2xl space-y-4">
              <div className="flex items-center gap-2 text-muted-foreground"><Eye className="w-4 h-4" /><span className="text-sm font-mono">Aperçu du message final</span></div>
              {channel === "email" && subject && (
                <div><p className="text-xs text-muted-foreground mb-1">Objet</p><p className="font-medium">{replaceVariables(subject, previewRecipient)}</p></div>
              )}
              <div className="border border-border p-4 bg-secondary/30 whitespace-pre-wrap text-sm">
                {replaceVariables(message, previewRecipient)}
                {channel === "email" && emailSender.signature && (
                  <><br /><br />{emailSender.signature}</>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Aperçu pour : {previewRecipient.firstName} {previewRecipient.lastName} ({previewRecipient.contact})
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex gap-4 pt-4">
        {(step > 0 || view === "form") && step > 0 && (
          <Button variant="outline" className="rounded-full" onClick={goBack}>Retour</Button>
        )}
        <Button className="rounded-full bg-foreground text-background" onClick={goNext}>
          {step === STEPS.length - 1 ? "Voir le récapitulatif" : "Continuer"}
        </Button>
      </div>
    </div>
  );
}
