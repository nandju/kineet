/**
 * Campaign Manager
 * Handles CRUD operations and state management for campaigns
 */

import { Campaign, CampaignStats, Recipient, CampaignStatus, RecipientStatus } from '../types';
import { QueueManager } from '../queue';

export class CampaignManager {
  private campaigns: Map<string, Campaign> = new Map();
  private queueManager: QueueManager;
  private onCampaignUpdate?: (campaign: Campaign) => void;

  constructor(queueManager: QueueManager) {
    this.queueManager = queueManager;
  }

  /**
   * Set callback for campaign updates
   */
  setCampaignUpdateCallback(callback: (campaign: Campaign) => void): void {
    this.onCampaignUpdate = callback;
  }

  /**
   * Create a new campaign
   */
  createCampaign(
    nom: string,
    canal: 'email' | 'whatsapp' | 'sms',
    message: string,
    destinataires: Recipient[],
    sujet?: string
  ): Campaign {
    const campaign: Campaign = {
      id: this.generateId(),
      nom,
      canal,
      dateCreation: new Date(),
      statut: 'draft',
      progression: 0,
      nombreDestinataires: destinataires.length,
      envoyes: 0,
      echoues: 0,
      enAttente: destinataires.length,
      message,
      sujet,
      destinataires: destinataires.map(d => ({
        ...d,
        id: d.id || this.generateId(),
        statut: 'waiting',
        nombreTentatives: 0,
      })),
    };

    this.campaigns.set(campaign.id, campaign);
    this.notifyUpdate(campaign);
    
    return campaign;
  }

  /**
   * Get campaign by ID
   */
  getCampaign(campaignId: string): Campaign | undefined {
    return this.campaigns.get(campaignId);
  }

  /**
   * Get all campaigns
   */
  getAllCampaigns(): Campaign[] {
    return Array.from(this.campaigns.values()).sort(
      (a, b) => b.dateCreation.getTime() - a.dateCreation.getTime()
    );
  }

  /**
   * Update campaign
   */
  updateCampaign(campaignId: string, updates: Partial<Campaign>): Campaign | null {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return null;

    const updated = { ...campaign, ...updates };
    this.campaigns.set(campaignId, updated);
    this.notifyUpdate(updated);
    
    return updated;
  }

  /**
   * Delete campaign
   */
  deleteCampaign(campaignId: string): boolean {
    // Stop queue processing for this campaign
    this.queueManager.stop();
    
    // Remove tasks from queue
    const tasks = this.queueManager.getAllTasks();
    tasks.forEach(task => {
      if (task.campaignId === campaignId) {
        this.queueManager.removeTask(task.id);
      }
    });
    
    return this.campaigns.delete(campaignId);
  }

  /**
   * Start a campaign
   */
  startCampaign(campaignId: string): boolean {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign || campaign.statut !== 'draft') return false;

    // Create queue tasks for each recipient
    const tasks = campaign.destinataires.map(recipient => ({
      id: this.generateId(),
      campaignId: campaign.id,
      recipientId: recipient.id,
      recipient,
      message: this.replaceVariables(campaign.message, recipient),
      canal: campaign.canal,
      status: 'pending' as const,
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date(),
    }));

    this.queueManager.addTasks(tasks);

    // Update campaign status
    this.updateCampaign(campaignId, {
      statut: 'sending',
      dateEnvoi: new Date(),
    });

    // Start queue processing
    this.queueManager.start();

    // Set up callbacks for progress tracking
    this.queueManager.setProgressCallback((taskId, status) => {
      this.handleTaskProgress(campaignId, taskId, status);
    });

    this.queueManager.setCompletionCallback((taskId) => {
      this.handleTaskCompletion(campaignId, taskId);
    });

    this.queueManager.setErrorCallback((taskId, error) => {
      this.handleTaskError(campaignId, taskId, error);
    });

