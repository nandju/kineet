"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, AlertTriangle, Mail, MessageSquare, Phone } from "lucide-react";
import { useDashboard } from "@/lib/kineet/dashboard-context";
import { notify } from "@/lib/kineet/notify";
import type { Settings } from "@/lib/kineet/types";
import { useProviders, useNotifications } from "@/lib/hooks";
import type { EmailConfig, WhatsAppConfig, SmsConfig } from "@/lib/types";

export function SettingsPanelV2() {
  const { settings, updateSettings } = useDashboard();
  const { 
    configureEmail, 
    configureWhatsApp, 
    configureSms,
    testEmailConnection,
    testWhatsAppConnection,
    testSmsConnection,
    isEmailConfigured,
    isWhatsAppConfigured,
    isSmsConfigured,
    isTesting,
    emailConfig,
    whatsappConfig,
    smsConfig
  } = useProviders();
  const { configSaved, connectionSuccess, connectionFailed } = useNotifications();

  // Email configuration state
  const [emailForm, setEmailForm] = useState<EmailConfig>({
    type: 'email',
    status: 'not_configured',
    expediteur: '',
    adresseEmail: '',
    serveurSmtp: '',
    port: 587,
    utilisateur: '',
    motDePasse: '',
    signature: '',
    adresseReponse: '',
    securite: 'tls',
  });

  // WhatsApp configuration state
  const [whatsappForm, setWhatsappForm] = useState<WhatsAppConfig>({
    type: 'whatsapp',
    status: 'not_configured',
    apiKey: '',
    phoneNumber: '',
    businessId: '',
  });

  // SMS configuration state
  const [smsForm, setSmsForm] = useState<SmsConfig>({
    type: 'sms',
    status: 'not_configured',
    apiKey: '',
    senderId: '',
    gatewayType: 'api',
    androidDeviceId: '',
  });

  const patch = (partial: Partial<Settings>) => {
    const next = { ...settings, ...partial };
    updateSettings(next);
    notify.success("Préférences mises à jour", "Vos paramètres ont été enregistrés.");
  };

  const saveEmailConfig = async () => {
    configureEmail(emailForm);
    configSaved('Email');
    
    const result = await testEmailConnection();
    if (result.success) {
      connectionSuccess('Email SMTP');
    } else {
      connectionFailed('Email SMTP', result.message);
    }
  };

  const saveWhatsAppConfig = async () => {
    configureWhatsApp(whatsappForm);
    configSaved('WhatsApp');
    
    const result = await testWhatsAppConnection();
    if (result.success) {
      connectionSuccess('WhatsApp API');
    } else {
      connectionFailed('WhatsApp API', result.message);
    }
  };

  const saveSmsConfig = async () => {
    configureSms(smsForm);
    configSaved('SMS');
    
    const result = await testSmsConnection();
    if (result.success) {
      connectionSuccess('SMS Gateway');
    } else {
      connectionFailed('SMS Gateway', result.message);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-4xl tracking-tight mb-2">Paramètres</h1>
        <p className="text-muted-foreground">Configurez vos fournisseurs d'envoi et préférences.</p>
      </motion.div>

      <Tabs defaultValue="providers" className="space-y-6">
        <TabsList>
          <TabsTrigger value="providers">Fournisseurs</TabsTrigger>
          <TabsTrigger value="preferences">Préférences</TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="border border-border bg-card divide-y divide-border"
          >
            {/* Email Configuration */}
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5" />
                  <h2 className="font-display text-xl">Configuration Email</h2>
                </div>
                {isEmailConfigured() && (
                  <div className="flex items-center gap-2 text-green-400">
                    <Check className="w-4 h-4" />
                    <span className="text-sm">Configuré</span>
                  </div>
                )}
              </div>
              
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nom de l'expéditeur</Label>
                  <Input 
                    value={emailForm.expediteur}
                    onChange={(e) => setEmailForm({ ...emailForm, expediteur: e.target.value })}
                    className="h-11 bg-input"
                    placeholder="Votre nom"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Adresse email</Label>
                  <Input 
                    type="email"
                    value={emailForm.adresseEmail}
                    onChange={(e) => setEmailForm({ ...emailForm, adresseEmail: e.target.value })}
                    className="h-11 bg-input"
                    placeholder="noreply@votreentreprise.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Serveur SMTP</Label>
                  <Input 
                    value={emailForm.serveurSmtp}
                    onChange={(e) => setEmailForm({ ...emailForm, serveurSmtp: e.target.value })}
                    className="h-11 bg-input"
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Port</Label>
                  <Input 
                    type="number"
                    value={emailForm.port}
                    onChange={(e) => setEmailForm({ ...emailForm, port: parseInt(e.target.value) })}
                    className="h-11 bg-input"
                    placeholder="587"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nom d'utilisateur</Label>
                  <Input 
                    value={emailForm.utilisateur}
                    onChange={(e) => setEmailForm({ ...emailForm, utilisateur: e.target.value })}
                    className="h-11 bg-input"
                    placeholder="votre@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mot de passe</Label>
                  <Input 
                    type="password"
                    value={emailForm.motDePasse}
                    onChange={(e) => setEmailForm({ ...emailForm, motDePasse: e.target.value })}
                    className="h-11 bg-input"
                    placeholder="••••••••"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Adresse de réponse (optionnel)</Label>
                  <Input 
                    type="email"
                    value={emailForm.adresseReponse}
                    onChange={(e) => setEmailForm({ ...emailForm, adresseReponse: e.target.value })}
                    className="h-11 bg-input"
                    placeholder="contact@votreentreprise.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sécurité</Label>
                  <select 
                    value={emailForm.securite}
                    onChange={(e) => setEmailForm({ ...emailForm, securite: e.target.value as 'none' | 'tls' | 'ssl' })}
                    className="h-11 w-full bg-input border border-border rounded-md px-3"
                  >
                    <option value="none">Aucune</option>
                    <option value="tls">TLS</option>
                    <option value="ssl">SSL</option>
                  </select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Signature (optionnel)</Label>
                <Textarea 
                  value={emailForm.signature}
                  onChange={(e) => setEmailForm({ ...emailForm, signature: e.target.value })}
                  rows={3}
                  className="bg-input resize-none"
                  placeholder="Cordialement, L'équipe Kineet"
                />
              </div>

              <div className="flex gap-4">
                <Button 
                  className="rounded-full bg-foreground text-background"
                  onClick={saveEmailConfig}
                  disabled={isTesting}
                >
                  {isTesting ? 'Test en cours...' : 'Enregistrer et tester'}
                </Button>
              </div>

              <Alert>
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  Pour Gmail, utilisez un mot de passe d'application. Pour Outlook, activez l'authentification SMTP.
                </AlertDescription>
              </Alert>
            </div>

            {/* WhatsApp Configuration */}
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5" />
                  <h2 className="font-display text-xl">Configuration WhatsApp</h2>
                </div>
                {isWhatsAppConfigured() && (
                  <div className="flex items-center gap-2 text-green-400">
                    <Check className="w-4 h-4" />
                    <span className="text-sm">Configuré</span>
                  </div>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Clé API</Label>
                  <Input 
                    type="password"
                    value={whatsappForm.apiKey}
                    onChange={(e) => setWhatsappForm({ ...whatsappForm, apiKey: e.target.value })}
                    className="h-11 bg-input"
                    placeholder="wa_xxxxxxxxxxxx"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Numéro de téléphone</Label>
                  <Input 
                    value={whatsappForm.phoneNumber}
                    onChange={(e) => setWhatsappForm({ ...whatsappForm, phoneNumber: e.target.value })}
                    className="h-11 bg-input"
                    placeholder="+33612345678"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>ID Business (optionnel)</Label>
                  <Input 
                    value={whatsappForm.businessId}
                    onChange={(e) => setWhatsappForm({ ...whatsappForm, businessId: e.target.value })}
                    className="h-11 bg-input"
                    placeholder="xxxxxxxxxxxxxxxx"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <Button 
                  className="rounded-full bg-foreground text-background"
                  onClick={saveWhatsAppConfig}
                  disabled={isTesting}
                >
                  {isTesting ? 'Test en cours...' : 'Enregistrer et tester'}
                </Button>
              </div>

              <Alert>
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  Utilisez un fournisseur compatible WhatsApp Business API (Twilio, MessageBird, etc.).
                </AlertDescription>
              </Alert>
            </div>

            {/* SMS Configuration */}
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5" />
                  <h2 className="font-display text-xl">Configuration SMS</h2>
                </div>
                {isSmsConfigured() && (
                  <div className="flex items-center gap-2 text-green-400">
                    <Check className="w-4 h-4" />
                    <span className="text-sm">Configuré</span>
                  </div>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Clé API</Label>
                  <Input 
                    type="password"
                    value={smsForm.apiKey}
                    onChange={(e) => setSmsForm({ ...smsForm, apiKey: e.target.value })}
                    className="h-11 bg-input"
                    placeholder="sms_xxxxxxxxxxxx"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sender ID (optionnel)</Label>
                  <Input 
                    value={smsForm.senderId}
                    onChange={(e) => setSmsForm({ ...smsForm, senderId: e.target.value })}
                    className="h-11 bg-input"
                    placeholder="KINEET"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type de passerelle</Label>
                  <select 
                    value={smsForm.gatewayType}
                    onChange={(e) => setSmsForm({ ...smsForm, gatewayType: e.target.value as 'api' | 'android' })}
                    className="h-11 w-full bg-input border border-border rounded-md px-3"
                  >
                    <option value="api">API SMS</option>
                    <option value="android">Appareil Android</option>
                  </select>
                </div>
                {smsForm.gatewayType === 'android' && (
                  <div className="space-y-2">
                    <Label>ID Appareil Android (optionnel)</Label>
                    <Input 
                      value={smsForm.androidDeviceId}
                      onChange={(e) => setSmsForm({ ...smsForm, androidDeviceId: e.target.value })}
                      className="h-11 bg-input"
                      placeholder="device_xxxxxxxxxxxx"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <Button 
                  className="rounded-full bg-foreground text-background"
                  onClick={saveSmsConfig}
                  disabled={isTesting}
                >
                  {isTesting ? 'Test en cours...' : 'Enregistrer et tester'}
                </Button>
              </div>

              <Alert>
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  Pour l'API, utilisez un fournisseur comme Twilio ou Nexmo. Pour Android, installez l'application passerelle.
                </AlertDescription>
              </Alert>
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="border border-border bg-card divide-y divide-border"
          >
            <div className="p-6 space-y-6">
              <h2 className="font-display text-xl">Notifications</h2>
              {([
                ["emailNotifications", "Notifications par e-mail"],
                ["pushNotifications", "Notifications push"],
                ["campaignReports", "Rapports de campagne"],
              ] as const).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <Label htmlFor={key} className="cursor-pointer">{label}</Label>
                  <Switch
                    id={key}
                    checked={settings[key]}
                    onCheckedChange={(checked) => patch({ [key]: checked })}
                  />
                </div>
              ))}
            </div>

            <div className="p-6 space-y-6">
              <h2 className="font-display text-xl">Préférences</h2>
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="darkMode">Mode sombre</Label>
                <Switch
                  id="darkMode"
                  checked={settings.darkMode}
                  onCheckedChange={(checked) => patch({ darkMode: checked })}
                />
              </div>
              <div className="space-y-2">
                <Label>Langue</Label>
                <select 
                  value={settings.language} 
                  onChange={(e) => patch({ language: e.target.value })}
                  className="h-11 w-full bg-input border border-border rounded-md px-3"
                >
                  <option value="Français">Français</option>
                  <option value="English">English</option>
                  <option value="Español">Español</option>
                </select>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <h2 className="font-display text-xl">Signature e-mail par défaut</h2>
              <Textarea
                value={settings.emailSignature}
                onChange={(e) => updateSettings({ ...settings, emailSignature: e.target.value })}
                onBlur={() => notify.info("Signature enregistrée", "Votre signature e-mail a été mise à jour.")}
                rows={4}
                className="bg-input resize-none"
              />
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
