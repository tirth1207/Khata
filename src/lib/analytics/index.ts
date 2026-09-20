// Khata - Analytics Service
// Financial calculations and analytics

import { 
  EntityId, 
  MinorUnits, 
  ISODateString,
  AnalyticsPeriod,
  DashboardSummary,
  BudgetSummary,
  CategorySpending,
  AccountSummary,
  NetWorthPoint,
  CashFlowPoint,
  getPeriodRange,
  formatMoney,
  fromMinorUnits,
} from '@/types';
import { queryAll, queryFirst } from '../storage/database';
import { getActiveAccounts } from '../storage/repositories/accounts';
import { getActiveBudgets } from '../storage/repositories/budgets';
import { getActiveGoals } from '../storage/repositories/goals';
import { getUpcomingBills, getOverdueBills } from '../storage/repositories/bills';
import { getTotalOwedToMe, getTotalIOwe } from '../storage/repositories/debts';
import { getPortfolioValue } from '../storage/repositories/investments';

// Dashboard Summary
export async function getDashboardSummary(period: AnalyticsPeriod, currency: string = 'INR'): Promise<DashboardSummary> {
  const { start, end } = getPeriodRange(period);
  const startISO = start.toISOString() as ISODateString;
  const endISO = end.toISOString() as ISODateString;
  
  const [totalBalance, totalIncome, totalExpenses, netWorth] = await Promise.all([
    getTotalBalance(currency),
    getTransactionSumByType('income', startISO, endISO),
    getTransactionSumByType('expense', startISO, endISO),
    getNetWorth(currency),
  ]);
  
  return {
    totalBalance,
    totalIncome,
    totalExpenses,
    totalSavings: (totalIncome - totalExpenses) as MinorUnits,
    netWorth,
    period,
    currency,
  };
}

// Net Worth Calculation
export async function getNetWorth(currency: string = 'INR'): Promise<MinorUnits> {
  const [assets, liabilities] = await Promise.all([
    getTotalAssets(currency),
    getTotalLiabilities(currency),
  ]);
  
  return (assets - liabilities) as MinorUnits;
}

