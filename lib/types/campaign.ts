/**
 * Campaign types and interfaces
 */

export type CampaignChannel = 'email' | 'whatsapp' | 'sms';

export type CampaignStatus = 'draft' | 'queued' | 'sending' | 'paused' | 'completed' | 'failed';

export interface Recipient {
  id: string;
  nom: string;
  prenom: string;
  contact: string;
  email?: string;
  entreprise?: string;
  statut: RecipientStatus;
  heureEnvoi?: Date;
  nombreTentatives: number;
  messagePersonnalise?: string;
  erreur?: string;
}

export type RecipientStatus = 'waiting' | 'sending' | 'sent' | 'failed' | 'skipped';

export interface Campaign {
  id: string;
  nom: string;
  canal: CampaignChannel;
  dateCreation: Date;
  dateEnvoi?: Date;
  statut: CampaignStatus;
  progression: number;
  nombreDestinataires: number;
  envoyes: number;
  echoues: number;
  enAttente: number;
  message: string;
  sujet?: string; // For email campaigns
  destinataires: Recipient[];
  duree?: number; // in seconds
  configuration?: any;
}

export interface CampaignStats {
  total: number;
  envoyes: number;
  echoues: number;
  enAttente: number;
  pourcentage: number;
  tempsEstime?: number; // in seconds
}
