import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { useEffect } from 'react';
import AppTabs from '@/components/app-tabs';
import { KhataProvider, useKhata } from '@/context/KhataContext';

SplashScreen.preventAutoHideAsync();

function AppShell() {
  const scheme = useColorScheme();
  const { ready } = useKhata();
  useEffect(() => { if (ready) SplashScreen.hideAsync(); }, [ready]);
  return <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}><AppTabs /></ThemeProvider>;
}

export default function RootLayout() {
  return <KhataProvider><AppShell /></KhataProvider>;
}
