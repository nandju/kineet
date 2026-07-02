/**
 * Email Provider Interface
 */

import { IProvider } from './base-provider';
import { EmailConfig, MessageResult, ProviderTestResult } from '../types';

export interface IEmailProvider extends IProvider {
  /**
   * Configure the email provider
   */
  configure(config: EmailConfig): void;

  /**
   * Get current configuration
   */
  getConfig(): EmailConfig | null;

  /**
   * Send an email
   */
  sendEmail(to: string, subject: string, body: string, html?: boolean): Promise<MessageResult>;

  /**
   * Send bulk emails
   */
  sendBulkEmails(recipients: Array<{ to: string; subject: string; body: string }>): Promise<MessageResult[]>;
}
