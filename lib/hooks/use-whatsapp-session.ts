"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type WhatsAppSessionStatus = "connecting" | "qr" | "connected" | "disconnected" | "error";

export interface WhatsAppSessionState {
  status: WhatsAppSessionStatus;
  qr?: string;
  number?: string;
  error?: string;
}

export function useWhatsAppSession() {
  const [state, setState] = useState<WhatsAppSessionState>({ status: "disconnected" });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/status");
      const data = await res.json();
      if (data.success) setState(data);
    } catch {
      // transient poll failure — keep last known state
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setState((s) => ({ ...s, status: "connecting" }));
    try {
      const res = await fetch("/api/whatsapp/connect", { method: "POST" });
      const data = await res.json();
      if (data.success) setState(data);
    } catch {
      setState({ status: "error", error: "Impossible de contacter le serveur." });
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      await fetch("/api/whatsapp/disconnect", { method: "POST" });
    } finally {
      setState({ status: "disconnected" });
    }
  }, []);

  return { state, connect, disconnect, refresh: fetchStatus };
}
