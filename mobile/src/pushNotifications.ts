import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { cloudEnabled, supabase } from './supabase';

const CHANNEL_ID = 'elladria-updates';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Elladria updates',
    description: 'Application updates and Elladria announcements',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 200, 250],
    lightColor: '#1d4e89',
  });
}

async function expoToken() {
  if (Platform.OS === 'web' || !Device.isDevice || !cloudEnabled || !supabase) return null;
  await ensureAndroidChannel();
  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) throw new Error('Notification project configuration is missing.');
  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}

async function storeToken(userId: string, token: string) {
  if (!supabase) return;
  const result = await supabase.from('push_tokens').upsert({
    user_id: userId,
    expo_token: token,
    platform: Platform.OS,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'expo_token' });
  if (result.error) throw result.error;
}

export async function unregisterPushNotifications() {
  if (Platform.OS === 'web' || !supabase) return;
  try {
    const token = await expoToken();
    if (token) await supabase.from('push_tokens').delete().eq('expo_token', token);
  } catch {
    // Signing out must still work when notification services are unavailable.
  }
}

export function usePushNotifications(userId?: string) {
  const [error, setError] = useState('');
  useEffect(() => {
    if (!userId || Platform.OS === 'web') return;
    let active = true;
    let tokenSubscription: Notifications.EventSubscription | undefined;
    void expoToken().then(async token => {
      if (!token || !active) return;
      await storeToken(userId, token);
      tokenSubscription = Notifications.addPushTokenListener(next => {
        if (next.type === 'expo') void storeToken(userId, next.data).catch(() => {});
      });
      if (active) setError('');
    }).catch(reason => {
      if (active) setError(reason instanceof Error ? reason.message : 'Notifications could not be enabled.');
    });
    return () => {
      active = false;
      tokenSubscription?.remove();
    };
  }, [userId]);
  return { error };
}