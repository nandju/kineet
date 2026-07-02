/**
 * Provider Layer types and interfaces
 */

export type ProviderType = 'email' | 'whatsapp' | 'sms';

export type ProviderStatus = 'not_configured' | 'configured' | 'connected' | 'disconnected' | 'error';

export interface ProviderConfig {
  type: ProviderType;
  status: ProviderStatus;
  lastChecked?: Date;
}

export interface EmailConfig extends ProviderConfig {
  type: 'email';
  expediteur: string;
  adresseEmail: string;
  serveurSmtp: string;
  port: number;
  utilisateur: string;
  motDePasse: string;
  signature?: string;
  adresseReponse?: string;
  securite?: 'none' | 'tls' | 'ssl';
}

export interface WhatsAppConfig extends ProviderConfig {
  type: 'whatsapp';
  apiKey: string;
  phoneNumber: string;
  businessId?: string;
}

export interface SmsConfig extends ProviderConfig {
  type: 'sms';
  apiKey: string;
  senderId?: string;
  gatewayType?: 'api' | 'android';
  androidDeviceId?: string; // For Android gateway
}

export type AnyProviderConfig = EmailConfig | WhatsAppConfig | SmsConfig;

export interface MessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: Date;
}

export interface ProviderTestResult {
  success: boolean;
  message: string;
  details?: any;
}
