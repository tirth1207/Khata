import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, type TextInputProps, type ViewStyle, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type KhataPalette = {
  bg:string; surface:string; surfaceElevated:string; text:string; muted:string; border:string;
  primary:string; primaryText:string; income:string; incomeSoft:string; expense:string; expenseSoft:string;
  warning:string; warningSoft:string; accent:string; input:string; progressTrack:string;
};
const LIGHT: KhataPalette = {
  bg:'#F5F5F2', surface:'#FFFFFF', surfaceElevated:'#F0F0EC', text:'#171717', muted:'#777770',
  border:'#E5E5DF', primary:'#171717', primaryText:'#FFFFFF', income:'#17834B', incomeSoft:'#E8F5EE',
  expense:'#C83B32', expenseSoft:'#FBECEA', warning:'#9A6500', warningSoft:'#FFF4D9', accent:'#315CFF',
  input:'#F4F4F1', progressTrack:'#E8E8E2',
};
function buildStyles(p: KhataPalette, topInset=0, bottomInset=0){return StyleSheet.create({
 screen:{flex:1,backgroundColor:p.bg},
 content:{paddingHorizontal:18,paddingTop:topInset+14,paddingBottom:bottomInset+110,maxWidth:900,width:'100%',alignSelf:'center'},
 eyebrow:{color:p.muted,fontSize:11,fontWeight:'800',letterSpacing:1.1}, title:{color:p.text,fontSize:30,lineHeight:36,fontWeight:'800',letterSpacing:-1},
 subtitle:{color:p.muted,fontSize:14,lineHeight:20,marginTop:4}, card:{backgroundColor:p.surface,borderRadius:20,borderWidth:StyleSheet.hairlineWidth,borderColor:p.border,padding:16},
 sectionHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:10,marginTop:24}, sectionTitle:{color:p.text,fontSize:17,fontWeight:'800',letterSpacing:-.2},
 action:{color:p.accent,fontWeight:'800',fontSize:13}, button:{minHeight:50,borderRadius:15,backgroundColor:p.primary,alignItems:'center',justifyContent:'center',paddingHorizontal:18},
 secondary:{backgroundColor:p.surfaceElevated,borderWidth:1,borderColor:p.border}, danger:{backgroundColor:p.expense}, buttonText:{color:p.primaryText,fontWeight:'800',fontSize:15},
 field:{gap:7,marginBottom:13}, label:{color:p.text,fontSize:13,fontWeight:'700'}, input:{minHeight:50,borderWidth:1,borderColor:p.border,borderRadius:15,paddingHorizontal:14,color:p.text,backgroundColor:p.input,fontSize:16},
 muted:{color:p.muted,fontSize:13}, loading:{flex:1,alignItems:'center',justifyContent:'center',gap:10,backgroundColor:p.bg}, row:{flexDirection:'row',alignItems:'center'}, grow:{flex:1},
 amount:{color:p.text,fontSize:16,fontWeight:'800'}, small:{color:p.muted,fontSize:12}, pill:{paddingHorizontal:12,paddingVertical:8,borderRadius:999,backgroundColor:p.surface,borderWidth:1,borderColor:p.border},
 pillText:{color:p.muted,fontSize:12,fontWeight:'800'}, fab:{position:'absolute',right:18,bottom:22,width:58,height:58,borderRadius:29,backgroundColor:p.primary,alignItems:'center',justifyContent:'center',shadowColor:'#000',shadowOpacity:.18,shadowRadius:14,shadowOffset:{width:0,height:6},elevation:8},
 fabText:{color:p.primaryText,fontSize:28,fontWeight:'400',lineHeight:32}, divider:{height:StyleSheet.hairlineWidth,backgroundColor:p.border,marginVertical:14},
 progressTrack:{height:8,backgroundColor:p.progressTrack,borderRadius:8,overflow:'hidden'}, progressFill:{height:'100%',backgroundColor:p.primary,borderRadius:8},
});}
export function useKhataTheme(){const insets=useSafeAreaInsets();return {palette:LIGHT,styles:buildStyles(LIGHT,insets.top,insets.bottom),isDark:false};}
export function Card({children,style}:{children:React.ReactNode;style?:ViewStyle}){const {styles}=useKhataTheme();return <View style={[styles.card,style]}>{children}</View>;}
export function SectionTitle({title,action,onAction}:{title:string;action?:string;onAction?:()=>void}){const {styles}=useKhataTheme();return <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{title}</Text>{action&&<Pressable onPress={onAction} hitSlop={8}><Text style={styles.action}>{action}</Text></Pressable>}</View>;}
export function Button({title,onPress,variant='primary',disabled=false}:{title:string;onPress:()=>void;variant?:'primary'|'secondary'|'danger';disabled?:boolean}){const {styles}=useKhataTheme();return <Pressable disabled={disabled} onPress={onPress} style={({pressed})=>[styles.button,variant==='secondary'&&styles.secondary,variant==='danger'&&styles.danger,pressed&&{opacity:.72},disabled&&{opacity:.45}]}><Text style={styles.buttonText}>{title}</Text></Pressable>;}
export function Field({label,...props}:TextInputProps&{label:string}){const {styles}=useKhataTheme();return <View style={styles.field}>{label?<Text style={styles.label}>{label}</Text>:null}<TextInput placeholderTextColor="#989890" {...props} style={[styles.input,props.style]}/></View>;}
export function Loading(){const {styles,palette}=useKhataTheme();return <View style={styles.loading}><ActivityIndicator size="small" color={palette.accent}/><Text style={styles.muted}>Loading your local ledger…</Text></View>;}
