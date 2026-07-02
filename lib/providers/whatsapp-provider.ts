/**
 * WhatsApp Provider Interface
 */

import { IProvider } from './base-provider';
import { WhatsAppConfig, MessageResult, ProviderTestResult } from '../types';

export interface IWhatsAppProvider extends IProvider {
  /**
   * Configure the WhatsApp provider
   */
  configure(config: WhatsAppConfig): void;

  /**
   * Get current configuration
   */
  getConfig(): WhatsAppConfig | null;

  /**
   * Send a WhatsApp message
   */
  sendWhatsApp(to: string, message: string): Promise<MessageResult>;

  /**
   * Send bulk WhatsApp messages
   */
  sendBulkMessages(recipients: Array<{ to: string; message: string }>): Promise<MessageResult[]>;

  /**
   * Check if phone number is valid
   */
  isValidPhoneNumber(phone: string): boolean;
}
