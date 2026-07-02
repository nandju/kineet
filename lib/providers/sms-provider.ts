/**
 * SMS Provider Interface
 */

import { IProvider } from './base-provider';
import { SmsConfig, MessageResult, ProviderTestResult } from '../types';

export interface ISmsProvider extends IProvider {
  /**
   * Configure the SMS provider
   */
  configure(config: SmsConfig): void;

  /**
   * Get current configuration
   */
  getConfig(): SmsConfig | null;

  /**
   * Send an SMS
   */
  sendSms(to: string, message: string): Promise<MessageResult>;

  /**
   * Send bulk SMS
   */
  sendBulkSms(recipients: Array<{ to: string; message: string }>): Promise<MessageResult[]>;

  /**
   * Check if phone number is valid
   */
  isValidPhoneNumber(phone: string): boolean;
}
