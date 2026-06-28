"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { seedCampaigns, seedProfile, seedSettings } from "./data";
import type { Campaign, Profile, Settings } from "./types";

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
  profile: Profile;
  updateProfile: (profile: Profile) => void;
  settings: Settings;
  updateSettings: (settings: Settings) => void;
  logout: () => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [section, setSection] = useState<DashboardSection>("home");
  const [campaigns, setCampaigns] = useState<Campaign[]>(seedCampaigns);
  const [profile, setProfile] = useState<Profile>(seedProfile);
  const [settings, setSettings] = useState<Settings>(seedSettings);

  const addCampaign = useCallback((campaign: Campaign) => {
    setCampaigns((prev) => [campaign, ...prev]);
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
      profile,
      updateProfile,
      settings,
      updateSettings,
      logout,
    }),
    [section, campaigns, addCampaign, profile, updateProfile, settings, updateSettings, logout],
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
