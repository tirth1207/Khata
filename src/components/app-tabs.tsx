import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  return <NativeTabs backgroundColor={colors.background} indicatorColor={colors.backgroundElement} labelStyle={{ selected: { color: colors.text } }}>
    <NativeTabs.Trigger name="index"><NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label><NativeTabs.Trigger.Icon sf={{default:'house.fill',selected:'house.fill'}} /></NativeTabs.Trigger>
    <NativeTabs.Trigger name="transactions"><NativeTabs.Trigger.Label>Transactions</NativeTabs.Trigger.Label><NativeTabs.Trigger.Icon sf={{default:'list.bullet',selected:'list.bullet'}} /></NativeTabs.Trigger>
    <NativeTabs.Trigger name="insights"><NativeTabs.Trigger.Label>Insights</NativeTabs.Trigger.Label><NativeTabs.Trigger.Icon sf={{default:'chart.bar.fill',selected:'chart.bar.fill'}} /></NativeTabs.Trigger>
    <NativeTabs.Trigger name="goals"><NativeTabs.Trigger.Label>Goals</NativeTabs.Trigger.Label><NativeTabs.Trigger.Icon sf={{default:'target',selected:'target'}} /></NativeTabs.Trigger>
    <NativeTabs.Trigger name="more"><NativeTabs.Trigger.Label>More</NativeTabs.Trigger.Label><NativeTabs.Trigger.Icon sf={{default:'ellipsis.circle.fill',selected:'ellipsis.circle.fill'}} /></NativeTabs.Trigger>
  </NativeTabs>;
}
