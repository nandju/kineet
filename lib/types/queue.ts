/**
 * Queue Manager types and interfaces
 */

export interface QueueTask {
  id: string;
  campaignId: string;
  recipientId: string;
  recipient: any;
  message: string;
  canal: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

export interface QueueConfig {
  maxConcurrent: number;
  retryDelay: number; // in milliseconds
  maxRetries: number;
}
