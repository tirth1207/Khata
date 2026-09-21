import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, useColorScheme, View, type TextInputProps, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type KhataPalette = {
  bg:string; surface:string; surfaceElevated:string; text:string; muted:string; border:string;
  primary:string; primaryText:string; income:string; incomeSoft:string; expense:string; expenseSoft:string;
  warning:string; warningSoft:string; accent:string; input:string; progressTrack:string;
};

const LIGHT: KhataPalette = {
  bg:'#F6F6F8', surface:'#FFFFFF', surfaceElevated:'#FFFFFF', text:'#111113', muted:'#6E6E73',
  border:'#E4E4E8', primary:'#111113', primaryText:'#FFFFFF', income:'#248A3D', incomeSoft:'#EAF6ED',
  expense:'#D92D20', expenseSoft:'#FDEDEC', warning:'#A15C00', warningSoft:'#FFF3E0',
  accent:'#007AFF', input:'#FAFAFC', progressTrack:'#E8E8ED',
};

const DARK: KhataPalette = {
  bg:'#0B0B0D', surface:'#151518', surfaceElevated:'#1C1C20', text:'#F5F5F7', muted:'#A1A1A8',
  border:'#2A2A2F', primary:'#F5F5F7', primaryText:'#111113', income:'#30D158', incomeSoft:'#18341F',
  expense:'#FF453A', expenseSoft:'#3A1B1B', warning:'#FF9F0A', warningSoft:'#3A2B14',
  accent:'#0A84FF', input:'#1B1B1F', progressTrack:'#2B2B30',
};

export const palette = LIGHT;

function buildStyles(p: KhataPalette, topInset = 0, bottomInset = 0) {
  return StyleSheet.create({
    screen:{flex:1,backgroundColor:p.bg},
    content:{paddingHorizontal:20,paddingTop:topInset+18,paddingBottom:bottomInset+110,maxWidth:900,width:'100%',alignSelf:'center'},
    eyebrow:{color:p.muted,fontSize:12,fontWeight:'700',letterSpacing:.5},
    title:{color:p.text,fontSize:30,lineHeight:36,fontWeight:'700',letterSpacing:-.7},
    subtitle:{color:p.muted,fontSize:15,lineHeight:21,marginTop:5},
    card:{backgroundColor:p.surface,borderRadius:22,borderWidth:StyleSheet.hairlineWidth,borderColor:p.border,padding:18},
    sectionHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:11,marginTop:24},
    sectionTitle:{color:p.text,fontSize:18,fontWeight:'700'},
    action:{color:p.accent,fontWeight:'700',fontSize:14},
    button:{minHeight:50,borderRadius:16,backgroundColor:p.primary,alignItems:'center',justifyContent:'center',paddingHorizontal:18},
    secondary:{backgroundColor:p.surfaceElevated,borderWidth:1,borderColor:p.border},
    danger:{backgroundColor:p.expense},
    buttonText:{color:p.primaryText,fontWeight:'700',fontSize:15},
    field:{gap:7,marginBottom:13},
    label:{color:p.text,fontSize:13,fontWeight:'600'},
    input:{minHeight:50,borderWidth:1,borderColor:p.border,borderRadius:15,paddingHorizontal:14,color:p.text,backgroundColor:p.input,fontSize:16},
    muted:{color:p.muted,fontSize:13},
    loading:{flex:1,alignItems:'center',justifyContent:'center',gap:10,backgroundColor:p.bg},
    row:{flexDirection:'row',alignItems:'center'}, grow:{flex:1},
    amount:{color:p.text,fontSize:17,fontWeight:'700'}, small:{color:p.muted,fontSize:12},
    pill:{paddingHorizontal:10,paddingVertical:6,borderRadius:10,backgroundColor:p.surfaceElevated,borderWidth:1,borderColor:p.border},
    pillText:{color:p.muted,fontSize:11,fontWeight:'700'},
    fab:{position:'absolute',right:20,bottom:24,width:58,height:58,borderRadius:29,backgroundColor:p.primary,alignItems:'center',justifyContent:'center',shadowColor:'#000',shadowOpacity:.24,shadowRadius:12,shadowOffset:{width:0,height:5},elevation:8},
    fabText:{color:p.primaryText,fontSize:30,fontWeight:'400',lineHeight:32},
    divider:{height:StyleSheet.hairlineWidth,backgroundColor:p.border,marginVertical:14},
    progressTrack:{height:8,backgroundColor:p.progressTrack,borderRadius:8,overflow:'hidden'},
    progressFill:{height:'100%',backgroundColor:p.primary,borderRadius:8},
  });
}

export function useKhataTheme() {
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const colors = scheme === 'dark' ? DARK : LIGHT;
  return { palette:colors, styles:buildStyles(colors, insets.top, insets.bottom), isDark:scheme === 'dark' };
}

export function Card({children,style}:{children:React.ReactNode;style?:ViewStyle}) {
  const {styles}=useKhataTheme();
  return <View style={[styles.card,style]}>{children}</View>;
}
export function SectionTitle({title,action,onAction}:{title:string;action?:string;onAction?:()=>void}) {
  const {styles}=useKhataTheme();
  return <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{title}</Text>{action&&<Pressable onPress={onAction} hitSlop={8}><Text style={styles.action}>{action}</Text></Pressable>}</View>;
}
export function Button({title,onPress,variant='primary',disabled=false}:{title:string;onPress:()=>void;variant?:'primary'|'secondary'|'danger';disabled?:boolean}) {
  const {styles}=useKhataTheme();
  return <Pressable disabled={disabled} onPress={onPress} style={({pressed})=>[styles.button,variant==='secondary'&&styles.secondary,variant==='danger'&&styles.danger,pressed&&{opacity:.72},disabled&&{opacity:.45}]}><Text style={styles.buttonText}>{title}</Text></Pressable>;
}
export function Field({label,...props}:TextInputProps&{label:string}) {
  const {styles}=useKhataTheme();
  return <View style={styles.field}>{label?<Text style={styles.label}>{label}</Text>:null}<TextInput placeholderTextColor="#92929A" {...props} style={[styles.input,props.style]}/></View>;
}
export function Loading(){const {styles,palette}=useKhataTheme();return <View style={styles.loading}><ActivityIndicator size="small" color={palette.accent}/><Text style={styles.muted}>Loading your local ledger…</Text></View>;}