export async function getTotalAssets(currency: string = 'INR'): Promise<MinorUnits> {
  const db = await (await import('../storage/database')).getDatabase();
  
  // Account balances (asset accounts only)
  const accountsResult = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(current_balance), 0) as total 
     FROM accounts 
     WHERE currency = ? AND is_archived = 0 AND deleted_at IS NULL 
     AND type IN ('bank', 'cash', 'debit_card', 'upi', 'wallet', 'savings', 'investment', 'fixed_deposit', 'custom')`,
    [currency]
  );
  
  // Investment values
  const investmentsResult = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(quantity * COALESCE(current_price, buy_price)), 0) as total 
     FROM investments 
     WHERE currency = ? AND deleted_at IS NULL`,
    [currency]
  );
  
  // Debts owed to me
  const debtsResult = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(current_amount), 0) as total 
     FROM debts 
     WHERE currency = ? AND direction = 'owed_to_me' AND is_settled = 0 AND deleted_at IS NULL`,
    [currency]
  );
  
  return (
    (accountsResult?.total ?? 0) + 
    (investmentsResult?.total ?? 0) + 
    (debtsResult?.total ?? 0)
  ) as MinorUnits;
}

export async function getTotalLiabilities(currency: string = 'INR'): Promise<MinorUnits> {
  const db = await (await import('../storage/database')).getDatabase();
  
  // Credit card balances (negative balances)
  const creditCardsResult = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(ABS(current_balance)), 0) as total 
     FROM accounts 
     WHERE currency = ? AND is_archived = 0 AND deleted_at IS NULL 
     AND type = 'credit_card' AND current_balance < 0`,
    [currency]
  );
  
  // Debts I owe
  const debtsResult = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(current_amount), 0) as total 
     FROM debts 
     WHERE currency = ? AND direction = 'i_owe' AND is_settled = 0 AND deleted_at IS NULL`,
    [currency]
  );
  
  return (
    (creditCardsResult?.total ?? 0) + 
    (debtsResult?.total ?? 0)
  ) as MinorUnits;
}

// Historical Net Worth
export async function getNetWorthHistory(
  startDate: ISODateString,
  endDate: ISODateString,
  interval: 'daily' | 'weekly' | 'monthly' = 'monthly'
): Promise<NetWorthPoint[]> {
  const db = await (await import('../storage/database')).getDatabase();
  
  // This is a simplified version - in production you'd want to compute
  // running balances based on transactions up to each date
  // For now, we'll compute at intervals
  
  const points: NetWorthPoint[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const current = new Date(start);
  while (current <= end) {
    const dateISO = current.toISOString() as ISODateString;
    
    // Get balances as of this date
    const assets = await getAssetsAsOf(dateISO);
    const liabilities = await getLiabilitiesAsOf(dateISO);
    
    points.push({
      date: dateISO,
      assets,
      liabilities,
      netWorth: (assets - liabilities) as MinorUnits,
    });
    
    // Increment based on interval
    if (interval === 'daily') {
      current.setDate(current.getDate() + 1);
    } else if (interval === 'weekly') {
      current.setDate(current.getDate() + 7);
    } else {
      current.setMonth(current.getMonth() + 1);
    }
  }
  
  return points;
}

async function getAssetsAsOf(date: ISODateString): Promise<MinorUnits> {
  const db = await (await import('../storage/database')).getDatabase();
  
  // Account balances as of date (opening + transactions up to date)
  const accountsResult = await db.getFirstAsync<{ total: number }>(`
    SELECT COALESCE(SUM(
      a.opening_balance + 
      COALESCE((
        SELECT SUM(CASE 
          WHEN t.type = 'income' THEN t.amount
          WHEN t.type = 'expense' THEN -t.amount
          WHEN t.type = 'transfer' AND t.account_id = a.id THEN -t.amount
          WHEN t.type = 'adjustment' AND t.account_id = a.id THEN t.amount
          ELSE 0 END)
        FROM transactions t 
        WHERE t.account_id = a.id AND t.date <= ? AND t.deleted_at IS NULL
      ), 0)
    ), 0) as total
    FROM accounts a
    WHERE a.is_archived = 0 AND a.deleted_at IS NULL
      AND a.type IN ('bank', 'cash', 'debit_card', 'upi', 'wallet', 'savings', 'investment', 'fixed_deposit', 'custom')
  `, [date]);
  
  // Investment values (simplified - using current price)
  const investmentsResult = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(quantity * COALESCE(current_price, buy_price)), 0) as total 
     FROM investments 
     WHERE deleted_at IS NULL AND buy_date <= ?`,
    [date]
  );
  
  // Debts owed to me
  const debtsResult = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(current_amount), 0) as total 
     FROM debts 
     WHERE direction = 'owed_to_me' AND is_settled = 0 AND deleted_at IS NULL AND date <= ?`,
    [date]
  );
  
  return (
    (accountsResult?.total ?? 0) + 
    (investmentsResult?.total ?? 0) + 
    (debtsResult?.total ?? 0)
  ) as MinorUnits;
}

async function getLiabilitiesAsOf(date: ISODateString): Promise<MinorUnits> {
  const db = await (await import('../storage/database')).getDatabase();
  
  // Credit card balances as of date
  const creditCardsResult = await db.getFirstAsync<{ total: number }>(`
    SELECT COALESCE(SUM(
      ABS(a.opening_balance + 
      COALESCE((
        SELECT SUM(CASE 
          WHEN t.type = 'income' THEN t.amount
          WHEN t.type = 'expense' THEN -t.amount
          WHEN t.type = 'transfer' AND t.account_id = a.id THEN -t.amount
          WHEN t.type = 'adjustment' AND t.account_id = a.id THEN t.amount
          ELSE 0 END)
        FROM transactions t 
        WHERE t.account_id = a.id AND t.date <= ? AND t.deleted_at IS NULL
      ), 0))
    ), 0) as total
    FROM accounts a
    WHERE a.is_archived = 0 AND a.deleted_at IS NULL
      AND a.type = 'credit_card'
  `, [date]);
  
  // Debts I owe
  const debtsResult = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(current_amount), 0) as total 
     FROM debts 
     WHERE direction = 'i_owe' AND is_settled = 0 AND deleted_at IS NULL AND date <= ?`,
    [date]
  );
  
  return (creditCardsResult?.total ?? 0) + (debtsResult?.total ?? 0) as MinorUnits;
}

