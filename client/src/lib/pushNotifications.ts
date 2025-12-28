/**
 * Push Notification Service
 * Handles browser push notifications with permission management
 */

export type NotificationPermission = 'default' | 'granted' | 'denied';

/**
 * Request permission for browser notifications
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  return permission as NotificationPermission;
}

/**
 * Check current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission as NotificationPermission;
}

/**
 * Show a browser notification
 */
export function showNotification(
  title: string,
  options?: {
    body?: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: any;
    requireInteraction?: boolean;
  }
): Notification | null {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return null;
  }

  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted');
    return null;
  }

  const notification = new Notification(title, {
    icon: options?.icon || '/icon-192.png',
    badge: options?.badge || '/icon-192.png',
    body: options?.body,
    tag: options?.tag,
    data: options?.data,
    requireInteraction: options?.requireInteraction || false,
  });

  return notification;
}

/**
 * Check if notifications are supported and enabled
 */
export function areNotificationsSupported(): boolean {
  return 'Notification' in window;
}

/**
 * Check if notifications are enabled (permission granted)
 */
export function areNotificationsEnabled(): boolean {
  return areNotificationsSupported() && Notification.permission === 'granted';
}
