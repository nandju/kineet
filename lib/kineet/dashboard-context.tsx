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
import { seedCampaigns, seedProfile, seedSettings } from "./data";
import type { Campaign, Profile, Settings } from "./types";
import { initializeSaaSArchitecture, toDashboardCampaign } from "../integration/dashboard-integration";
import { useQueue, useProviders } from "../hooks";

export type DashboardSection =
  | "home"
  | "campaign"
  | "history"
  | "profile"
  | "settings";

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
  const [campaigns, setCampaigns] = useState<Campaign[]>(seedCampaigns);
  const [profile, setProfile] = useState<Profile>(seedProfile);
  const [settings, setSettings] = useState<Settings>(seedSettings);
  
  // Initialize SaaS architecture
  const { queueManager, campaignManager } = useMemo(() => initializeSaaSArchitecture(), []);
  const { getProvider } = useProviders();
  
  // Set up queue provider when campaigns start
  useEffect(() => {
    const activeCampaign = campaigns.find(c => c.status === 'sending');
    if (activeCampaign) {
      const provider = getProvider(activeCampaign.channel);
      if (provider) {
        queueManager.setProvider(provider);
      }
    }
  }, [campaigns, queueManager, getProvider]);

  const addCampaign = useCallback((campaign: Campaign) => {
    setCampaigns((prev) => [campaign, ...prev]);
  }, []);
  
  const updateCampaign = useCallback((campaignId: string, updates: Partial<Campaign>) => {
    setCampaigns((prev) => 
      prev.map(c => c.id === campaignId ? { ...c, ...updates } : c)
    );
  }, []);
  
  const deleteCampaign = useCallback((campaignId: string) => {
    setCampaigns((prev) => prev.filter(c => c.id !== campaignId));
  }, []);

  const updateProfile = useCallback((next: Profile) => {
    setProfile(next);
  }, []);

  const updateSettings = useCallback((next: Settings) => {
    setSettings(next);
  }, []);

  const logout = useCallback(() => {
    window.location.href = "/login";
  }, []);

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