// Budget Summaries
export async function getBudgetSummaries(period: AnalyticsPeriod): Promise<BudgetSummary[]> {
  const { start, end } = getPeriodRange(period);
  const startISO = start.toISOString() as ISODateString;
  const endISO = end.toISOString() as ISODateString;
  
  const budgets = await getActiveBudgets();
  const summaries: BudgetSummary[] = [];
  
  for (const budget of budgets) {
    const spent = await getBudgetSpent(budget, startISO, endISO);
    const remaining = budget.amount - spent;
    const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
    
    let status: 'healthy' | 'near_limit' | 'exceeded' = 'healthy';
    if (percentage >= 100) status = 'exceeded';
    else if (percentage >= budget.alertThreshold) status = 'near_limit';
    
    summaries.push({
      budget,
      spent,
      remaining,
      percentage,
      status,
      periodStart: start,
      periodEnd: end,
    });
  }
  
  return summaries;
}

async function getBudgetSpent(budget: any, startDate: ISODateString, endDate: ISODateString): Promise<MinorUnits> {
  const db = await (await import('../storage/database')).getDatabase();
  
  let sql = `
    SELECT COALESCE(SUM(amount), 0) as spent
    FROM transactions
    WHERE type = 'expense'
      AND date >= ?
      AND date <= ?
      AND deleted_at IS NULL
  `;
  const params: any[] = [startDate, endDate];
  
  if (budget.categoryId) {
    sql += ` AND category_id = ?`;
    params.push(budget.categoryId);
  }
  
  if (budget.accountId) {
    sql += ` AND account_id = ?`;
    params.push(budget.accountId);
  }
  
  const result = await db.getFirstAsync<{ spent: number }>(sql, params);
  return (result?.spent ?? 0) as MinorUnits;
}

// Category Spending
export async function getCategorySpending(
  period: AnalyticsPeriod,
  type: 'expense' | 'income' = 'expense'
): Promise<CategorySpending[]> {
  const { start, end } = getPeriodRange(period);
  const startISO = start.toISOString() as ISODateString;
  const endISO = end.toISOString() as ISODateString;
  
  const db = await (await import('../storage/database')).getDatabase();
  
  const rows = await db.getAllAsync(`
    SELECT 
      c.id as category_id,
      c.name as category_name,
      c.icon as category_icon,
      c.color as category_color,
      COALESCE(SUM(t.amount), 0) as amount,
      COUNT(t.id) as count
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.type = ? 
      AND t.date >= ? 
      AND t.date <= ? 
      AND t.deleted_at IS NULL
      AND c.deleted_at IS NULL
    GROUP BY c.id, c.name, c.icon, c.color
    ORDER BY amount DESC
  `, [type, startISO, endISO]);
  
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  
  return rows.map(row => ({
    categoryId: row.category_id,
    categoryName: row.category_name,
    categoryIcon: row.category_icon,
    categoryColor: row.category_color,
    amount: row.amount as MinorUnits,
    percentage: total > 0 ? (row.amount / total) * 100 : 0,
    transactionCount: row.count,
  }));
}

