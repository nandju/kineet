/**
 * Mock SMS Provider Implementation
 * Simulates SMS sending for development/testing
 */

import { ISmsProvider } from '../sms-provider';
import { SmsConfig, MessageResult, ProviderTestResult } from '../../types';

export class MockSmsProvider implements ISmsProvider {
  private config: SmsConfig | null = null;

  configure(config: SmsConfig): void {
    this.config = config;
  }

  getConfig(): SmsConfig | null {
    return this.config;
  }

  isConfigured(): boolean {
    return !!(this.config && 
           this.config.apiKey);
  }

  async testConnection(): Promise<ProviderTestResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: 'SMS provider not configured',
        details: { missing: ['apiKey'] }
      };
    }

    // Simulate connection test
    await this.delay(400 + Math.random() * 300);

    // Simulate 92% success rate
    const success = Math.random() > 0.08;

    if (success) {
      return {
        success: true,
        message: 'SMS gateway connection successful',
        details: {
          gatewayType: this.config!.gatewayType || 'api',
          senderId: this.config!.senderId
        }
      };
    } else {
      return {
        success: false,
        message: 'Failed to connect to SMS gateway',
        details: {
          error: 'Invalid API key'
        }
      };
    }
  }

  prepareMessage(to: string, subject?: string, body?: string): any {
    return {
      to: this.formatPhoneNumber(to),
      message: body || '',
      from: this.config?.senderId || '',
      timestamp: new Date()
    };
  }

  async sendMessage(to: string, subject?: string, body?: string): Promise<MessageResult> {
    const message = this.prepareMessage(to, subject, body);
    return this.sendPreparedMessage(message);
  }

  async sendPreparedMessage(message: any): Promise<MessageResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'SMS provider not configured',
        timestamp: new Date()
      };
    }

    // Simulate sending delay
    await this.delay(150 + Math.random() * 200);

    // Simulate 93% success rate
    const success = Math.random() > 0.07;

    if (success) {
      return {
        success: true,
        messageId: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date()
      };
    } else {
      return {
        success: false,
        error: 'Failed to send SMS (simulated error)',
        timestamp: new Date()
      };
    }
  }

  async sendSms(to: string, message: string): Promise<MessageResult> {
    return this.sendMessage(to, undefined, message);
  }

  async sendBulkSms(recipients: Array<{ to: string; message: string }>): Promise<MessageResult[]> {
    const results: MessageResult[] = [];
    
    for (const recipient of recipients) {
      const result = await this.sendSms(recipient.to, recipient.message);
      results.push(result);
      
      // Small delay between sends to simulate rate limiting
      await this.delay(30);
    }
    
    return results;
  }

  isValidPhoneNumber(phone: string): boolean {
    // Basic validation: should start with + and have 10-15 digits
    const cleaned = phone.replace(/\s/g, '');
    return /^\+[1-9]\d{9,14}$/.test(cleaned);
  }

  getType(): string {
    return 'sms';
  }

  private formatPhoneNumber(phone: string): string {
    // Remove spaces and ensure it starts with +
    let cleaned = phone.replace(/\s/g, '');
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    return cleaned;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
