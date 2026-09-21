import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { getDatabase, getSettings, updateSettings } from '@/lib/storage/database';
import { getActiveAccounts, createAccount } from '@/lib/storage/repositories/accounts';
import { createTransaction, getRecentTransactions, createTransfer, deleteTransaction } from '@/lib/storage/repositories/transactions';
import { getAllCategories } from '@/lib/storage/repositories/categories';
import { createBudget, getActiveBudgets } from '@/lib/storage/repositories/budgets';
import { createGoal, getAllGoals, addGoalContribution } from '@/lib/storage/repositories/goals';
import { getAllBills } from '@/lib/storage/repositories/bills';
import { getActiveDebts } from '@/lib/storage/repositories/debts';
import { getAllInvestments } from '@/lib/storage/repositories/investments';
import type { Account, AppSettings, Bill, Budget, Category, Debt, EntityId, Investment, MinorUnits, SavingsGoal, Transaction, TransactionType } from '@/types';

type NewTransaction = { type: TransactionType; amount: MinorUnits; currency: string; accountId: EntityId; toAccountId?: EntityId; categoryId?: EntityId; note?: string; date: string };
type KhataContextValue = {
  ready: boolean; busy: boolean; accounts: Account[]; transactions: Transaction[]; categories: Category[];
  budgets: Budget[]; goals: SavingsGoal[]; bills: Bill[]; debts: Debt[]; investments: Investment[];
  settings: AppSettings | null; refresh: () => Promise<void>;
  addAccount: (data: Parameters<typeof createAccount>[0]) => Promise<void>;
  addTransaction: (data: NewTransaction) => Promise<void>;
  addTransfer: (data: { amount: MinorUnits; currency: string; fromAccountId: EntityId; toAccountId: EntityId; note?: string; date: string }) => Promise<void>;
  removeTransaction: (id: EntityId) => Promise<void>;
  addGoal: (data: Parameters<typeof createGoal>[0]) => Promise<void>;
  contributeToGoal: (id: EntityId, amount: MinorUnits) => Promise<void>;
  addBudget: (data: Parameters<typeof createBudget>[0]) => Promise<void>;
  setSetting: (updates: Partial<AppSettings>) => Promise<void>;
};
const KhataContext = createContext<KhataContextValue | null>(null);

export function KhataProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      await getDatabase();
      const result = await Promise.all([
        getActiveAccounts(), getRecentTransactions(200), getAllCategories(true), getActiveBudgets(),
        getAllGoals(), getAllBills(true), getActiveDebts(), getAllInvestments(), getSettings()
      ]);
      setAccounts(result[0]); setTransactions(result[1]); setCategories(result[2]); setBudgets(result[3]);
      setGoals(result[4]); setBills(result[5]); setDebts(result[6]); setInvestments(result[7]); setSettings(result[8]);
    } finally { setBusy(false); setReady(true); }
  }, []);

  useEffect(() => {
    refresh().catch(error => Alert.alert('Khata', error instanceof Error ? error.message : 'Unable to open local database.'));
  }, [refresh]);

  const mutate = useCallback(async (work: () => Promise<void>) => {
    setBusy(true);
    try { await work(); await refresh(); } finally { setBusy(false); }
  }, [refresh]);

  const value = useMemo<KhataContextValue>(() => ({
    ready, busy, accounts, transactions, categories, budgets, goals, bills, debts, investments, settings, refresh,
    addAccount: data => mutate(async () => { await createAccount(data); }),
    addTransaction: data => mutate(async () => { await createTransaction(data); }),
    addTransfer: data => mutate(async () => { await createTransfer(data); }),
    removeTransaction: id => mutate(async () => { await deleteTransaction(id); }),
    addGoal: data => mutate(async () => { await createGoal(data); }),
    contributeToGoal: (id, amount) => mutate(async () => { const account = accounts[0]; if (!account) throw new Error('Add an account before contributing to a goal.'); await addGoalContribution({ goalId:id, amount, currency:account.currency, accountId:account.id, date:new Date().toISOString() }); }),
    addBudget: data => mutate(async () => { await createBudget(data); }),
    setSetting: updates => mutate(async () => { await updateSettings(updates); }),
  }), [ready, busy, accounts, transactions, categories, budgets, goals, bills, debts, investments, settings, refresh, mutate]);

  return <KhataContext.Provider value={value}>{children}</KhataContext.Provider>;
}

export function useKhata() {
  const value = useContext(KhataContext);
  if (!value) throw new Error('useKhata must be used inside KhataProvider');
  return value;
}