// Account Summaries
export async function getAccountSummaries(period: AnalyticsPeriod): Promise<AccountSummary[]> {
  const { start, end } = getPeriodRange(period);
  const startISO = start.toISOString() as ISODateString;
  const endISO = end.toISOString() as ISODateString;
  
  const db = await (await import('../storage/database')).getDatabase();
  
  const rows = await db.getAllAsync(`
    SELECT 
      a.id as account_id,
      a.name as account_name,
      a.type as account_type,
      a.icon as account_icon,
      a.color as account_color,
      a.current_balance as balance,
      a.currency,
      COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) as income,
      COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as expenses
    FROM accounts a
    LEFT JOIN transactions t ON t.account_id = a.id 
      AND t.date >= ? AND t.date <= ? AND t.deleted_at IS NULL
    WHERE a.is_archived = 0 AND a.deleted_at IS NULL
    GROUP BY a.id, a.name, a.type, a.icon, a.color, a.current_balance, a.currency
    ORDER BY a.sort_order
  `, [startISO, endISO]);
  
  return rows.map(row => ({
    accountId: row.account_id,
    accountName: row.account_name,
    accountType: row.account_type,
    accountIcon: row.account_icon,
    accountColor: row.account_color,
    balance: row.balance as MinorUnits,
    currency: row.currency,
    income: row.income as MinorUnits,
    expenses: row.expenses as MinorUnits,
    netFlow: (row.income - row.expenses) as MinorUnits,
  }));
}

// Cash Flow
export async function getCashFlow(
  period: AnalyticsPeriod,
  interval: 'daily' | 'weekly' | 'monthly' = 'daily'
): Promise<CashFlowPoint[]> {
  const { start, end } = getPeriodRange(period);
  const startISO = start.toISOString() as ISODateString;
  const endISO = end.toISOString() as ISODateString;
  
  const db = await (await import('../storage/database')).getDatabase();
  
  let groupBy: string;
  if (interval === 'daily') {
    groupBy = 'date(date)';
  } else if (interval === 'weekly') {
    groupBy = 'strftime(\'%Y-%W\', date)';
  } else {
    groupBy = 'strftime(\'%Y-%m\', date)';
  }
  
  const rows = await db.getAllAsync(`
    SELECT 
      ${groupBy} as period,
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expenses
    FROM transactions
    WHERE date >= ? AND date <= ? AND deleted_at IS NULL
    GROUP BY ${groupBy}
    ORDER BY period
  `, [startISO, endISO]);
  
  return rows.map(row => ({
    date: row.period,
    income: row.income as MinorUnits,
    expenses: row.expenses as MinorUnits,
    netFlow: (row.income - row.expenses) as MinorUnits,
  }));
}

// Transaction sum by type (re-export from transactions repo)
import { getTransactionSumByType } from '../storage/repositories/transactions';

// Insights Generation (Rule-based, offline)
export interface Insight {
  type: 'spending_increase' | 'budget_warning' | 'savings_rate_change' | 'largest_expense' | 'unusual_spending' | 'goal_progress' | 'bill_due' | 'income_drop';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  data?: any;
}

