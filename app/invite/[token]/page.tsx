"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { acceptInvite } from "@/lib/supabase/repositories/organizations";
import { ChapnetLogo } from "@/components/landing/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { notify } from "@/lib/kineet/notify";

type ViewState =
  | { kind: "checking" }
  | { kind: "set-password"; email: string; organizationName: string }
  | { kind: "existing-account" }
  | { kind: "error"; message: string };

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [view, setView] = useState<ViewState>({ kind: "checking" });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Already signed in: keep the existing instant-join behaviour unchanged.
      if (user) {
        const result = await acceptInvite(token);
        if (!active) return;
        if (!result.success || !result.slug) {
          setView({ kind: "error", message: result.error ?? "Ce lien d'invitation n'est plus valide." });
          return;
        }
        router.replace(`/org/${result.slug}/dashboard`);
        return;
      }

      // Not signed in: verify the token first, then offer to set a password.
      const res = await fetch(`/api/organizations/invites/${token}`);
      const data = await res.json();
      if (!active) return;

      if (!data.success) {
        setView({ kind: "error", message: data.error ?? "Ce lien d'invitation n'est plus valide." });
        return;
      }

      setView({ kind: "set-password", email: data.email, organizationName: data.organizationName });
    })();

    return () => {
      active = false;
    };
  }, [token, router]);

  const handleSetPassword = async () => {
    if (password.length < 6) {
      notify.error("Mot de passe trop court", "Il doit contenir au moins 6 caractères.");
      return;
    }
    if (password !== confirmPassword) {
      notify.error("Les mots de passe ne correspondent pas", "Vérifiez la confirmation.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/organizations/invites/${token}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (!data.success) {
        if (data.accountExists) {
          setView({ kind: "existing-account" });
        } else {
          notify.error("Erreur", data.error ?? "Impossible de finaliser l'inscription.");
        }
        setSubmitting(false);
        return;
      }

      // Session is already established server-side by the activate route.
      if (!data.signedIn) {
        setView({ kind: "error", message: "Compte créé, mais la connexion automatique a échoué. Connectez-vous manuellement." });
        return;
      }

      notify.success("Bienvenue sur Chapnet", "Votre compte est prêt.");
      router.replace(`/org/${data.slug}/dashboard`);
      router.refresh();
    } catch {
      notify.error("Erreur", "Impossible de finaliser l'inscription.");
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-md space-y-8">
        <ChapnetLogo markClassName="w-8 h-8" wordmarkClassName="text-2xl" className="justify-center" />

        {view.kind === "checking" && (
          <p className="text-muted-foreground flex items-center gap-2 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Vérification de l'invitation...
          </p>
        )}

        {view.kind === "error" && (
          <p className="text-destructive text-center">{view.message}</p>
        )}

        {view.kind === "existing-account" && (
          <div className="text-center space-y-4">
            <p className="text-foreground">
              Un compte existe déjà avec cette adresse e-mail.
            </p>
            <Button asChild className="rounded-full">
              <a href={`/login?redirect=${encodeURIComponent(`/invite/${token}`)}`}>Se connecter pour rejoindre l'organisation</a>
            </Button>
          </div>
        )}

        {view.kind === "set-password" && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="font-display font-bold text-2xl tracking-tight mb-2">
                Rejoindre {view.organizationName}
              </h1>
              <p className="text-muted-foreground text-sm">
                Définissez un mot de passe pour <span className="text-foreground">{view.email}</span>
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Mot de passe</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 bg-input pr-12"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Confirmer le mot de passe</Label>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-12 bg-input"
                  placeholder="••••••••"
                  onKeyDown={(e) => e.key === "Enter" && handleSetPassword()}
                />
              </div>
            </div>

            <Button
              className="w-full h-12 rounded-full bg-foreground hover:bg-foreground/90 text-background"
              onClick={handleSetPassword}
              disabled={submitting}
            >
              {submitting ? "Création du compte..." : "Créer mon compte et rejoindre"}
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
