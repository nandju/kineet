/**
 * useCampaigns Hook
 * Manages campaign state and operations
 */

import { useState, useEffect, useCallback } from 'react';
import { Campaign, CampaignStats, Recipient } from '../types';
import { CampaignManager } from '../campaign';
import { QueueManager } from '../queue';

export function useCampaigns(queueManager: QueueManager) {
  const [campaignManager] = useState(() => new CampaignManager(queueManager));
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);

  useEffect(() => {
    // Set up campaign update callback
    campaignManager.setCampaignUpdateCallback((campaign) => {
      setCampaigns(prev => {
        const index = prev.findIndex(c => c.id === campaign.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = campaign;
          return updated;
        }
        return [...prev, campaign];
      });

      if (activeCampaign?.id === campaign.id) {
        setActiveCampaign(campaign);
      }
    });

    // Load initial campaigns
    setCampaigns(campaignManager.getAllCampaigns());
  }, [campaignManager, activeCampaign?.id]);

  const createCampaign = useCallback((
    nom: string,
    canal: 'email' | 'whatsapp' | 'sms',
    message: string,
    destinataires: Recipient[],
    sujet?: string
  ) => {
    const campaign = campaignManager.createCampaign(
      nom,
      canal,
      message,
      destinataires,
      sujet
    );
    setActiveCampaign(campaign);
    return campaign;
  }, [campaignManager]);

  const startCampaign = useCallback((campaignId: string) => {
    return campaignManager.startCampaign(campaignId);
  }, [campaignManager]);

  const pauseCampaign = useCallback((campaignId: string) => {
    return campaignManager.pauseCampaign(campaignId);
  }, [campaignManager]);

  const resumeCampaign = useCallback((campaignId: string) => {
    return campaignManager.resumeCampaign(campaignId);
  }, [campaignManager]);

  const deleteCampaign = useCallback((campaignId: string) => {
    const success = campaignManager.deleteCampaign(campaignId);
    if (success) {
      setCampaigns(prev => prev.filter(c => c.id !== campaignId));
      if (activeCampaign?.id === campaignId) {
        setActiveCampaign(null);
      }
    }
    return success;
  }, [campaignManager, activeCampaign?.id]);

  const getCampaignStats = useCallback((campaignId: string): CampaignStats | null => {
    return campaignManager.getCampaignStats(campaignId);
  }, [campaignManager]);

  const selectCampaign = useCallback((campaignId: string) => {
    const campaign = campaignManager.getCampaign(campaignId);
    if (campaign) {
      setActiveCampaign(campaign);
    }
  }, [campaignManager]);

  return {
    campaigns,
    activeCampaign,
    createCampaign,
    startCampaign,
    pauseCampaign,
    resumeCampaign,
    deleteCampaign,
    getCampaignStats,
    selectCampaign,
    setActiveCampaign,
  };
}
