"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChapnetLogo } from "@/components/landing/logo";
import { createClient } from "@/lib/supabase/client";
import { createOrganization } from "@/lib/supabase/repositories/organizations";
import { notify } from "@/lib/kineet/notify";

export default function OnboardingOrganisationPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      notify.error("Nom requis", "Donnez un nom à votre organisation.");
      return;
    }
    setCreating(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      const org = await createOrganization(supabase, user.id, name.trim());
      router.replace(`/org/${org.slug}/dashboard`);
    } catch {
      notify.error("Erreur", "L'organisation n'a pas pu être créée.");
      setCreating(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-md space-y-8">
        <ChapnetLogo markClassName="w-8 h-8" wordmarkClassName="text-2xl" />
        <div>
          <h1 className="font-display font-bold text-3xl tracking-tight mb-2">Créez votre organisation</h1>
          <p className="text-muted-foreground">
            Un espace pour vos campagnes, listes et paramètres — vous pourrez inviter votre équipe ensuite.
          </p>
        </div>
        <div className="space-y-2">
          <Label>Nom de l'organisation</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Mon entreprise"
            className="h-12 bg-input"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
        </div>
        <Button className="w-full h-12 rounded-full bg-foreground text-background" onClick={handleCreate} disabled={creating}>
          {creating ? "Création..." : "Créer et continuer"}
        </Button>
      </div>
    </main>
  );
}
