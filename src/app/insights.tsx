import React, { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useKhata } from '@/context/KhataContext';
import { Card, Loading, SectionTitle, palette, styles as ui } from '@/components/khata-ui';
import { formatMoney, type MinorUnits } from '@/types';

export default function InsightsScreen(){
  const {ready,transactions,categories,budgets,settings}=useKhata();
  const currency=settings?.defaultCurrency||'INR'; const now=new Date();
  const start=new Date(now.getFullYear(),now.getMonth(),1).toISOString();
  const prevStart=new Date(now.getFullYear(),now.getMonth()-1,1).toISOString();
  const prevEnd=new Date(now.getFullYear(),now.getMonth(),0,23,59,59,999).toISOString();
  const current=transactions.filter(t=>t.currency===currency&&t.date>=start);
  const previous=transactions.filter(t=>t.currency===currency&&t.date>=prevStart&&t.date<=prevEnd);
  const expenses=current.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0 as MinorUnits);
  const previousExpenses=previous.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0 as MinorUnits);
  const income=current.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0 as MinorUnits);
  const rate=income?Math.round((income-expenses)/income*100):0;
  const top=useMemo(()=>{const m=new Map<string,number>();current.filter(t=>t.type==='expense').forEach(t=>m.set(t.categoryId||'other',(m.get(t.categoryId||'other')||0)+t.amount));return Array.from(m.entries()).sort((a,b)=>b[1]-a[1]).slice(0,5)},[current]);
  if(!ready)return <Loading/>;
  const messages:string[]=[];
  if(previousExpenses>0&&expenses>previousExpenses)messages.push('Expenses are '+Math.round((expenses-previousExpenses)/previousExpenses*100)+'% higher than last month.');
  if(previousExpenses>0&&expenses<previousExpenses)messages.push('Expenses are '+Math.round((previousExpenses-expenses)/previousExpenses*100)+'% lower than last month.');
  if(!previousExpenses&&expenses)messages.push('This is your first tracked spending period.');
  if(budgets[0])messages.push(expenses>budgets[0].amount?'You have exceeded '+budgets[0].name+' by '+formatMoney((expenses-budgets[0].amount) as MinorUnits,currency as any)+'.':budgets[0].name+' has '+formatMoney((budgets[0].amount-expenses) as MinorUnits,currency as any)+' remaining.');
  messages.push(rate>=0?'Your savings rate this month is '+rate+'%.':'Expenses currently exceed income this month.');
  return <ScrollView style={ui.screen} contentContainerStyle={ui.content}><Text style={ui.eyebrow}>UNDERSTAND</Text><Text style={[ui.title,{marginTop:3}]}>Insights</Text><Text style={ui.subtitle}>Rule-based intelligence runs entirely offline. AI remains optional.</Text><SectionTitle title="What changed"/>{messages.map((x,i)=><Card key={i} style={{marginBottom:10}}><Text style={{fontSize:15,fontWeight:'650',color:palette.text}}>{x}</Text><Text style={[ui.small,{marginTop:7}]}>Calculated from local ledger data.</Text></Card>)}<SectionTitle title="Top spending categories"/><Card>{top.length===0?<Text style={ui.muted}>No spending data yet.</Text>:top.map(([id,amount],i)=><View key={id} style={[ui.row,{paddingVertical:9}]}><Text style={[ui.small,{width:24}]}>{i+1}</Text><Text style={ui.grow}>{categories.find(c=>c.id===id)?.name||'Other'}</Text><Text style={ui.amount}>{formatMoney(amount as MinorUnits,currency as any)}</Text></View>)}</Card></ScrollView>;
}
