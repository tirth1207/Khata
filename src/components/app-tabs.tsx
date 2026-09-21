import { NativeTabs } from 'expo-router/unstable-native-tabs';

const LIGHT = {
  background: '#FFFFFF',
  selected: '#F0F0F2',
  text: '#111113',
};

export default function AppTabs() {
  return <NativeTabs
    backgroundColor={LIGHT.background}
    indicatorColor={LIGHT.selected}
    tintColor={LIGHT.text}
    disableTransparentOnScrollEdge
    tabBarRespectsIMEInsets
  >
    <NativeTabs.Trigger name="index" contentStyle={{backgroundColor:LIGHT.background}}>
      <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
    </NativeTabs.Trigger>
    <NativeTabs.Trigger name="transactions" contentStyle={{backgroundColor:LIGHT.background}}>
      <NativeTabs.Trigger.Label>Transactions</NativeTabs.Trigger.Label>
      <NativeTabs.Trigger.Icon sf="list.bullet" md="list" />
    </NativeTabs.Trigger>
    <NativeTabs.Trigger name="insights" contentStyle={{backgroundColor:LIGHT.background}}>
      <NativeTabs.Trigger.Label>Insights</NativeTabs.Trigger.Label>
      <NativeTabs.Trigger.Icon sf="chart.bar.fill" md="bar_chart" />
    </NativeTabs.Trigger>
    <NativeTabs.Trigger name="goals" contentStyle={{backgroundColor:LIGHT.background}}>
      <NativeTabs.Trigger.Label>Goals</NativeTabs.Trigger.Label>
      <NativeTabs.Trigger.Icon sf="target" md="track_changes" />
    </NativeTabs.Trigger>
    <NativeTabs.Trigger name="more" contentStyle={{backgroundColor:LIGHT.background}}>
      <NativeTabs.Trigger.Label>More</NativeTabs.Trigger.Label>
      <NativeTabs.Trigger.Icon sf="ellipsis.circle.fill" md="more_horiz" />
    </NativeTabs.Trigger>
  </NativeTabs>;
}