    return true;
  }

  /**
   * Pause a campaign
   */
  pauseCampaign(campaignId: string): boolean {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign || campaign.statut !== 'sending') return false;

    this.queueManager.pause();

    this.updateCampaign(campaignId, {
      statut: 'paused',
    });

    return true;
  }

  /**
   * Resume a paused campaign
   */
  resumeCampaign(campaignId: string): boolean {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign || campaign.statut !== 'paused') return false;

    this.queueManager.resume();

    this.updateCampaign(campaignId, {
      statut: 'sending',
    });

    return true;
  }

  /**
   * Get campaign statistics
   */
  getCampaignStats(campaignId: string): CampaignStats | null {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return null;

    const total = campaign.nombreDestinataires;
    const envoyes = campaign.envoyes;
    const echoues = campaign.echoues;
    const enAttente = campaign.enAttente;
    const pourcentage = total > 0 ? (envoyes / total) * 100 : 0;

    // Estimate remaining time based on current progress
    let tempsEstime: number | undefined;
    if (campaign.statut === 'sending' && envoyes > 0 && enAttente > 0) {
      const elapsed = (Date.now() - (campaign.dateEnvoi?.getTime() || Date.now())) / 1000;
      const rate = envoyes / elapsed; // messages per second
      tempsEstime = enAttente / rate;
    }

    return {
      total,
      envoyes,
      echoues,
      enAttente,
      pourcentage,
      tempsEstime,
    };
  }

  /**
   * Update recipient status
   */
  updateRecipientStatus(
    campaignId: string,
    recipientId: string,
    status: RecipientStatus,
    heureEnvoi?: Date,
    erreur?: string
  ): boolean {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return false;

    const recipient = campaign.destinataires.find(r => r.id === recipientId);
    if (!recipient) return false;

    recipient.statut = status;
    if (heureEnvoi) recipient.heureEnvoi = heureEnvoi;
    if (erreur) recipient.erreur = erreur;

    // Update campaign stats
    this.updateCampaignStats(campaignId);

    return true;
  }

  /**
   * Update campaign statistics based on recipient statuses
   */
  private updateCampaignStats(campaignId: string): void {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return;

    const envoyes = campaign.destinataires.filter(r => r.statut === 'sent').length;
    const echoues = campaign.destinataires.filter(r => r.statut === 'failed').length;
    const enAttente = campaign.destinataires.filter(r => r.statut === 'waiting' || r.statut === 'sending').length;
    const progression = campaign.nombreDestinataires > 0 
      ? (envoyes / campaign.nombreDestinataires) * 100 
      : 0;

    // Check if campaign is complete
    let statut = campaign.statut;
    if (statut === 'sending' && enAttente === 0) {
      statut = 'completed';
      const duree = campaign.dateEnvoi 
        ? (Date.now() - campaign.dateEnvoi.getTime()) / 1000 
        : undefined;
      
      this.updateCampaign(campaignId, {
        statut,
        envoyes,
        echoues,
        enAttente,
        progression,
        duree,
      });
    } else {
      this.updateCampaign(campaignId, {
        envoyes,
        echoues,
        enAttente,
        progression,
      });
    }
  }

  /**
   * Handle task progress
   */
  private handleTaskProgress(campaignId: string, taskId: string, status: string): void {
    const task = this.queueManager.getTask(taskId);
    if (!task) return;

    if (status === 'processing') {
      this.updateRecipientStatus(campaignId, task.recipientId, 'sending');
    }
  }

  /**
   * Handle task completion
   */
  private handleTaskCompletion(campaignId: string, taskId: string): void {
    const task = this.queueManager.getTask(taskId);
    if (!task) return;

    this.updateRecipientStatus(
      campaignId,
      task.recipientId,
      'sent',
      new Date()
    );
  }

  /**
   * Handle task error
   */
  private handleTaskError(campaignId: string, taskId: string, error: string): void {
    const task = this.queueManager.getTask(taskId);
    if (!task) return;

    this.updateRecipientStatus(
      campaignId,
      task.recipientId,
      'failed',
      undefined,
      error
    );
  }

  /**
   * Replace variables in message with recipient data
   */
  private replaceVariables(message: string, recipient: Recipient): string {
    let result = message;
    
    // Replace {{nom}}
    result = result.replace(/\{\{nom\}\}/gi, recipient.nom);
    
    // Replace {{prenom}}
    result = result.replace(/\{\{prenom\}\}/gi, recipient.prenom);
    
    // Replace {{entreprise}}
    result = result.replace(/\{\{entreprise\}\}/gi, recipient.entreprise || '');
    
    return result;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Notify update callback
   */
  private notifyUpdate(campaign: Campaign): void {
    if (this.onCampaignUpdate) {
      this.onCampaignUpdate(campaign);
    }
  }
}
