/**
 * Dashboard Integration Layer
 * Bridges the new SaaS architecture with the existing dashboard UI
 */

import { CampaignManager } from '../campaign';
import { QueueManager } from '../queue';
import { useQueue, useProviders, useNotifications } from '../hooks';
import type { Campaign as NewCampaign, Recipient as NewRecipient } from '../types';
import type { Campaign, Recipient } from '../kineet/types';

/**
 * Convert new architecture Campaign to existing dashboard Campaign
 */
export function toDashboardCampaign(newCampaign: NewCampaign): Campaign {
  return {
    id: newCampaign.id,
    name: newCampaign.nom,
    channel: newCampaign.canal,
    status: newCampaign.statut === 'completed' ? 'sent' : 
            newCampaign.statut === 'sending' ? 'sending' :
            newCampaign.statut === 'failed' ? 'failed' : 'draft',
    recipients: newCampaign.nombreDestinataires,
    delivered: newCampaign.envoyes,
    failed: newCampaign.echoues,
    subject: newCampaign.sujet,
    message: newCampaign.message,
    createdAt: newCampaign.dateCreation.toISOString(),
  };
}

/**
 * Convert existing dashboard Recipient to new architecture Recipient
 */
export function toNewRecipient(recipient: Recipient): NewRecipient {
  return {
    id: recipient.id,
    nom: recipient.lastName,
    prenom: recipient.firstName,
    contact: recipient.contact,
    email: recipient.contact.includes('@') ? recipient.contact : undefined,
    statut: 'waiting',
    nombreTentatives: 0,
  };
}

/**
 * Convert new architecture Recipient to existing dashboard Recipient
 */
export function toDashboardRecipient(newRecipient: NewRecipient): Recipient {
  return {
    id: newRecipient.id,
    lastName: newRecipient.nom,
    firstName: newRecipient.prenom,
    contact: newRecipient.contact,
    valid: newRecipient.statut !== 'failed',
  };
}

/**
 * Initialize the SaaS architecture managers
 */
export function initializeSaaSArchitecture() {
  const queueManager = new QueueManager();
  const campaignManager = new CampaignManager(queueManager);
  
  return {
    queueManager,
    campaignManager,
  };
}
