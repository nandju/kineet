"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDashboard } from "@/lib/kineet/dashboard-context";
import { CHANNEL_LABELS, type CampaignStatus, type Channel } from "@/lib/kineet/types";

const PAGE_SIZE = 5;
type SortKey = "name" | "createdAt" | "recipients";
type SortDir = "asc" | "desc";

const STATUS_LABELS: Record<CampaignStatus, string> = {
  sent: "Envoyée",
  sending: "En cours",
  failed: "Échouée",
  draft: "Brouillon",
};

export function HistoryPanel() {
  const { campaigns } = useDashboard();
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState<Channel | "all">("all");
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let list = [...campaigns];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.message.toLowerCase().includes(q) ||
          (c.subject?.toLowerCase().includes(q) ?? false),
      );
    }
    if (channelFilter !== "all") list = list.filter((c) => c.channel === channelFilter);
    if (statusFilter !== "all") list = list.filter((c) => c.status === statusFilter);

    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name, "fr");
      else if (sortKey === "recipients") cmp = a.recipients - b.recipients;
      else cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [campaigns, search, channelFilter, statusFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-4xl tracking-tight mb-2">Historique</h1>
        <p className="text-muted-foreground">Recherchez, triez et filtrez vos campagnes passées.</p>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une campagne..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-10 h-11 bg-input"
          />
        </div>
        <Select value={channelFilter} onValueChange={(v) => { setChannelFilter(v as Channel | "all"); setPage(1); }}>
          <SelectTrigger className="w-full lg:w-44 h-11">
            <SelectValue placeholder="Canal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les canaux</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="sms">SMS</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as CampaignStatus | "all"); setPage(1); }}>
          <SelectTrigger className="w-full lg:w-44 h-11">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="sent">Envoyée</SelectItem>
            <SelectItem value="sending">En cours</SelectItem>
            <SelectItem value="failed">Échouée</SelectItem>
            <SelectItem value="draft">Brouillon</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead>
                <button type="button" onClick={() => toggleSort("name")} className="flex items-center gap-1 hover:text-foreground">
                  Campagne <ArrowUpDown className="w-3 h-3" />
                </button>
              </TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>
                <button type="button" onClick={() => toggleSort("recipients")} className="flex items-center gap-1 hover:text-foreground">
                  Destinataires <ArrowUpDown className="w-3 h-3" />
                </button>
              </TableHead>
              <TableHead>
                <button type="button" onClick={() => toggleSort("createdAt")} className="flex items-center gap-1 hover:text-foreground">
                  Date <ArrowUpDown className="w-3 h-3" />
                </button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                  Aucune campagne trouvée.
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((c) => (
                <TableRow key={c.id} className="border-border">
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell><Badge variant="outline">{CHANNEL_LABELS[c.channel]}</Badge></TableCell>
                  <TableCell>
                    <Badge variant={c.status === "failed" ? "destructive" : "secondary"}>
                      {STATUS_LABELS[c.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{c.recipients.toLocaleString("fr-FR")}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {format(new Date(c.createdAt), "d MMM yyyy", { locale: fr })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filtered.length} campagne{filtered.length !== 1 ? "s" : ""} — page {page} sur {totalPages}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
