"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { notify } from "@/lib/kineet/notify";

export function PaymentLinkForm({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("XOF");
  const [description, setDescription] = useState("");
  const [extendsDays, setExtendsDays] = useState("30");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [pending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount.trim() || !customerName.trim() || !customerEmail.trim()) {
      notify.error("Champs manquants", "Nom, montant, et nom/e-mail du client sont requis.");
      return;
    }

    startTransition(async () => {
      const res = await fetch(`/api/admin/billing/organizations/${organizationId}/payment-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          amount: amount.trim(),
          currency,
          description: description.trim() || undefined,
          extendsDays: Number(extendsDays),
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
        }),
      });
      const data = await res.json();
      if (!data.success) {
        notify.error("Erreur", data.error ?? "Le lien n'a pas pu être créé.");
        return;
      }
      notify.success("Lien créé", "Le lien de paiement a été généré auprès de SasPay.");
      setName("");
      setAmount("");
      setDescription("");
      setCustomerName("");
      setCustomerEmail("");
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 max-w-xl">
      <div className="space-y-2 col-span-2">
        <Label>Nom (facture)</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Abonnement — octobre 2026" />
      </div>
      <div className="space-y-2">
        <Label>Montant</Label>
        <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="25000.00" />
      </div>
      <div className="space-y-2">
        <Label>Devise</Label>
        <Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} />
      </div>
      <div className="space-y-2 col-span-2">
        <Label>Description (optionnel)</Label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Nom du client</Label>
        <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Requis par SasPay" />
      </div>
      <div className="space-y-2">
        <Label>E-mail du client</Label>
        <Input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="Requis par SasPay" />
      </div>
      <div className="space-y-2">
        <Label>Jours d'accès accordés au paiement</Label>
        <Input type="number" min={1} value={extendsDays} onChange={(e) => setExtendsDays(e.target.value)} />
      </div>
      <div className="col-span-2">
        <Button type="submit" disabled={pending} className="rounded-full">
          {pending ? "Création..." : "Générer le lien de paiement"}
        </Button>
      </div>
    </form>
  );
}
