import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { warm } from './src/feel';
import { Lane } from './src/screens/Lane';
import { theme } from './src/theme';

export default function App() {
  const [loaded] = useFonts({
    [theme.font.price]: require('./assets/fonts/InstrumentSerif-Italic.ttf'),
    [theme.font.sans]: require('./assets/fonts/Manrope-600.ttf'),
    [theme.font.sansBold]: require('./assets/fonts/Manrope-700.ttf'),
  });
  useEffect(() => { warm(); }, []);
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
