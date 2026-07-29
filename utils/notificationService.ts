import axios from 'axios';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import Config from '../constants/Config';

const API_BASE = Config.API_BASE_URL;

export interface NotificationItem {
  id: string;
  notification_id: string;
  title: string;
  sub: string;
  created_by?: string;
  created_date?: string;
  reg_no: string;
  name?: string;
  is_send: boolean;
  is_read: boolean;
  sent_datetime?: string | null;
  read_datetime?: string | null;
  read_at?: string | null;
}

// Check if running inside Expo Go client app (Expo SDK 53+ removed remote push from Expo Go)
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient || (Constants as any).appOwnership === 'expo';

// Safe lazy getter for expo-notifications to prevent auto-registration warning in Expo Go
let _Notifications: any = null;
function getNotificationsModule() {
  if (isExpoGo) return null;
  if (!_Notifications) {
    try {
      _Notifications = require('expo-notifications');
      _Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });


      if (Platform.OS === 'android') {
        _Notifications.setNotificationChannelAsync('default', {
          name: 'Default Notifications',
          importance: _Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#1A73E8',
          sound: 'default',
        });
      }
    } catch (e) {
      _Notifications = null;
    }
  }
  return _Notifications;
}


/**
 * Register FCM push token for a user reg_no with the backend API
 */
export async function registerFCMToken(regNo: string, fcmToken: string): Promise<boolean> {
  try {
    const response = await axios.post(`${API_BASE}/register-fcm-token/`, {
      reg_no: regNo,
      fcm_token: fcmToken,
    });
    return response.status === 200;
  } catch (error) {
    console.error('Error registering FCM token:', error);
    return false;
  }
}

/**
 * Request notification permissions, get device FCM token, and send to backend.
 * Gracefully handles Expo Go SDK 53+ without triggering console error overlays.
 */
export async function registerDeviceForPushNotifications(regNo: string): Promise<boolean> {
  if (!regNo) return false;

  try {
    const Notifications = getNotificationsModule();

    // If running in Expo Go or module not available, register dev token cleanly
    if (isExpoGo || !Notifications) {
      console.log(`Running in Expo Go. Registering dev token for ${regNo}`);
      const devToken = `FCM_DEV_TOKEN_${regNo.replace(/[^a-zA-Z0-9]/g, '_')}`;
      return await registerFCMToken(regNo, devToken);
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Push notification permission not granted. Registering fallback token...');
      const fallbackToken = `FCM_DEV_TOKEN_${regNo.replace(/[^a-zA-Z0-9]/g, '_')}`;
      return await registerFCMToken(regNo, fallbackToken);
    }

    let fcmToken: string | null = null;
    try {
      const tokenData = await Notifications.getDevicePushTokenAsync();
      fcmToken = typeof tokenData.data === 'string' ? tokenData.data : JSON.stringify(tokenData.data);
    } catch (e) {
      try {
        const expoToken = await Notifications.getExpoPushTokenAsync();
        fcmToken = expoToken.data;
      } catch (err) {
        console.warn('Device push token not available, generating token identifier');
      }
    }

    if (!fcmToken) {
      fcmToken = `FCM_DEV_TOKEN_${regNo.replace(/[^a-zA-Z0-9]/g, '_')}`;
    }

    console.log(`Registering FCM Token for ${regNo}:`, fcmToken);
    return await registerFCMToken(regNo, fcmToken);

  } catch (error) {
    console.error('Error in registerDeviceForPushNotifications:', error);
    const fallbackToken = `FCM_DEV_TOKEN_${regNo.replace(/[^a-zA-Z0-9]/g, '_')}`;
    return await registerFCMToken(regNo, fallbackToken);
  }
}


/**
 * Filters out notifications that have been marked as read for more than 24 hours (86,400,000 ms)
 */
export function filterNotifications24h(notifications: NotificationItem[]): NotificationItem[] {
  const now = new Date().getTime();
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

  return notifications.filter((item) => {
    if (!item.is_read) return true; // Always display unread notifications
    const readTimestamp = item.read_at || item.read_datetime;
    if (!readTimestamp) return true;
    const readTime = new Date(readTimestamp).getTime();
    return now - readTime <= TWENTY_FOUR_HOURS_MS;
  });
}

/**
 * Fetch all push notifications for a specific reg_no (filtered to display only within 24h of being read)
 */
export async function getUserNotifications(regNo: string): Promise<NotificationItem[]> {
  try {
    const response = await axios.get(`${API_BASE}/user-notifications/`, {
      params: { reg_no: regNo }
    });
    return filterNotifications24h(response.data);
  } catch (error) {
    console.error(`Error fetching notifications for ${regNo}:`, error);
    try {
      const responseFallback = await axios.get(`${API_BASE}/notifications/user/${encodeURIComponent(regNo)}`);
      return filterNotifications24h(responseFallback.data);
    } catch (e) {
      return [];
    }
  }
}


/**
 * Mark a notification as read (opened) for a given reg_no
 */
export async function markNotificationAsRead(
  notificationId: string,
  regNo: string
): Promise<{ success: boolean; read_datetime?: string; read_at?: string }> {
  try {
    const response = await axios.post(`${API_BASE}/notifications/mark-read/`, {
      notification_id: notificationId,
      reg_no: regNo,
    });
    if (response.status === 200) {
      return {
        success: true,
        read_datetime: response.data.read_datetime || response.data.read_at,
        read_at: response.data.read_at || response.data.read_datetime,
      };
    }
    return { success: false };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return { success: false };
  }
}
