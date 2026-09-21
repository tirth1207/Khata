import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import AppTabs from '@/components/app-tabs';
import { KhataProvider } from '@/context/KhataContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const scheme = useColorScheme();
  return <KhataProvider><ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}><AppTabs /></ThemeProvider></KhataProvider>;
}
