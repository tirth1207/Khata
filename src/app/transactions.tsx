import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useKhata } from '@/context/KhataContext';
import { Card, Field, Loading, useKhataTheme } from '@/components/khata-ui';
import { TransactionSheet } from '@/components/TransactionSheet';
import { formatMoney } from '@/types';

export default function TransactionsScreen(){
  const {ready,transactions,categories,accounts,settings,removeTransaction}=useKhata();
  const { palette, styles: ui } = useKhataTheme();
  const [query,setQuery]=useState(''),[sheet,setSheet]=useState(false);
  const currency=settings?.defaultCurrency||'INR';
  const filtered=useMemo(()=>transactions.filter(t=>t.currency===currency&&((t.note||'').toLowerCase().includes(query.toLowerCase())||(categories.find(c=>c.id===t.categoryId)?.name||'').toLowerCase().includes(query.toLowerCase())||(accounts.find(a=>a.id===t.accountId)?.name||'').toLowerCase().includes(query.toLowerCase()))),[transactions,categories,accounts,query,currency]);
  if(!ready)return <Loading/>;
  return <View style={ui.screen}><FlatList data={filtered} keyExtractor={x=>x.id} contentContainerStyle={[ui.content,{paddingBottom:150}]} ListHeaderComponent={<><Text style={ui.eyebrow}>LEDGER</Text><Text style={[ui.title,{marginTop:3}]}>Transactions</Text><Text style={ui.subtitle}>Search, inspect and manage the entries in your local ledger.</Text><Field label="" placeholder="Search notes, categories or accounts" value={query} onChangeText={setQuery} style={{marginTop:16}}/></>} renderItem={({item})=><Card style={{marginTop:10,padding:14}}><Pressable onLongPress={()=>Alert.alert('Delete transaction?','The entry will be soft-deleted from the ledger.',[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:()=>removeTransaction(item.id)}])}><View style={ui.row}><View style={[s.icon,{backgroundColor:item.type==='income'?palette.incomeSoft:palette.expenseSoft}]}><Text style={{fontWeight:'800',color:item.type==='income'?palette.income:palette.expense}}>{item.type==='income'?'+':'−'}</Text></View><View style={ui.grow}><Text style={[s.name,{color:palette.text}]}>{categories.find(c=>c.id===item.categoryId)?.name||item.type}</Text><Text style={ui.small}>{item.note||'No note'} · {accounts.find(a=>a.id===item.accountId)?.name||'Account'}</Text><Text style={ui.small}>{new Date(item.date).toLocaleString()}</Text></View><Text style={[s.amount,{color:item.type==='income'?palette.income:palette.text}]}>{item.type==='income'?'+':'−'}{formatMoney(item.amount,currency as any)}</Text></View></Pressable></Card>} ListEmptyComponent={<Card style={{marginTop:16}}><Text style={ui.muted}>No matching transactions.</Text></Card>}/><Pressable style={ui.fab} onPress={()=>setSheet(true)}><Text style={ui.fabText}>+</Text></Pressable><TransactionSheet visible={sheet} onClose={()=>setSheet(false)}/></View>;
}
const s=StyleSheet.create({icon:{width:40,height:40,borderRadius:13,alignItems:'center',justifyContent:'center',marginRight:12},name:{fontSize:15,fontWeight:'700'},amount:{fontSize:16,fontWeight:'700'}});