export async function generateInsights(period: AnalyticsPeriod): Promise<Insight[]> {
  const insights: Insight[] = [];
  const { start, end } = getPeriodRange(period);
  const startISO = start.toISOString() as ISODateString;
  const endISO = end.toISOString() as ISODateString;
  
  // Previous period for comparison
  const prevStart = new Date(start);
  const prevEnd = new Date(end);
  const diff = end.getTime() - start.getTime();
  prevStart.setTime(prevStart.getTime() - diff);
  prevEnd.setTime(prevEnd.getTime() - diff);
  const prevStartISO = prevStart.toISOString() as ISODateString;
  const prevEndISO = prevEnd.toISOString() as ISODateString;
  
  // 1. Spending increase compared to previous period
  const [currentExpenses, prevExpenses] = await Promise.all([
    getTransactionSumByType('expense', startISO, endISO),
    getTransactionSumByType('expense', prevStartISO, prevEndISO),
  ]);
  
  if (prevExpenses > 0) {
    const changePercent = ((currentExpenses - prevExpenses) / prevExpenses) * 100;
    if (changePercent > 10) {
      insights.push({
        type: 'spending_increase',
        title: 'Spending Increased',
        description: `Your expenses are ${Math.round(changePercent)}% higher than the previous period.`,
        severity: changePercent > 25 ? 'warning' : 'info',
        data: { currentExpenses, prevExpenses, changePercent },
      });
    }
  }
  
  // 2. Budget warnings
  const budgetSummaries = await getBudgetSummaries(period);
  for (const summary of budgetSummaries) {
    if (summary.status === 'exceeded') {
      insights.push({
        type: 'budget_warning',
        title: `Budget Exceeded: ${summary.budget.name}`,
        description: `You've spent ${formatMoney(summary.spent)} of your ${formatMoney(summary.budget.amount)} budget.`,
        severity: 'critical',
        data: { budgetId: summary.budget.id, percentage: summary.percentage },
      });
    } else if (summary.status === 'near_limit') {
      insights.push({
        type: 'budget_warning',
        title: `Budget Near Limit: ${summary.budget.name}`,
        description: `You've used ${Math.round(summary.percentage)}% of your ${formatMoney(summary.budget.amount)} budget.`,
        severity: 'warning',
        data: { budgetId: summary.budget.id, percentage: summary.percentage },
      });
    }
  }
  
  // 3. Savings rate change
  const [currentIncome, prevIncome] = await Promise.all([
    getTransactionSumByType('income', startISO, endISO),
    getTransactionSumByType('income', prevStartISO, prevEndISO),
  ]);
  
  const currentSavingsRate = currentIncome > 0 ? ((currentIncome - currentExpenses) / currentIncome) * 100 : 0;
  const prevSavingsRate = prevIncome > 0 ? ((prevIncome - prevExpenses) / prevIncome) * 100 : 0;
  
  if (prevSavingsRate > 0 && Math.abs(currentSavingsRate - prevSavingsRate) > 5) {
    insights.push({
      type: 'savings_rate_change',
      title: currentSavingsRate > prevSavingsRate ? 'Savings Rate Improved' : 'Savings Rate Declined',
      description: `Your savings rate changed from ${Math.round(prevSavingsRate)}% to ${Math.round(currentSavingsRate)}%.`,
      severity: currentSavingsRate > prevSavingsRate ? 'info' : 'warning',
      data: { currentRate: currentSavingsRate, prevRate: prevSavingsRate },
    });
  }
  
  // 4. Largest expense category
  const categorySpending = await getCategorySpending(period, 'expense');
  if (categorySpending.length > 0) {
    const top = categorySpending[0];
    insights.push({
      type: 'largest_expense',
      title: 'Top Spending Category',
      description: `Your largest expense this period is ${top.categoryName} at ${formatMoney(top.amount)} (${Math.round(top.percentage)}% of spending).`,
      severity: 'info',
      data: { categoryId: top.categoryId, amount: top.amount, percentage: top.percentage },
    });
  }
  
  // 5. Upcoming bills
  const upcomingBills = await getUpcomingBills(7);
  for (const bill of upcomingBills) {
    insights.push({
      type: 'bill_due',
      title: `Bill Due Soon: ${bill.name}`,
      description: `${bill.name} for ${formatMoney(bill.amount)} is due in ${Math.ceil((new Date(bill.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days.`,
      severity: 'warning',
      data: { billId: bill.id, dueDate: bill.dueDate },
    });
  }
  
  // 6. Overdue bills
  const overdueBills = await getOverdueBills();
  for (const bill of overdueBills) {
    insights.push({
      type: 'bill_due',
      title: `Overdue Bill: ${bill.name}`,
      description: `${bill.name} for ${formatMoney(bill.amount)} was due on ${new Date(bill.dueDate).toLocaleDateString()}.`,
      severity: 'critical',
      data: { billId: bill.id, dueDate: bill.dueDate },
    });
  }
  
  // 7. Goal progress
  const goals = await getActiveGoals();
  for (const goal of goals) {
    const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
    if (progress >= 100) {
      insights.push({
        type: 'goal_progress',
        title: `Goal Achieved: ${goal.name}`,
        description: `Congratulations! You've reached your savings goal of ${formatMoney(goal.targetAmount)}.`,
        severity: 'info',
        data: { goalId: goal.id, progress },
      });
    } else if (progress >= 75) {
      insights.push({
        type: 'goal_progress',
        title: `Goal Near Completion: ${goal.name}`,
        description: `You're ${Math.round(progress)}% towards your goal of ${formatMoney(goal.targetAmount)}.`,
        severity: 'info',
        data: { goalId: goal.id, progress },
      });
    }
  }
  
  return insights;
}

