"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Camera, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useDashboard } from "@/lib/kineet/dashboard-context";
import { notify } from "@/lib/kineet/notify";
import { isValidEmail, isValidPhone } from "@/lib/kineet/notify";

export function ProfilePanel() {
  const { profile, updateProfile } = useDashboard();
  const [form, setForm] = useState(profile);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Le nom est requis.";
    if (!form.company.trim()) next.company = "L'entreprise est requise.";
    if (!form.phone.trim()) next.phone = "Le téléphone est requis.";
    else if (!isValidPhone(form.phone)) next.phone = "Numéro de téléphone invalide.";
    if (!form.email.trim()) next.email = "L'e-mail est requis.";
    else if (!isValidEmail(form.email)) next.email = "Adresse e-mail invalide.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = () => {
    if (!validate()) {
      notify.error("Erreur de validation", "Veuillez corriger les champs indiqués.");
      return;
    }
    updateProfile(form);
    notify.success("Profil enregistré", "Vos informations ont été mises à jour.");
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({ ...f, photo: reader.result as string }));
      notify.info("Photo mise à jour", "Votre photo de profil a été modifiée.");
    };
    reader.readAsDataURL(file);
  };

  const initials = form.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="space-y-8 max-w-2xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-4xl tracking-tight mb-2">Profil</h1>
        <p className="text-muted-foreground">Gérez vos informations personnelles.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="border border-border bg-card p-6 lg:p-8 space-y-6"
      >
        <div className="flex items-center gap-6">
          <div className="relative">
            <Avatar className="w-20 h-20 border border-border">
              <AvatarImage src={form.photo} alt={form.name} />
              <AvatarFallback className="font-display text-xl">{initials}</AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-foreground text-background"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          </div>
          <div>
            <p className="font-display text-xl">{form.name || "Votre nom"}</p>
            <p className="text-sm text-muted-foreground">{form.company || "Votre entreprise"}</p>
          </div>
        </div>

        <div className="grid gap-5">
          {([
            ["name", "Nom", "text"],
            ["company", "Entreprise", "text"],
            ["phone", "Téléphone", "tel"],
            ["email", "E-mail", "email"],
          ] as const).map(([key, label, type]) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={key}>{label}</Label>
              <Input
                id={key}
                type={type}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="h-11 bg-input"
              />
              {errors[key] && <p className="text-sm text-destructive">{errors[key]}</p>}
            </div>
          ))}
        </div>

        <Button onClick={handleSave} className="rounded-full bg-foreground text-background hover:bg-foreground/90">
          <Save className="w-4 h-4 mr-2" />
          Enregistrer
        </Button>
      </motion.div>
    </div>
  );
}
