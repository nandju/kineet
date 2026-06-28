"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  delay?: number;
}

export function StatCard({ label, value, icon: Icon, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className="border border-border bg-card p-6 hover-lift transition-all duration-300"
    >
      <div className="flex items-start justify-between mb-4">
        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{label}</span>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <p className="font-display text-3xl lg:text-4xl tracking-tight text-foreground">{value}</p>
    </motion.div>
  );
}
