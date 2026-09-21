import { DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppTabs from '@/components/app-tabs';
import { KhataProvider, useKhata } from '@/context/KhataContext';

SplashScreen.preventAutoHideAsync();
SystemUI.setBackgroundColorAsync('#F6F6F8');

function AppShell() {
  const { ready } = useKhata();
  useEffect(() => { if (ready) SplashScreen.hideAsync(); }, [ready]);

  return <ThemeProvider value={DefaultTheme}>
    <StatusBar style="dark" backgroundColor="#F6F6F8" />
    <AppTabs />
  </ThemeProvider>;
}

export default function RootLayout() {
  return <SafeAreaProvider><KhataProvider><AppShell /></KhataProvider></SafeAreaProvider>;
}
