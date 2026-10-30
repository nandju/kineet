"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/kineet/notify";
import type { AdminPaymentLink } from "@/lib/supabase/repositories/admin";

const STATUS_LABEL: Record<AdminPaymentLink["status"], string> = {
  pending: "En attente",
  paid: "Payé",
  expired: "Expiré",
  cancelled: "Annulé",
};

export function PaymentLinkRow({ link }: { link: AdminPaymentLink }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const refresh = () => {
    startTransition(async () => {
      const res = await fetch(`/api/admin/billing/payment-links/${link.id}/refresh`, { method: "POST" });
      const data = await res.json();
      if (!data.success) {
        notify.error("Erreur", data.error ?? "Impossible de vérifier le statut.");
        return;
      }
      if (data.link.status === "paid") {
        notify.success("Paiement confirmé", "L'organisation a été prolongée.");
      } else {
        notify.info("Toujours en attente", "Aucun paiement confirmé pour ce lien pour le moment.");
      }
      router.refresh();
    });
  };

  const cancel = () => {
    startTransition(async () => {
      const res = await fetch(`/api/admin/billing/payment-links/${link.id}/cancel`, { method: "POST" });
      const data = await res.json();
      if (!data.success) {
        notify.error("Erreur", data.error ?? "Impossible d'annuler le lien.");
        return;
      }
      router.refresh();
    });
  };

  return (
    <tr className="border-b border-border last:border-0">
      <td className="p-3">
        {link.name}
        {link.description && <span className="block text-xs text-muted-foreground">{link.description}</span>}
      </td>
      <td className="p-3">{link.amount} {link.currency}</td>
      <td className="p-3 capitalize">{STATUS_LABEL[link.status]}</td>
      <td className="p-3 font-mono text-xs text-muted-foreground">
        {link.slug ?? "—"}
      </td>
      <td className="p-3 font-mono text-xs text-muted-foreground">
        {format(new Date(link.createdAt), "d MMM yyyy", { locale: fr })}
      </td>
      <td className="p-3">
        {link.status === "pending" && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refresh} disabled={pending} className="rounded-full">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Rafraîchir
            </Button>
            <Button variant="ghost" size="sm" onClick={cancel} disabled={pending} className="rounded-full text-destructive">
              <X className="w-3.5 h-3.5 mr-1.5" /> Annuler
            </Button>
          </div>
        )}
      </td>
    </tr>
  );
}
