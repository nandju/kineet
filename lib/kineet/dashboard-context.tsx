"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import type { Campaign, Profile, Settings } from "./types";
import { initializeSaaSArchitecture } from "../integration/dashboard-integration";
import { useProviders } from "../hooks";
import { createClient } from "../supabase/client";
import { listCampaigns, insertCampaign, updateCampaignRow, deleteCampaignRow } from "../supabase/repositories/campaigns";
import { getProfile, upsertProfile } from "../supabase/repositories/profile";
import { getSettingsRow, upsertSettings, toSettings } from "../supabase/repositories/settings";
import { notify } from "./notify";

export type DashboardSection =
  | "home"
  | "campaign"
  | "history"
  | "profile"
  | "settings";

const EMPTY_PROFILE: Profile = { name: "", company: "", phone: "", email: "", photo: "" };

interface DashboardContextValue {
  section: DashboardSection;
  setSection: (section: DashboardSection) => void;
  campaigns: Campaign[];
  addCampaign: (campaign: Campaign) => void;
  updateCampaign: (campaignId: string, updates: Partial<Campaign>) => void;
  deleteCampaign: (campaignId: string) => void;
  profile: Profile;
  updateProfile: (profile: Profile) => void;
  settings: Settings;
  updateSettings: (settings: Settings) => void;
  logout: () => void;
  // SaaS architecture managers
  campaignManager: any;
  queueManager: any;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [section, setSection] = useState<DashboardSection>("home");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [settings, setSettings] = useState<Settings>(() => toSettings(null));
  const [userId, setUserId] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  // Initialize SaaS architecture
  const { queueManager, campaignManager } = useMemo(() => initializeSaaSArchitecture(), []);
  const { getProvider } = useProviders();

  // Load the signed-in user's data from Supabase on mount
  useEffect(() => {
    let active = true;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !active) return;

      setUserId(user.id);

      try {
        const [fetchedCampaigns, fetchedProfile, fetchedSettingsRow] = await Promise.all([
          listCampaigns(supabase, user.id),
          getProfile(supabase, user),
          getSettingsRow(supabase, user.id),
        ]);
        if (!active) return;
        setCampaigns(fetchedCampaigns);
        setProfile(fetchedProfile);
        setSettings(toSettings(fetchedSettingsRow));
      } catch {
        if (active) notify.error("Erreur de chargement", "Impossible de charger vos données depuis Supabase.");
      }
    })();

    return () => {
      active = false;
    };
  }, [supabase]);

  // Set up queue provider when campaigns start
  useEffect(() => {
    const activeCampaign = campaigns.find((c) => c.status === "sending");
    if (activeCampaign) {
      const provider = getProvider(activeCampaign.channel);
      if (provider) {
        queueManager.setProvider(provider);
      }
    }
  }, [campaigns, queueManager, getProvider]);

  const addCampaign = useCallback(
    (campaign: Campaign) => {
      setCampaigns((prev) => [campaign, ...prev]);
      if (!userId) return;
      insertCampaign(supabase, userId, campaign)
        .then((saved) => {
          setCampaigns((prev) => prev.map((c) => (c.id === campaign.id ? saved : c)));
        })
        .catch(() => {
          notify.error("Erreur", "La campagne n'a pas pu être enregistrée sur le serveur.");
        });
    },
    [supabase, userId],
  );

  const updateCampaign = useCallback(
    (campaignId: string, updates: Partial<Campaign>) => {
      setCampaigns((prev) => prev.map((c) => (c.id === campaignId ? { ...c, ...updates } : c)));
      updateCampaignRow(supabase, campaignId, updates).catch(() => {
        notify.error("Erreur", "La mise à jour de la campagne n'a pas pu être enregistrée.");
      });
    },
    [supabase],
  );

  const deleteCampaign = useCallback(
    (campaignId: string) => {
      setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
      deleteCampaignRow(supabase, campaignId).catch(() => {
        notify.error("Erreur", "La suppression de la campagne a échoué.");
      });
    },
    [supabase],
  );

  const updateProfile = useCallback(
    (next: Profile) => {
      setProfile(next);
      if (!userId) return;
      upsertProfile(supabase, userId, next).catch(() => {
        notify.error("Erreur", "Le profil n'a pas pu être enregistré.");
      });
    },
    [supabase, userId],
  );

  const updateSettings = useCallback(
    (next: Settings) => {
      setSettings(next);
      if (!userId) return;
      upsertSettings(supabase, userId, next).catch(() => {
        notify.error("Erreur", "Les préférences n'ont pas pu être enregistrées.");
      });
    },
    [supabase, userId],
  );

  const logout = useCallback(() => {
    supabase.auth.signOut().finally(() => {
      window.location.href = "/login";
    });
  }, [supabase]);

  const value = useMemo(
    () => ({
      section,
      setSection,
      campaigns,
      addCampaign,
      updateCampaign,
      deleteCampaign,
      profile,
      updateProfile,
      settings,
      updateSettings,
      logout,
      // Expose SaaS architecture for advanced usage
      campaignManager,
      queueManager,
    }),
    [section, campaigns, addCampaign, updateCampaign, deleteCampaign, profile, updateProfile, settings, updateSettings, logout, campaignManager, queueManager],
  );

  return (
    <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard doit être utilisé dans DashboardProvider.");
  }
  return context;
}
