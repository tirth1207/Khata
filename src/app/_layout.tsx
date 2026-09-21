import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppTabs from '@/components/app-tabs';
import { KhataProvider, useKhata } from '@/context/KhataContext';

SplashScreen.preventAutoHideAsync();

function AppShell() {
  const scheme = useColorScheme();
  const { ready } = useKhata();
  useEffect(() => { if (ready) SplashScreen.hideAsync(); }, [ready]);
  return <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
    <StatusBar style="auto" />
    <AppTabs />
  </ThemeProvider>;
}

export default function RootLayout() {
  return <SafeAreaProvider><KhataProvider><AppShell /></KhataProvider></SafeAreaProvider>;
}
