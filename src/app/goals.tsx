import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useKhata } from '@/context/KhataContext';
import { Button, Card, Field, Loading, SectionTitle, useKhataTheme } from '@/components/khata-ui';
import { toMinorUnits, formatMoney } from '@/types';

export default function GoalsScreen(){
  const {ready,goals,settings,addGoal,contributeToGoal}=useKhata();
  const { palette, styles: ui } = useKhataTheme();
  const [open,setOpen]=useState(false),[name,setName]=useState(''),[target,setTarget]=useState(''),[contribute,setContribute]=useState<string|null>(null),[amount,setAmount]=useState('');
  const currency=settings?.defaultCurrency||'INR';
  if(!ready)return <Loading/>;
  const create=async()=>{if(!name||!Number(target))return;await addGoal({name,targetAmount:toMinorUnits(Number(target),currency as any),currency,icon:'target',color:'#007AFF',description:undefined,targetDate:undefined,accountId:undefined});setName('');setTarget('');setOpen(false);};
  return <View style={ui.screen}><ScrollView contentContainerStyle={ui.content}><Text style={ui.eyebrow}>PLAN AHEAD</Text><Text style={[ui.title,{marginTop:3}]}>Savings goals</Text><Text style={ui.subtitle}>Turn future purchases into visible progress.</Text><SectionTitle title="Your goals" action="+ Add" onAction={()=>setOpen(true)}/>{goals.length===0?<Card><Text style={ui.muted}>No goals yet. Start with something concrete.</Text></Card>:goals.map(g=>{const pct=g.targetAmount?Math.min(1,g.currentAmount/g.targetAmount):0;return <Card key={g.id} style={{marginBottom:12}}><View style={ui.row}><View style={ui.grow}><Text style={[s.name,{color:palette.text}]}>{g.name}</Text><Text style={ui.small}>{formatMoney(g.currentAmount,currency as any)} of {formatMoney(g.targetAmount,currency as any)}</Text></View><Text style={ui.amount}>{Math.round(pct*100)}%</Text></View><View style={[ui.progressTrack,{marginTop:14}]}><View style={[ui.progressFill,{width:(pct*100)+'%'}]}/></View><Pressable onPress={()=>setContribute(g.id)} style={{marginTop:14}}><Text style={ui.action}>{g.isCompleted?'Completed':'Add contribution →'}</Text></Pressable></Card>})}</ScrollView>
    <Modal visible={open} transparent animationType="slide" onRequestClose={()=>setOpen(false)}><View style={m.backdrop}><View style={[m.sheet,{backgroundColor:palette.surface}]}><Text style={ui.title}>New goal</Text><Text style={ui.subtitle}>Set a target and build it over time.</Text><View style={{marginTop:18}}><Field label="Goal name" placeholder="MacBook, emergency fund…" value={name} onChangeText={setName}/><Field label="Target amount" keyboardType="decimal-pad" placeholder="80000" value={target} onChangeText={setTarget}/><Button title="Create goal" onPress={create}/></View></View></View></Modal>
    <Modal visible={!!contribute} transparent animationType="fade" onRequestClose={()=>setContribute(null)}><View style={m.backdrop}><View style={[m.sheet,{backgroundColor:palette.surface}]}><Text style={ui.title}>Add contribution</Text><Field label="Amount" keyboardType="decimal-pad" placeholder="5000" value={amount} onChangeText={setAmount}/><Button title="Add contribution" onPress={async()=>{if(contribute&&Number(amount)){await contributeToGoal(contribute as any,toMinorUnits(Number(amount),currency as any));setAmount('');setContribute(null);}}}/></View></View></Modal>
  </View>;
}
const s=StyleSheet.create({name:{fontSize:17,fontWeight:'700'}});
const m=StyleSheet.create({backdrop:{flex:1,backgroundColor:'rgba(0,0,0,.48)',justifyContent:'flex-end'},sheet:{borderTopLeftRadius:28,borderTopRightRadius:28,padding:22,paddingBottom:38}});,borderTopLeftRadius:28,borderTopRightRadius:28,padding:22,paddingBottom:38}});
