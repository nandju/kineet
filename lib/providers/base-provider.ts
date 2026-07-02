/**
 * Base Provider Interface
 * All providers must implement this interface
 */

import { MessageResult, ProviderTestResult } from '../types';

export interface IProvider {
  /**
   * Check if the provider is configured
   */
  isConfigured(): boolean;

  /**
   * Test the provider connection
   */
  testConnection(): Promise<ProviderTestResult>;

  /**
   * Prepare a message for sending
   */
  prepareMessage(to: string, subject?: string, body?: string): any;

  /**
   * Send a message
   */
  sendMessage(to: string, subject?: string, body?: string): Promise<MessageResult>;

  /**
   * Send a prepared message
   */
  sendPreparedMessage(message: any): Promise<MessageResult>;

  /**
   * Get provider type
   */
  getType(): string;
}
