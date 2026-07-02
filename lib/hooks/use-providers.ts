/**
 * useProviders Hook
 * Manages provider configurations and connections
 */

import { useState, useCallback } from 'react';
import { 
  MockEmailProvider, 
  MockWhatsAppProvider, 
  MockSmsProvider 
} from '../providers/mock';
import { 
  EmailConfig, 
  WhatsAppConfig, 
  SmsConfig, 
  ProviderTestResult 
} from '../types';

export function useProviders() {
  const [emailProvider] = useState(() => new MockEmailProvider());
  const [whatsappProvider] = useState(() => new MockWhatsAppProvider());
  const [smsProvider] = useState(() => new MockSmsProvider());
  
  const [emailConfig, setEmailConfig] = useState<EmailConfig | null>(null);
  const [whatsappConfig, setWhatsAppConfig] = useState<WhatsAppConfig | null>(null);
  const [smsConfig, setSmsConfig] = useState<SmsConfig | null>(null);
  
  const [isTesting, setIsTesting] = useState(false);

  const configureEmail = useCallback((config: EmailConfig) => {
    emailProvider.configure(config);
    setEmailConfig(config);
  }, [emailProvider]);

  const configureWhatsApp = useCallback((config: WhatsAppConfig) => {
    whatsappProvider.configure(config);
    setWhatsAppConfig(config);
  }, [whatsappProvider]);

  const configureSms = useCallback((config: SmsConfig) => {
    smsProvider.configure(config);
    setSmsConfig(config);
  }, [smsProvider]);

  const testEmailConnection = useCallback(async (): Promise<ProviderTestResult> => {
    setIsTesting(true);
    try {
      const result = await emailProvider.testConnection();
      return result;
    } finally {
      setIsTesting(false);
    }
  }, [emailProvider]);

  const testWhatsAppConnection = useCallback(async (): Promise<ProviderTestResult> => {
    setIsTesting(true);
    try {
      const result = await whatsappProvider.testConnection();
      return result;
    } finally {
      setIsTesting(false);
    }
  }, [whatsappProvider]);

  const testSmsConnection = useCallback(async (): Promise<ProviderTestResult> => {
    setIsTesting(true);
    try {
      const result = await smsProvider.testConnection();
      return result;
    } finally {
      setIsTesting(false);
    }
  }, [smsProvider]);

  const getProvider = useCallback((type: 'email' | 'whatsapp' | 'sms') => {
    switch (type) {
      case 'email':
        return emailProvider;
      case 'whatsapp':
        return whatsappProvider;
      case 'sms':
        return smsProvider;
      default:
        return null;
    }
  }, [emailProvider, whatsappProvider, smsProvider]);

  const isEmailConfigured = useCallback(() => {
    return emailProvider.isConfigured();
  }, [emailProvider]);

  const isWhatsAppConfigured = useCallback(() => {
    return whatsappProvider.isConfigured();
  }, [whatsappProvider]);

  const isSmsConfigured = useCallback(() => {
    return smsProvider.isConfigured();
  }, [smsProvider]);

  return {
    emailProvider,
    whatsappProvider,
    smsProvider,
    emailConfig,
    whatsappConfig,
    smsConfig,
    configureEmail,
    configureWhatsApp,
    configureSms,
    testEmailConnection,
    testWhatsAppConnection,
    testSmsConnection,
    getProvider,
    isEmailConfigured,
    isWhatsAppConfigured,
    isSmsConfigured,
    isTesting,
  };
}
