"use client";

import { motion } from "framer-motion";
import { Send, MessageSquare, Users, TrendingUp } from "lucide-react";
import { StatCard } from "./stat-card";
import { useDashboard } from "@/lib/kineet/dashboard-context";
import { CHANNEL_LABELS } from "@/lib/kineet/types";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function HomePanel() {
  const { campaigns } = useDashboard();

  const sentCampaigns = campaigns.filter((c) => c.status === "sent").length;
  const totalMessages = campaigns.reduce((acc, c) => acc + c.delivered, 0);
  const totalRecipients = campaigns.reduce((acc, c) => acc + c.recipients, 0);
  const successRate =
    totalRecipients > 0
      ? ((campaigns.reduce((acc, c) => acc + c.delivered, 0) / totalRecipients) * 100).toFixed(1)
      : "0";
  const latest = campaigns[0];

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="font-display text-4xl tracking-tight mb-2">Tableau de bord</h1>
        <p className="text-muted-foreground">Vue d&apos;ensemble de vos campagnes et performances.</p>
      </motion.div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Campagnes envoyées" value={String(sentCampaigns)} icon={Send} delay={0.05} />
        <StatCard label="Messages envoyés" value={totalMessages.toLocaleString("fr-FR")} icon={MessageSquare} delay={0.1} />
        <StatCard label="Destinataires" value={totalRecipients.toLocaleString("fr-FR")} icon={Users} delay={0.15} />
        <StatCard label="Taux de succès" value={`${successRate}%`} icon={TrendingUp} delay={0.2} />
      </div>

      {latest && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="border border-border bg-card p-6 lg:p-8"
        >
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Dernière campagne</span>
              <h2 className="font-display text-2xl tracking-tight mt-2">{latest.name}</h2>
            </div>
            <Badge variant="outline">{CHANNEL_LABELS[latest.channel]}</Badge>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">Destinataires</p>
              <p className="font-mono">{latest.recipients.toLocaleString("fr-FR")}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Livrés</p>
              <p className="font-mono text-green-400">{latest.delivered.toLocaleString("fr-FR")}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Date</p>
              <p className="font-mono">
                {format(new Date(latest.createdAt), "d MMM yyyy", { locale: fr })}
              </p>
            </div>
          </div>
          <p className="mt-6 text-muted-foreground text-sm border-t border-border pt-4 line-clamp-2">
            {latest.message}
          </p>
        </motion.div>
      )}
    </div>
  );
}
