"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type WhatsAppSessionStatus = "connecting" | "qr" | "connected" | "disconnected" | "error";

export interface WhatsAppSessionState {
  status: WhatsAppSessionStatus;
  qr?: string;
  number?: string;
  error?: string;
}

export function useWhatsAppSession(organizationId: string | null) {
  const [state, setState] = useState<WhatsAppSessionState>({ status: "disconnected" });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!organizationId) return;
    try {
      const res = await fetch(`/api/whatsapp/status?organizationId=${encodeURIComponent(organizationId)}`);
      const data = await res.json();
      if (data.success) setState(data);
    } catch {
      // transient poll failure — keep last known state
    }
  }, [organizationId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    const shouldPoll = state.status === "connecting" || state.status === "qr";
    if (shouldPoll && !pollRef.current) {
      pollRef.current = setInterval(fetchStatus, 2500);
    } else if (!shouldPoll && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [state.status, fetchStatus]);

  const connect = useCallback(async () => {
    if (!organizationId) return;
    setState((s) => ({ ...s, status: "connecting" }));
    try {
      const res = await fetch("/api/whatsapp/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId }),
      });
      const data = await res.json();
      if (data.success) setState(data);
    } catch {
      setState({ status: "error", error: "Impossible de contacter le serveur." });
    }
  }, [organizationId]);

  const disconnect = useCallback(async () => {
    if (!organizationId) return;
    try {
      await fetch("/api/whatsapp/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId }),
      });
    } finally {
      setState({ status: "disconnected" });
    }
  }, [organizationId]);

  return { state, connect, disconnect, refresh: fetchStatus };
}
