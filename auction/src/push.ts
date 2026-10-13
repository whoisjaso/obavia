/* Words in the push, silence in the app. Permission is asked at the first
   Watch or first bid (the caller decides when), never at launch. The token
   goes to the Worker once; a tap on a push lands through ./nav (its data is
   { screen, lotId }: lane, won, pickup, me, or offer for the "Second chance"
   push, W3-B). Native-only modules are required lazily so the web export
   never loads them. */
import { Platform } from 'react-native';
import { AUCTION_URL, buyerToken } from './store';
import { go, isScreen } from './nav';

type N = typeof import('expo-notifications');

function notifications(): N | null {
  if (Platform.OS === 'web') return null;
  try { return require('expo-notifications') as N; } catch { return null; }
}

function isPhysicalDevice(): boolean {
  try { return !!(require('expo-device') as typeof import('expo-device')).isDevice; } catch { return false; }
}

function projectId(): string | undefined {
  try {
    const mod = require('expo-constants');
    const Constants = mod?.default ?? mod;
    const id = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    return typeof id === 'string' && id ? id : undefined;
  } catch { return undefined; }
}

let ran: Promise<boolean> | null = null;

/** Ask once, register once. Resolves true when the Worker stored the token. */
export function registerPush(): Promise<boolean> {
  if (!ran) ran = register().then(ok => { if (!ok) ran = null; return ok; }, () => { ran = null; return false; });
  return ran;
}

async function register(): Promise<boolean> {
  if (Platform.OS === 'web' || !AUCTION_URL) return false;
  const Notifications = notifications();
  if (!Notifications || !isPhysicalDevice()) return false;
  let perm = await Notifications.getPermissionsAsync();
  if (perm.status === 'undetermined') perm = await Notifications.requestPermissionsAsync();
  if (perm.status !== 'granted') return false;
  const id = projectId();
  let token: string;
  try {
    token = (id ? await Notifications.getExpoPushTokenAsync({ projectId: id }) : await Notifications.getExpoPushTokenAsync()).data;
  } catch { return false; }
  const bearer = buyerToken();
  if (!token || !bearer) return false;
  const res = await fetch(`${AUCTION_URL}/me/push`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${bearer}` },
    body: JSON.stringify({ token }),
  });
  return res.status === 200;
}

function route(data: unknown) {
  if (!data || typeof data !== 'object') return;
  const { screen, lotId } = data as { screen?: unknown; lotId?: unknown };
  if (!isScreen(screen)) return;
  go(typeof lotId === 'string' && lotId ? { screen, lotId } : { screen });
}

/** Foreground handling and tap routing. Returns the unsubscribe. */
export function listenPush(): () => void {
  const Notifications = notifications();
  if (!Notifications) return () => {};
  let live = true;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
    });
  } catch { /* the handler is a nicety; taps still route */ }
  let sub: { remove(): void } | null = null;
  try {
    sub = Notifications.addNotificationResponseReceivedListener(r => route(r.notification.request.content.data));
  } catch { sub = null; }
  Notifications.getLastNotificationResponseAsync()
    .then(r => { if (live && r) route(r.notification.request.content.data); })
    .catch(() => {});
  return () => {
    live = false;
    sub?.remove();
    try { Notifications.setNotificationHandler(null); } catch { /* nothing to undo */ }
  };
}
