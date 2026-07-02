/**
 * Message Engine
 * Handles message preparation and variable replacement
 */

import { Recipient } from '../types';

export class MessageEngine {
  /**
   * Replace variables in a message template with recipient data
   */
  static replaceVariables(template: string, recipient: Recipient): string {
    let result = template;

    // Replace {{nom}}
    result = result.replace(/\{\{nom\}\}/gi, recipient.nom);

    // Replace {{prenom}}
    result = result.replace(/\{\{prenom\}\}/gi, recipient.prenom);

    // Replace {{entreprise}}
    result = result.replace(/\{\{entreprise\}\}/gi, recipient.entreprise || '');

    // Replace {{email}}
    result = result.replace(/\{\{email\}\}/gi, recipient.email || '');

    // Replace {{contact}}
    result = result.replace(/\{\{contact\}\}/gi, recipient.contact);

    return result;
  }

  /**
   * Get list of available variables from a template
   */
  static getVariablesInTemplate(template: string): string[] {
    const variableRegex = /\{\{(\w+)\}\}/gi;
    const variables = new Set<string>();
    let match;

    while ((match = variableRegex.exec(template)) !== null) {
      variables.add(match[1].toLowerCase());
    }

    return Array.from(variables);
  }

  /**
   * Validate that all required variables are present in recipient data
   */
  static validateVariables(template: string, recipient: Recipient): {
    valid: boolean;
    missing: string[];
  } {
    const variables = this.getVariablesInTemplate(template);
    const missing: string[] = [];

    variables.forEach(variable => {
      const value = recipient[variable as keyof Recipient];
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        missing.push(variable);
      }
    });

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Preview message with sample recipient data
   */
  static previewMessage(template: string, sampleData: Partial<Recipient>): string {
    const recipient: Recipient = {
      id: 'preview',
      nom: sampleData.nom || 'Dupont',
      prenom: sampleData.prenom || 'Jean',
      contact: sampleData.contact || '+33612345678',
      email: sampleData.email || 'jean.dupont@example.com',
      entreprise: sampleData.entreprise || 'Acme Corp',
      statut: 'waiting',
      nombreTentatives: 0,
    };

    return this.replaceVariables(template, recipient);
  }

  /**
   * Prepare message for a specific channel
   */
  static prepareForChannel(
    message: string,
    channel: 'email' | 'whatsapp' | 'sms',
    subject?: string
  ): { subject?: string; body: string } {
    switch (channel) {
      case 'email':
        return {
          subject: subject || 'Sans sujet',
          body: message,
        };
      case 'whatsapp':
        // WhatsApp messages don't have subjects
        return {
          body: this.truncateForChannel(message, 'whatsapp'),
        };
      case 'sms':
        // SMS messages need to be truncated to 160 chars (or split)
        return {
          body: this.truncateForChannel(message, 'sms'),
        };
      default:
        return { body: message };
    }
  }

  /**
   * Truncate message for channel limits
   */
  static truncateForChannel(message: string, channel: 'email' | 'whatsapp' | 'sms'): string {
    switch (channel) {
      case 'sms':
        // SMS limit is 160 characters for single message
        if (message.length <= 160) return message;
        return message.substring(0, 157) + '...';
      case 'whatsapp':
        // WhatsApp limit is much higher (4096 chars)
        if (message.length <= 4096) return message;
        return message.substring(0, 4093) + '...';
      case 'email':
        // Email has no practical limit
        return message;
      default:
        return message;
    }
  }

  /**
   * Count message segments for SMS
   */
  static countSmsSegments(message: string): number {
    if (message.length <= 160) return 1;
    if (message.length <= 306) return 2;
    if (message.length <= 459) return 3;
    if (message.length <= 612) return 4;
    return Math.ceil(message.length / 153);
  }

  /**
   * Sanitize message for HTML (for email)
   */
  static sanitizeForHtml(message: string): string {
    return message
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Convert plain text to HTML (for email)
   */
  static textToHtml(text: string): string {
    const sanitized = this.sanitizeForHtml(text);
    return sanitized
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
  }
}