// Compare periods
export async function comparePeriods(
  currentPeriod: AnalyticsPeriod,
  previousPeriod: AnalyticsPeriod
): Promise<{
  income: { current: MinorUnits; previous: MinorUnits; change: number };
  expenses: { current: MinorUnits; previous: MinorUnits; change: number };
  savings: { current: MinorUnits; previous: MinorUnits; change: number };
  categories: Array<{ categoryId: EntityId; name: string; current: MinorUnits; previous: MinorUnits; change: number }>;
}> {
  const { start: currStart, end: currEnd } = getPeriodRange(currentPeriod);
  const { start: prevStart, end: prevEnd } = getPeriodRange(previousPeriod);
  
  const [currIncome, prevIncome, currExpenses, prevExpenses] = await Promise.all([
    getTransactionSumByType('income', currStart.toISOString() as ISODateString, currEnd.toISOString() as ISODateString),
    getTransactionSumByType('income', prevStart.toISOString() as ISODateString, prevEnd.toISOString() as ISODateString),
    getTransactionSumByType('expense', currStart.toISOString() as ISODateString, currEnd.toISOString() as ISODateString),
    getTransactionSumByType('expense', prevStart.toISOString() as ISODateString, prevEnd.toISOString() as ISODateString),
  ]);
  
  const db = await (await import('../storage/database')).getDatabase();
  
  // Category comparison
  const categoryRows = await db.getAllAsync(`
    SELECT 
      c.id as category_id,
      c.name,
      COALESCE(SUM(CASE WHEN t.date >= ? AND t.date <= ? THEN t.amount ELSE 0 END), 0) as current,
      COALESCE(SUM(CASE WHEN t.date >= ? AND t.date <= ? THEN t.amount ELSE 0 END), 0) as previous
    FROM categories c
    LEFT JOIN transactions t ON t.category_id = c.id AND t.type = 'expense' AND t.deleted_at IS NULL
    WHERE c.deleted_at IS NULL AND c.type IN ('expense', 'both')
    GROUP BY c.id, c.name
    HAVING current > 0 OR previous > 0
    ORDER BY current DESC
  `, [currStartISO, currEndISO, prevStartISO, prevEndISO]);
  
  return {
    income: { current: currIncome, previous: prevIncome, change: prevIncome > 0 ? ((currIncome - prevIncome) / prevIncome) * 100 : 0 },
    expenses: { current: currExpenses, previous: prevExpenses, change: prevExpenses > 0 ? ((currExpenses - prevExpenses) / prevExpenses) * 100 : 0 },
    savings: { 
      current: (currIncome - currExpenses) as MinorUnits, 
      previous: (prevIncome - prevExpenses) as MinorUnits, 
      change: 0 // Calculate if needed
    },
    categories: categoryRows.map(row => ({
      categoryId: row.category_id,
      name: row.name,
      current: row.current as MinorUnits,
      previous: row.previous as MinorUnits,
      change: row.previous > 0 ? ((row.current - row.previous) / row.previous) * 100 : 0,
    })),
  };
}