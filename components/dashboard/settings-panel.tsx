"use client";

import { motion } from "framer-motion";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDashboard } from "@/lib/kineet/dashboard-context";
import { notify } from "@/lib/kineet/notify";
import type { Settings } from "@/lib/kineet/types";

export function SettingsPanel() {
  const { settings, updateSettings } = useDashboard();

  const patch = (partial: Partial<Settings>) => {
    const next = { ...settings, ...partial };
    updateSettings(next);
    notify.success("Préférences mises à jour", "Vos paramètres ont été enregistrés.");
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-4xl tracking-tight mb-2">Paramètres</h1>
        <p className="text-muted-foreground">Configurez vos notifications et préférences.</p>
      </motion.div>

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
            <Select value={settings.language} onValueChange={(v) => patch({ language: v })}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Français">Français</SelectItem>
                <SelectItem value="English">English</SelectItem>
                <SelectItem value="Español">Español</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <h2 className="font-display text-xl">Signature e-mail</h2>
          <Textarea
            value={settings.emailSignature}
            onChange={(e) => updateSettings({ ...settings, emailSignature: e.target.value })}
            onBlur={() => notify.info("Signature enregistrée", "Votre signature e-mail a été mise à jour.")}
            rows={4}
            className="bg-input resize-none"
          />
        </div>
      </motion.div>
    </div>
  );
}
