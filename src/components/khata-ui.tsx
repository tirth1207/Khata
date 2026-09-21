import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';

export const palette = { bg:'#F7F7F9', surface:'#FFFFFF', text:'#111113', muted:'#6E6E73', border:'#E6E6EB', primary:'#111113', income:'#248A3D', incomeSoft:'#EAF6ED', expense:'#D92D20', expenseSoft:'#FDEDEC', warning:'#A15C00', accent:'#007AFF' };

export function Card({children, style}:{children:React.ReactNode;style?:ViewStyle}) { return <View style={[styles.card,style]}>{children}</View>; }
export function SectionTitle({title,action,onAction}:{title:string;action?:string;onAction?:()=>void}) { return <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{title}</Text>{action && <Pressable onPress={onAction}><Text style={styles.action}>{action}</Text></Pressable>}</View>; }
export function Button({title,onPress,variant='primary',disabled=false}:{title:string;onPress:()=>void;variant?:'primary'|'secondary'|'danger';disabled?:boolean}) { return <Pressable disabled={disabled} onPress={onPress} style={({pressed})=>[styles.button,variant==='secondary'&&styles.secondary,variant==='danger'&&styles.danger,pressed&&{opacity:.72},disabled&&{opacity:.45}]}><Text style={[styles.buttonText,variant!=='primary'&&{color:palette.text}]}>{title}</Text></Pressable>; }
export function Field({label,...props}:TextInputProps&{label:string}) { return <View style={styles.field}>{label ? <Text style={styles.label}>{label}</Text> : null}<TextInput placeholderTextColor="#9A9AA1" {...props} style={[styles.input,props.style]} /></View>; }
export function Loading() { return <View style={styles.loading}><ActivityIndicator size="small" color={palette.accent}/><Text style={styles.muted}>Loading your local ledger…</Text></View>; }

export const styles=StyleSheet.create({
 screen:{flex:1,backgroundColor:palette.bg}, content:{paddingHorizontal:20,paddingTop:18,paddingBottom:120,maxWidth:900,width:'100%',alignSelf:'center'},
 eyebrow:{color:palette.muted,fontSize:12,fontWeight:'700',letterSpacing:.5}, title:{color:palette.text,fontSize:30,lineHeight:36,fontWeight:'700',letterSpacing:-.7}, subtitle:{color:palette.muted,fontSize:15,lineHeight:21,marginTop:5},
 card:{backgroundColor:palette.surface,borderRadius:22,borderWidth:StyleSheet.hairlineWidth,borderColor:palette.border,padding:18}, sectionHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:11,marginTop:22}, sectionTitle:{color:palette.text,fontSize:18,fontWeight:'700'}, action:{color:palette.accent,fontWeight:'600',fontSize:14},
 button:{minHeight:48,borderRadius:16,backgroundColor:palette.primary,alignItems:'center',justifyContent:'center',paddingHorizontal:18}, secondary:{backgroundColor:'#F0F0F3'}, danger:{backgroundColor:palette.expense}, buttonText:{color:'#FFF',fontWeight:'700',fontSize:15},
 field:{gap:7,marginBottom:13}, label:{color:palette.text,fontSize:13,fontWeight:'600'}, input:{minHeight:50,borderWidth:1,borderColor:palette.border,borderRadius:15,paddingHorizontal:14,color:palette.text,backgroundColor:'#FAFAFC',fontSize:16},
 muted:{color:palette.muted,fontSize:13}, loading:{flex:1,alignItems:'center',justifyContent:'center',gap:10,backgroundColor:palette.bg}, row:{flexDirection:'row',alignItems:'center'}, grow:{flex:1},
 amount:{color:palette.text,fontSize:17,fontWeight:'700'}, small:{color:palette.muted,fontSize:12}, pill:{paddingHorizontal:10,paddingVertical:6,borderRadius:10,backgroundColor:'#F0F0F3'}, pillText:{color:palette.muted,fontSize:11,fontWeight:'700'},
 fab:{position:'absolute',right:20,bottom:94,width:58,height:58,borderRadius:29,backgroundColor:palette.primary,alignItems:'center',justifyContent:'center',shadowColor:'#000',shadowOpacity:.18,shadowRadius:12,shadowOffset:{width:0,height:5},elevation:8}, fabText:{color:'#FFF',fontSize:28,fontWeight:'300'},
 divider:{height:StyleSheet.hairlineWidth,backgroundColor:palette.border,marginVertical:14}, progressTrack:{height:8,backgroundColor:'#ECECF0',borderRadius:8,overflow:'hidden'}, progressFill:{height:'100%',backgroundColor:palette.primary,borderRadius:8}
});
