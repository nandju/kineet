/**
 * useNotifications Hook
 * Manages notification state and operations
 */

import { useState, useCallback } from 'react';
import { Notification, NotificationType, NotificationCategory } from '../types';
import { toast } from 'sonner';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((
    type: NotificationType,
    category: NotificationCategory,
    title: string,
    message: string,
    actionUrl?: string
  ) => {
    const notification: Notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      category,
      title,
      message,
      timestamp: new Date(),
      read: false,
      actionUrl,
    };

    setNotifications(prev => [notification, ...prev]);

    // Also show toast notification
    switch (type) {
      case 'success':
        toast.success(title, { description: message });
        break;
      case 'error':
        toast.error(title, { description: message });
        break;
      case 'warning':
        toast.warning(title, { description: message });
        break;
      case 'info':
      default:
        toast.info(title, { description: message });
        break;
    }

    return notification;
  }, []);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const removeNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const getUnreadCount = useCallback(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  // Convenience methods for common notification types
  const notifySuccess = useCallback((category: NotificationCategory, title: string, message: string) => {
    return addNotification('success', category, title, message);
  }, [addNotification]);

  const notifyError = useCallback((category: NotificationCategory, title: string, message: string) => {
    return addNotification('error', category, title, message);
  }, [addNotification]);

  const notifyWarning = useCallback((category: NotificationCategory, title: string, message: string) => {
    return addNotification('warning', category, title, message);
  }, [addNotification]);

  const notifyInfo = useCallback((category: NotificationCategory, title: string, message: string) => {
    return addNotification('info', category, title, message);
  }, [addNotification]);

  // Specific notification helpers
  const importCompleted = useCallback((rowCount: number) => {
    return notifySuccess(
      'import_completed',
      'Import terminé',
      `${rowCount} contacts importés avec succès`
    );
  }, [notifySuccess]);

  const campaignCreated = useCallback((campaignName: string) => {
    return notifySuccess(
      'campaign_created',
      'Campagne créée',
      `La campagne "${campaignName}" a été créée`
    );
  }, [notifySuccess]);

  const campaignCompleted = useCallback((campaignName: string, sentCount: number) => {
    return notifySuccess(
      'campaign_completed',
      'Campagne terminée',
      `La campagne "${campaignName}" est terminée. ${sentCount} messages envoyés.`
    );
  }, [notifySuccess]);

  const campaignPaused = useCallback((campaignName: string) => {
    return notifyWarning(
      'campaign_paused',
      'Campagne mise en pause',
      `La campagne "${campaignName}" a été mise en pause`
    );
  }, [notifyWarning]);

  const campaignResumed = useCallback((campaignName: string) => {
    return notifyInfo(
      'campaign_resumed',
      'Campagne reprise',
      `La campagne "${campaignName}" a été reprise`
    );
  }, [notifyInfo]);

  const campaignFailed = useCallback((campaignName: string, errorMessage: string) => {
    return notifyError(
      'campaign_failed',
      'Campagne échouée',
      `La campagne "${campaignName}" a échoué: ${errorMessage}`
    );
  }, [notifyError]);

  const configSaved = useCallback((providerType: string) => {
    return notifySuccess(
      'config_saved',
      'Configuration enregistrée',
      `La configuration ${providerType} a été enregistrée`
    );
  }, [notifySuccess]);

  const connectionSuccess = useCallback((providerType: string) => {
    return notifySuccess(
      'connection_success',
      'Connexion réussie',
      `La connexion ${providerType} est établie`
    );
  }, [notifySuccess]);

  const connectionFailed = useCallback((providerType: string, errorMessage: string) => {
    return notifyError(
      'connection_failed',
      'Connexion échouée',
      `La connexion ${providerType} a échoué: ${errorMessage}`
    );
  }, [notifyError]);

  return {
    notifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    getUnreadCount,
    success: notifySuccess,
    error: notifyError,
    warning: notifyWarning,
    info: notifyInfo,
    importCompleted,
    campaignCreated,
    campaignCompleted,
    campaignPaused,
    campaignResumed,
    campaignFailed,
    configSaved,
    connectionSuccess,
    connectionFailed,
  };
}
