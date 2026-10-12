import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { warm } from './src/feel';
import { listenPush } from './src/push';
import { Lane } from './src/screens/Lane';
import { theme } from './src/theme';

export default function App() {
  const [loaded] = useFonts({
    [theme.font.price]: require('./assets/fonts/Bodoni-Display.ttf'),
    [theme.font.priceItalic]: require('./assets/fonts/Bodoni-DisplayItalic.ttf'),
    [theme.font.text]: require('./assets/fonts/Bodoni-Text.ttf'),
  });
  useEffect(() => { warm(); }, []);
  useEffect(() => listenPush(), []);   // taps route through ./nav; permission is never asked here
  if (!loaded) return <View style={{ flex: 1, backgroundColor: theme.color.ink }} />;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Lane />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
