"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { acceptInvite } from "@/lib/supabase/repositories/organizations";
import { ChapnetLogo } from "@/components/landing/logo";
import { Loader2 } from "lucide-react";

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "error">("checking");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace(`/login?redirect=/invite/${token}`);
        return;
      }

      const result = await acceptInvite(token);
      if (!active) return;

      if (!result.success || !result.slug) {
        setStatus("error");
        setError(result.error ?? "Ce lien d'invitation n'est plus valide.");
        return;
      }

      router.replace(`/org/${result.slug}/dashboard`);
    })();

    return () => {
      active = false;
    };
  }, [token, router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="text-center space-y-6">
        <ChapnetLogo markClassName="w-8 h-8" wordmarkClassName="text-2xl" className="justify-center" />
        {status === "checking" ? (
          <p className="text-muted-foreground flex items-center gap-2 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Vérification de l'invitation...
          </p>
        ) : (
          <p className="text-destructive">{error}</p>
        )}
      </div>
    </main>
  );
}
