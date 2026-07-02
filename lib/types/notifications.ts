/**
 * Notification types and interfaces
 */

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export type NotificationCategory = 
  | 'import_completed'
  | 'campaign_created'
  | 'campaign_completed'
  | 'campaign_paused'
  | 'campaign_resumed'
  | 'campaign_failed'
  | 'config_saved'
  | 'connection_success'
  | 'connection_failed'
  | 'message_sent'
  | 'message_failed';

export interface Notification {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}
