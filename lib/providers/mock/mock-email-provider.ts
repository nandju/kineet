/**
 * Mock Email Provider Implementation
 * Simulates email sending for development/testing
 */

import { IEmailProvider } from '../email-provider';
import { EmailConfig, MessageResult, ProviderTestResult } from '../../types';

export class MockEmailProvider implements IEmailProvider {
  private config: EmailConfig | null = null;

  configure(config: EmailConfig): void {
    this.config = config;
  }

  getConfig(): EmailConfig | null {
    return this.config;
  }

  isConfigured(): boolean {
    return !!(this.config && 
           this.config.adresseEmail && 
           this.config.serveurSmtp &&
           this.config.port > 0);
  }

  async testConnection(): Promise<ProviderTestResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: 'Email provider not configured',
        details: { missing: ['adresseEmail', 'serveurSmtp', 'port'] }
      };
    }

    // Simulate connection test
    await this.delay(500 + Math.random() * 500);

    // Simulate 90% success rate
    const success = Math.random() > 0.1;

    if (success) {
      return {
        success: true,
        message: 'SMTP connection successful',
        details: {
          server: this.config!.serveurSmtp,
          port: this.config!.port,
          security: this.config!.securite || 'none'
        }
      };
    } else {
      return {
        success: false,
        message: 'Failed to connect to SMTP server',
        details: {
          server: this.config!.serveurSmtp,
          port: this.config!.port,
          error: 'Connection timeout'
        }
      };
    }
  }

  prepareMessage(to: string, subject?: string, body?: string): any {
    return {
      to,
      subject: subject || '',
      body: body || '',
      from: this.config?.adresseEmail || '',
      fromName: this.config?.expediteur || '',
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
        error: 'Email provider not configured',
        timestamp: new Date()
      };
    }

    // Simulate sending delay
    await this.delay(200 + Math.random() * 300);

    // Simulate 95% success rate
    const success = Math.random() > 0.05;

    if (success) {
      return {
        success: true,
        messageId: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date()
      };
    } else {
      return {
        success: false,
        error: 'Failed to send email (simulated error)',
        timestamp: new Date()
      };
    }
  }

  async sendEmail(to: string, subject: string, body: string, html: boolean = false): Promise<MessageResult> {
    return this.sendMessage(to, subject, body);
  }

  async sendBulkEmails(recipients: Array<{ to: string; subject: string; body: string }>): Promise<MessageResult[]> {
    const results: MessageResult[] = [];
    
    for (const recipient of recipients) {
      const result = await this.sendEmail(recipient.to, recipient.subject, recipient.body);
      results.push(result);
      
      // Small delay between sends to simulate rate limiting
      await this.delay(50);
    }
    
    return results;
  }

  getType(): string {
    return 'email';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
