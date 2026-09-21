import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useKhata } from '@/context/KhataContext';
import { Card, Field, Loading, SectionTitle, Button, palette, styles as ui } from '@/components/khata-ui';
import { ACCOUNT_TYPES, formatMoney, toMinorUnits } from '@/types';

export default function MoreScreen(){
  const {ready,accounts,settings,addAccount,setSetting,refresh}=useKhata();
  const [adding,setAdding]=useState(false),[name,setName]=useState(''),[amount,setAmount]=useState('');
  const [type,setType]=useState<'cash'|'bank'|'upi'|'wallet'|'savings'>('cash');
  if(!ready)return <Loading/>;
  const currency=settings?.defaultCurrency||'INR';
  const save=async()=>{if(!name.trim())return;await addAccount({name:name.trim(),type,openingBalance:toMinorUnits(Number(amount)||0,currency as any),currency,icon:ACCOUNT_TYPES[type].icon,color:ACCOUNT_TYPES[type].defaultColor,notes:undefined});setName('');setAmount('');setAdding(false);};
  return <ScrollView style={ui.screen} contentContainerStyle={ui.content}><Text style={ui.eyebrow}>CONTROL CENTER</Text><Text style={[ui.title,{marginTop:3}]}>More</Text><Text style={ui.subtitle}>Accounts, privacy and local data controls.</Text>
    <SectionTitle title="Accounts" action="+ Add" onAction={()=>setAdding(!adding)}/>{accounts.length===0?<Card><Text style={ui.muted}>No accounts yet.</Text></Card>:accounts.map(a=><Card key={a.id} style={{marginBottom:9}}><View style={ui.row}><View style={{width:10,height:36,borderRadius:5,backgroundColor:a.color,marginRight:12}}/><View style={ui.grow}><Text style={{fontSize:16,fontWeight:'700',color:palette.text}}>{a.name}</Text><Text style={ui.small}>{ACCOUNT_TYPES[a.type]?.label||a.type}</Text></View><Text style={ui.amount}>{formatMoney(a.currentBalance,currency as any)}</Text></View></Card>)}
    {adding&&<Card style={{marginTop:2}}><Text style={ui.title}>New account</Text><View style={{marginTop:15}}><Field label="Name" placeholder="HDFC Bank, Cash, UPI…" value={name} onChangeText={setName}/><Field label="Opening balance" keyboardType="decimal-pad" placeholder="0" value={amount} onChangeText={setAmount}/><Text style={ui.label}>Type</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginVertical:10}}>{(['cash','bank','upi','wallet','savings'] as const).map(x=><Pressable key={x} onPress={()=>setType(x)} style={[ui.pill,type===x&&{backgroundColor:palette.primary}]}><Text style={[ui.pillText,type===x&&{color:'#FFF'}]}>{ACCOUNT_TYPES[x].label}</Text></Pressable>)}</View><Button title="Save account" onPress={save}/></View></Card>}
    <SectionTitle title="Privacy"/><Card><Text style={{fontWeight:'700',color:palette.text}}>Local-first by default</Text><Text style={ui.subtitle}>Financial records stay in the device SQLite database. Normal finance management does not need internet, bank APIs or a backend.</Text><View style={ui.divider}/><View style={ui.row}><View style={ui.grow}><Text style={{fontWeight:'700',color:palette.text}}>Gemini AI</Text><Text style={ui.small}>Bring your own key. Optional.</Text></View><Pressable onPress={()=>setSetting({aiEnabled:!settings?.aiEnabled})} style={[ui.pill,settings?.aiEnabled&&{backgroundColor:palette.primary}]}><Text style={[ui.pillText,settings?.aiEnabled&&{color:'#FFF'}]}>{settings?.aiEnabled?'ON':'OFF'}</Text></Pressable></View></Card>
    <SectionTitle title="Data"/><Card><Button title="Refresh local database" onPress={refresh} variant="secondary"/></Card>
    <SectionTitle title="Currency"/><Card><Text style={{fontWeight:'700',color:palette.text}}>Default currency: {currency}</Text><Text style={ui.small}>Transactions store their currency explicitly and use integer minor units for calculations.</Text></Card>
    <SectionTitle title="Design principle"/><Card><Text style={{fontSize:16,fontWeight:'700',color:palette.text}}>Your money. Your device. Your control.</Text><Text style={[ui.subtitle,{marginTop:5}]}>Khata is designed as a quiet financial command center, not a spreadsheet.</Text></Card>
  </ScrollView>;
}
