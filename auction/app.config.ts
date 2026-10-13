/* The app's config. It was app.json; it is code so the EAS project id comes from
   the environment and never sits in the tree.

   EAS_PROJECT_ID: push tokens need it on device builds. getExpoPushTokenAsync
   (src/push.ts) reads extra.eas.projectId; without it a development or store
   build on a phone gets no token, the Worker never learns where to send
   "Outbid", "Yours" or "Started", and the buyer hears nothing. Set it before
   `eas build` or `npx expo run:ios|android` (README, Push). Unset, the web
   export and the simulators run as before, without push. */
import type { ConfigContext, ExpoConfig } from 'expo/config';

const projectId = (process.env.EAS_PROJECT_ID ?? '').trim() || undefined;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Obavia',
  slug: 'obavia-auction',
  scheme: 'obavia',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'co.obavia.auction',
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    package: 'co.obavia.auction',
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  plugins: [
    'expo-audio',
    'expo-image',
    'expo-font',
    'expo-web-browser',
    'expo-secure-store',
    'expo-brightness',   // the pass at full brightness at the lot (Pickup)
    'expo-notifications',   // outbid, won, started (src/push.ts); needs extra.eas.projectId on a device build
    ['expo-camera', {   // the licence and the insurance card (Won, Scan); photos only, no sound
      cameraPermission: 'Obavia uses the camera to read your licence and insurance card.',
      microphonePermission: false,
      recordAudioAndroid: false,
    }],
  ],
  backgroundColor: '#1C2436',
  extra: {
    ...config.extra,
    // push tokens need this on device builds: EAS_PROJECT_ID from the environment (README, Push)
    eas: { ...(config.extra?.eas ?? {}), ...(projectId ? { projectId } : {}) },
  },
});
