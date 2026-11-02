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
import { useRouter } from "next/navigation";
import type { Campaign, Profile, Settings } from "./types";
import { initializeSaaSArchitecture } from "../integration/dashboard-integration";
import { useProviders } from "../hooks";
import { createClient } from "../supabase/client";
import { listCampaigns, insertCampaign, updateCampaignRow, deleteCampaignRow } from "../supabase/repositories/campaigns";
import { getProfile, upsertProfile } from "../supabase/repositories/profile";
import { getSettingsRow, upsertSettings, toSettings } from "../supabase/repositories/settings";
import {
  listMyOrganizations,
  getOrganizationBySlug,
  createOrganization as createOrganizationRow,
  type Organization,
} from "../supabase/repositories/organizations";
import { notify } from "./notify";

export type DashboardSection =
  | "home"
  | "campaign"
  | "lists"
  | "history"
  | "profile"
  | "settings"
  | "members";

const EMPTY_PROFILE: Profile = { name: "", company: "", phone: "", email: "", photo: "" };

interface DashboardContextValue {
  section: DashboardSection;
  setSection: (section: DashboardSection) => void;
  campaigns: Campaign[];
  addCampaign: (campaign: Campaign) => Promise<Campaign>;
  updateCampaign: (campaignId: string, updates: Partial<Campaign>) => void;
  deleteCampaign: (campaignId: string) => void;
  profile: Profile;
  updateProfile: (profile: Profile) => void;
  settings: Settings;
  updateSettings: (settings: Settings) => void;
  logout: () => void;
  // Organisation active + organisations de l'utilisateur
  userId: string | null;
  organizationId: string | null;
  organizationSlug: string;
  organizationName: string;
  organizationRole: Organization["role"] | null;
  organizations: Organization[];
  billingBlocked: boolean;
  hasActiveSubscription: boolean;
  switchOrganization: (slug: string) => void;
  createOrganization: (name: string) => Promise<void>;
  // SaaS architecture managers
  campaignManager: any;
  queueManager: any;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children, orgSlug }: { children: ReactNode; orgSlug: string }) {
  const router = useRouter();
  const [section, setSection] = useState<DashboardSection>("home");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [settings, setSettings] = useState<Settings>(() => toSettings(null));
  const [userId, setUserId] = useState<string | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  const supabase = useMemo(() => createClient(), []);

  // Initialize SaaS architecture
  const { queueManager, campaignManager } = useMemo(() => initializeSaaSArchitecture(), []);
  const { getProvider } = useProviders();

  // Load the signed-in user's data + active organization from Supabase on mount
  useEffect(() => {
    let active = true;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !active) return;

      setUserId(user.id);

      try {
        const [org, myOrgs, fetchedProfile, fetchedSettingsRow] = await Promise.all([
          getOrganizationBySlug(supabase, orgSlug),
          listMyOrganizations(supabase, user.id),
          getProfile(supabase, user),
          getSettingsRow(supabase, user.id),
        ]);
        if (!active) return;

        if (!org) {
          notify.error("Organisation introuvable", "Vous n'êtes pas membre de cette organisation.");
          router.replace("/dashboard");
          return;
        }

        if (org.paidUntil && new Date(org.paidUntil) < new Date()) {
          setOrganization(org);
          setOrganizations(myOrgs);
          return;
        }

        setOrganization(org);
        setOrganizations(myOrgs);
        setProfile(fetchedProfile);
        setSettings(toSettings(fetchedSettingsRow));

        const fetchedCampaigns = await listCampaigns(supabase, org.id);
        if (!active) return;
        setCampaigns(fetchedCampaigns);
      } catch {
        if (active) notify.error("Erreur de chargement", "Impossible de charger vos données depuis Supabase.");
      }
    })();

    return () => {
      active = false;
    };
  }, [supabase, orgSlug, router]);

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
    async (campaign: Campaign): Promise<Campaign> => {
      setCampaigns((prev) => [campaign, ...prev]);
      if (!userId || !organization) return campaign;
      try {
        const saved = await insertCampaign(supabase, organization.id, userId, campaign);
        setCampaigns((prev) => prev.map((c) => (c.id === campaign.id ? saved : c)));
        return saved;
      } catch {
        notify.error("Erreur", "La campagne n'a pas pu être enregistrée sur le serveur.");
        return campaign;
      }
    },
    [supabase, userId, organization],
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

  const switchOrganization = useCallback(
    (slug: string) => {
      router.push(`/org/${slug}/dashboard`);
    },
    [router],
  );

  const createOrganization = useCallback(
    async (name: string) => {
      if (!userId) return;
      try {
        const org = await createOrganizationRow(supabase, userId, name);
        notify.success("Organisation créée", `"${org.name}" est prête.`);
        router.push(`/org/${org.slug}/dashboard`);
      } catch {
        notify.error("Erreur", "L'organisation n'a pas pu être créée.");
      }
    },
    [supabase, userId, router],
  );

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
      userId,
      organizationId: organization?.id ?? null,
      organizationSlug: organization?.slug ?? orgSlug,
      organizationName: organization?.name ?? "",
      organizationRole: organization?.role ?? null,
      organizations,
      billingBlocked: !!organization?.paidUntil && new Date(organization.paidUntil) < new Date(),
      hasActiveSubscription: !!organization?.paidUntil && new Date(organization.paidUntil) > new Date(),
      switchOrganization,
      createOrganization,
      // Expose SaaS architecture for advanced usage
      campaignManager,
      queueManager,
    }),
    [
      section,
      campaigns,
      addCampaign,
      updateCampaign,
      deleteCampaign,
      profile,
      updateProfile,
      settings,
      updateSettings,
      logout,
      userId,
      organization,
      orgSlug,
      organizations,
      switchOrganization,
      createOrganization,
      campaignManager,
      queueManager,
    ],
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
