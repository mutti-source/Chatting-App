import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { updateUserProfile } from '../firebase/firestore';

// Configure foreground notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request notification permissions and register Expo push token
 */
export async function registerForPushNotificationsAsync(userId?: string): Promise<string | null> {
  let token: string | null = null;

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#007AFF',
        sound: 'default',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Notification permission not granted');
      return null;
    }

    // Get Expo push token safely
    const projectId = 
      Constants.expoConfig?.extra?.eas?.projectId || 
      Constants.easConfig?.projectId || 
      '00e1048a-ea59-4522-b996-662ad7502f5a';

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    }).catch(() => null);

    if (tokenData?.data) {
      token = tokenData.data;
      if (userId) {
        await updateUserProfile(userId, { pushToken: token });
      }
    }
  } catch (error) {
    console.log('Error registering for push notifications:', error);
  }

  return token;
}

/**
 * Trigger an immediate local in-app notification banner
 */
export async function triggerLocalNotification(title: string, body: string, data?: any) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: 'default',
      },
      trigger: null, // trigger immediately
    });
  } catch (error) {
    console.log('Local notification error:', error);
  }
}

/**
 * Send remote push notification via Expo Push API to specific tokens
 */
export async function sendRemotePushNotification(
  pushTokens: string[],
  title: string,
  body: string,
  data?: any
) {
  const validTokens = pushTokens.filter(t => t && t.startsWith('ExponentPushToken'));
  if (validTokens.length === 0) return;

  const messages = validTokens.map(token => ({
    to: token,
    sound: 'default',
    title,
    body,
    data: data || {},
    priority: 'high',
    channelId: 'default',
  }));

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
  } catch (error) {
    console.log('Error sending remote push notification:', error);
  }
}
