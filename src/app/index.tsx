import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useKhata } from '@/context/KhataContext';
import { Card, Loading, SectionTitle, palette, styles as ui } from '@/components/khata-ui';
import { TransactionSheet } from '@/components/TransactionSheet';
import { formatMoney, type MinorUnits } from '@/types';

export default function HomeScreen() {
  const { ready, accounts, transactions, categories, budgets, bills, settings } = useKhata();
  const [sheet,setSheet]=useState(false);
  const currency=settings?.defaultCurrency||'INR';
  const now=new Date();
  const start=new Date(now.getFullYear(),now.getMonth(),1).toISOString();
  const month=transactions.filter(t=>t.currency===currency&&t.date>=start);
  const income=month.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0 as MinorUnits);
  const expenses=month.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0 as MinorUnits);
  const balance=accounts.filter(a=>a.currency===currency).reduce((s,a)=>s+a.currentBalance,0 as MinorUnits);
  const savings=income-expenses;
  const categoryTotals=useMemo(()=>{const map=new Map<string,number>();month.filter(t=>t.type==='expense').forEach(t=>map.set(t.categoryId||'other',(map.get(t.categoryId||'other')||0)+t.amount));return Array.from(map.entries()).sort((a,b)=>b[1]-a[1]).slice(0,4);},[month]);
  if(!ready)return <Loading/>;
  return <View style={ui.screen}><ScrollView contentContainerStyle={ui.content}>
    <Text style={ui.eyebrow}>GOOD EVENING</Text><Text style={[ui.title,{marginTop:3}]}>Your money, quietly under control.</Text><Text style={ui.subtitle}>A private ledger that works without a bank connection or a server.</Text>
    <Card style={s.hero}><Text style={s.heroLabel}>TOTAL BALANCE</Text><Text style={s.balance}>{formatMoney(balance,currency as any)}</Text><View style={ui.row}><Metric label="Income" value={formatMoney(income,currency as any)} tone="income"/><Metric label="Expenses" value={formatMoney(expenses,currency as any)} tone="expense"/><Metric label="Saved" value={formatMoney(savings,currency as any)}/></View></Card>
    {accounts.length===0&&<Card style={{marginTop:14}}><Text style={s.emptyTitle}>Start with your first account</Text><Text style={ui.subtitle}>Cash, bank, UPI, wallet — whatever represents money you control.</Text><Pressable onPress={()=>setSheet(true)}><Text style={[ui.action,{marginTop:12}]}>Add a transaction →</Text></Pressable></Card>}
    <SectionTitle title="This month"/>
    <Card><View style={ui.row}><View style={ui.grow}><Text style={ui.small}>SAVINGS RATE</Text><Text style={s.big}>{income>0?Math.round(savings/income*100):0}%</Text></View><Text style={{color:savings>=0?palette.income:palette.expense,fontWeight:'700'}}>{savings>=0?'On track':'Over income'}</Text></View><View style={[ui.progressTrack,{marginTop:14}]}><View style={[ui.progressFill,{width:(income>0?Math.max(0,Math.min(100,savings/income*100)):0)+'%',backgroundColor:savings>=0?palette.income:palette.expense}]}/></View></Card>
    <SectionTitle title="Where it goes"/><Card>{categoryTotals.length===0?<Text style={ui.muted}>No expenses recorded this month.</Text>:categoryTotals.map(([id,amount],i)=><View key={id} style={[ui.row,{paddingVertical:8}]}><View style={[s.dot,{backgroundColor:['#007AFF','#FF9500','#AF52DE','#34C759'][i]}]}/><Text style={ui.grow}>{categories.find(c=>c.id===id)?.name||'Other'}</Text><Text style={ui.amount}>{formatMoney(amount as MinorUnits,currency as any)}</Text></View>)}</Card>
    <SectionTitle title="Recent activity"/><Card>{transactions.slice(0,5).map(t=><View key={t.id} style={[ui.row,{paddingVertical:9}]}><View style={[s.icon,{backgroundColor:t.type==='income'?palette.incomeSoft:palette.expenseSoft}]}><Text style={{fontWeight:'800',color:t.type==='income'?palette.income:palette.expense}}>{t.type==='income'?'+':'−'}</Text></View><View style={ui.grow}><Text style={s.name}>{categories.find(c=>c.id===t.categoryId)?.name||t.type}</Text><Text style={ui.small}>{t.note||new Date(t.date).toLocaleDateString()}</Text></View><Text style={[ui.amount,{color:t.type==='income'?palette.income:palette.text}]}>{t.type==='income'?'+':'−'}{formatMoney(t.amount,currency as any)}</Text></View>)}</Card>
    {budgets[0]&&<><SectionTitle title="Budget"/><Card><View style={ui.row}><View style={ui.grow}><Text style={ui.small}>{budgets[0].name}</Text><Text style={ui.amount}>{formatMoney(budgets[0].amount,currency as any)}</Text></View><Text style={ui.small}>monthly target</Text></View></Card></>}
    {bills.filter(b=>!b.isPaid).slice(0,2).length>0&&<><SectionTitle title="Upcoming bills"/><Card>{bills.filter(b=>!b.isPaid).slice(0,2).map(b=><View key={b.id} style={[ui.row,{paddingVertical:8}]}><View style={ui.grow}><Text style={s.name}>{b.name}</Text><Text style={ui.small}>Due {new Date(b.dueDate).toLocaleDateString()}</Text></View><Text style={ui.amount}>{formatMoney(b.amount,currency as any)}</Text></View>)}</Card></>}
  </ScrollView><Pressable style={ui.fab} onPress={()=>setSheet(true)}><Text style={ui.fabText}>+</Text></Pressable><TransactionSheet visible={sheet} onClose={()=>setSheet(false)}/></View>;
}
function Metric({label,value,tone}:{label:string;value:string;tone?:'income'|'expense'}){return <View style={{flex:1,marginTop:20}}><Text style={ui.small}>{label}</Text><Text style={[ui.amount,{marginTop:3,color:tone==='income'?palette.income:tone==='expense'?palette.expense:'#FFF'}]}>{value}</Text></View>;}
const s=StyleSheet.create({hero:{marginTop:18,backgroundColor:'#111113',borderColor:'#111113'},heroLabel:{fontSize:11,fontWeight:'800',letterSpacing:.7,color:'#A7A7AD'},balance:{fontSize:38,fontWeight:'750',letterSpacing:-1.4,color:'#FFF',marginTop:4},big:{fontSize:25,fontWeight:'750',color:palette.text,marginTop:3},dot:{width:9,height:9,borderRadius:5,marginRight:10},icon:{width:36,height:36,borderRadius:12,alignItems:'center',justifyContent:'center',marginRight:11},name:{fontSize:15,fontWeight:'700',color:palette.text},emptyTitle:{fontSize:17,fontWeight:'700',color:palette.text}});
