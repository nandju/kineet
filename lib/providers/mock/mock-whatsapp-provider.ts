/**
 * Mock WhatsApp Provider Implementation
 * Simulates WhatsApp message sending for development/testing
 */

import { IWhatsAppProvider } from '../whatsapp-provider';
import { WhatsAppConfig, MessageResult, ProviderTestResult } from '../../types';

export class MockWhatsAppProvider implements IWhatsAppProvider {
  private config: WhatsAppConfig | null = null;

  configure(config: WhatsAppConfig): void {
    this.config = config;
  }

  getConfig(): WhatsAppConfig | null {
    return this.config;
  }

  isConfigured(): boolean {
    return !!(this.config && 
           this.config.apiKey && 
           this.config.phoneNumber);
  }

  async testConnection(): Promise<ProviderTestResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: 'WhatsApp provider not configured',
        details: { missing: ['apiKey', 'phoneNumber'] }
      };
    }

    // Simulate connection test
    await this.delay(600 + Math.random() * 400);

    // Simulate 85% success rate
    const success = Math.random() > 0.15;

    if (success) {
      return {
        success: true,
        message: 'WhatsApp API connection successful',
        details: {
          phoneNumber: this.config!.phoneNumber,
          businessId: this.config!.businessId
        }
      };
    } else {
      return {
        success: false,
        message: 'Failed to connect to WhatsApp API',
        details: {
          error: 'Invalid API key or phone number'
        }
      };
    }
  }

  prepareMessage(to: string, subject?: string, body?: string): any {
    return {
      to: this.formatPhoneNumber(to),
      message: body || '',
      from: this.config?.phoneNumber || '',
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
        error: 'WhatsApp provider not configured',
        timestamp: new Date()
      };
    }

    // Simulate sending delay
    await this.delay(300 + Math.random() * 400);

    // Simulate 90% success rate
    const success = Math.random() > 0.1;

    if (success) {
      return {
        success: true,
        messageId: `wa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date()
      };
    } else {
      return {
        success: false,
        error: 'Failed to send WhatsApp message (simulated error)',
        timestamp: new Date()
      };
    }
  }

  async sendWhatsApp(to: string, message: string): Promise<MessageResult> {
    return this.sendMessage(to, undefined, message);
  }

  async sendBulkMessages(recipients: Array<{ to: string; message: string }>): Promise<MessageResult[]> {
    const results: MessageResult[] = [];
    
    for (const recipient of recipients) {
      const result = await this.sendWhatsApp(recipient.to, recipient.message);
      results.push(result);
      
      // Small delay between sends to simulate rate limiting
      await this.delay(100);
    }
    
    return results;
  }

  isValidPhoneNumber(phone: string): boolean {
    // Basic validation: should start with + and have 10-15 digits
    const cleaned = phone.replace(/\s/g, '');
    return /^\+[1-9]\d{9,14}$/.test(cleaned);
  }

  getType(): string {
    return 'whatsapp';
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
