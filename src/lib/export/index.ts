// Khata - Export Service
// CSV, Excel, and PDF export generation

import { 
  EntityId, 
  MinorUnits, 
  ISODateString,
  ExportFormat,
  ExportOptions,
  AnalyticsPeriod,
  Account,
  Transaction,
  Category,
  Budget,
  SavingsGoal,
  Bill,
  Debt,
  Investment,
  formatMoney,
  fromMinorUnits,
  getPeriodRange,
  SUPPORTED_CURRENCIES,
} from '@/types';
import { queryAll } from '../storage/database';
import { getActiveAccounts } from '../storage/repositories/accounts';
import { getAllCategories } from '../storage/repositories/categories';
import { getAllBudgets } from '../storage/repositories/budgets';
import { getAllGoals } from '../storage/repositories/goals';
import { getAllBills } from '../storage/repositories/bills';
import { getAllDebts } from '../storage/repositories/debts';
import { getAllInvestments } from '../storage/repositories/investments';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// CSV Export
export async function exportToCSV(options: ExportOptions): Promise<string> {
  const { period } = options;
  const { start, end } = getPeriodRange(period);
  const startISO = start.toISOString() as ISODateString;
  const endISO = end.toISOString() as ISODateString;
  
  const lines: string[] = [];
  
  // Transactions
  if (options.includeTransactions) {
    lines.push('=== TRANSACTIONS ===');
    lines.push('Date,Type,Amount,Currency,Account,Category,Note,Receipt');
    
    const transactions = await queryAll(`
      SELECT 
        t.date,
        t.type,
        t.amount,
        t.currency,
        a.name as account_name,
        c.name as category_name,
        t.note,
        t.receipt_path
      FROM transactions t
      LEFT JOIN accounts a ON t.account_id = a.id
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.date >= ? AND t.date <= ? AND t.deleted_at IS NULL
      ORDER BY t.date DESC, t.created_at DESC
    `, [startISO, endISO]);
    
    for (const t of transactions) {
      const amount = fromMinorUnits(t.amount, t.currency);
      const sign = t.type === 'expense' ? '-' : t.type === 'income' ? '+' : '';
      lines.push([
        new Date(t.date).toLocaleDateString(),
        t.type,
        `${sign}${amount}`,
        t.currency,
        `"${t.account_name || ''}"`,
        `"${t.category_name || ''}"`,
        `"${t.note || ''}"`,
        t.receipt_path ? 'Yes' : 'No',
      ].join(','));
    }
    lines.push('');
  }
  
  // Accounts
  if (options.includeAccounts) {
    lines.push('=== ACCOUNTS ===');
    lines.push('Name,Type,Currency,Opening Balance,Current Balance,Icon,Color,Notes');
    
    const accounts = await getActiveAccounts();
    for (const a of accounts) {
      lines.push([
        `"${a.name}"`,
        a.type,
        a.currency,
        fromMinorUnits(a.openingBalance, a.currency),
        fromMinorUnits(a.currentBalance, a.currency),
        a.icon,
        a.color,
        `"${a.notes || ''}"`,
      ].join(','));
    }
    lines.push('');
  }
  
  // Categories
  if (options.includeCategories) {
    lines.push('=== CATEGORIES ===');
    lines.push('Name,Parent,Icon,Color,Type,Is Default');
    
    const categories = await getAllCategories();
    const categoryMap = new Map(categories.map(c => [c.id, c.name]));
    
    for (const c of categories) {
      lines.push([
        `"${c.name}"`,
        `"${c.parentId ? categoryMap.get(c.parentId) || '' : ''}"`,
        c.icon,
        c.color,
        c.type,
        c.isDefault ? 'Yes' : 'No',
      ].join(','));
    }
    lines.push('');
  }
  
  // Budgets
  if (options.includeBudgets) {
    lines.push('=== BUDGETS ===');
    lines.push('Name,Amount,Currency,Period,Category,Account,Alert Threshold,Active');
    
    const budgets = await getAllBudgets(false);
    for (const b of budgets) {
      lines.push([
        `"${b.name}"`,
        fromMinorUnits(b.amount, b.currency),
        b.currency,
        b.period,
        `"${b.categoryId || 'Overall'}"`,
        `"${b.accountId || 'All'}"`,
        b.alertThreshold,
        b.isActive ? 'Yes' : 'No',
      ].join(','));
    }
    lines.push('');
  }
  
  // Goals
  if (options.includeGoals) {
    lines.push('=== SAVINGS GOALS ===');
    lines.push('Name,Target Amount,Current Amount,Currency,Target Date,Icon,Color,Description,Account,Completed');
    
    const goals = await getAllGoals();
    for (const g of goals) {
      lines.push([
        `"${g.name}"`,
        fromMinorUnits(g.targetAmount, g.currency),
        fromMinorUnits(g.currentAmount, g.currency),
        g.currency,
        g.targetDate ? new Date(g.targetDate).toLocaleDateString() : '',
        g.icon,
        g.color,
        `"${g.description || ''}"`,
        `"${g.accountId || ''}"`,
        g.isCompleted ? 'Yes' : 'No',
      ].join(','));
    }
    lines.push('');
  }
  
  // Bills
  if (options.includeBills) {
    lines.push('=== BILLS ===');
    lines.push('Name,Amount,Currency,Due Date,Frequency,Category,Account,Reminder Days,Notes,Paid,Paid Date,Paid Amount');
    
    const bills = await getAllBills();
    for (const b of bills) {
      lines.push([
        `"${b.name}"`,
        fromMinorUnits(b.amount, b.currency),
        b.currency,
        new Date(b.dueDate).toLocaleDateString(),
        b.frequency,
        `"${b.categoryId || ''}"`,
        `"${b.accountId || ''}"`,
        b.reminderDaysBefore.join(';'),
        `"${b.notes || ''}"`,
        b.isPaid ? 'Yes' : 'No',
        b.paidDate ? new Date(b.paidDate).toLocaleDateString() : '',
        b.paidAmount ? fromMinorUnits(b.paidAmount, b.currency) : '',
      ].join(','));
    }
    lines.push('');
  }
  
  // Debts
  if (options.includeDebts) {
    lines.push('=== DEBTS ===');
    lines.push('Person,Direction,Original Amount,Current Amount,Currency,Date,Due Date,Note,Settled,Settled Date');
    
    const debts = await getAllDebts();
    for (const d of debts) {
      lines.push([
        `"${d.personName}"`,
        d.direction === 'owed_to_me' ? 'Owed to Me' : 'I Owe',
        fromMinorUnits(d.originalAmount, d.currency),
        fromMinorUnits(d.currentAmount, d.currency),
        d.currency,
        new Date(d.date).toLocaleDateString(),
        d.dueDate ? new Date(d.dueDate).toLocaleDateString() : '',
        `"${d.note || ''}"`,
        d.isSettled ? 'Yes' : 'No',
        d.settledDate ? new Date(d.settledDate).toLocaleDateString() : '',
      ].join(','));
    }
    lines.push('');
  }
  
  // Investments
  if (options.includeInvestments) {
    lines.push('=== INVESTMENTS ===');
    lines.push('Name,Type,Symbol,Quantity,Buy Price,Current Price,Currency,Buy Date,Account,Notes');
    
    const investments = await getAllInvestments();
    for (const inv of investments) {
      lines.push([
        `"${inv.name}"`,
        inv.type,
        `"${inv.symbol || ''}"`,
        inv.quantity,
        fromMinorUnits(inv.buyPrice, inv.currency),
        inv.currentPrice ? fromMinorUnits(inv.currentPrice, inv.currency) : '',
        inv.currency,
        new Date(inv.buyDate).toLocaleDateString(),
        `"${inv.accountId || ''}"`,
        `"${inv.notes || ''}"`,
      ].join(','));
    }
    lines.push('');
  }
  
  return lines.join('\n');
}

// Generate CSV file and share
export async function generateAndShareCSV(
  options: ExportOptions,
  filename?: string
): Promise<void> {
  const csv = await exportToCSV(options);
  const timestamp = new Date().toISOString().split('T')[0];
  const defaultFilename = `khata-export-${timestamp}.csv`;
  const filePath = `${FileSystem.documentDirectory}${filename || defaultFilename}`;
  
  await FileSystem.writeAsStringAsync(filePath, csv, { encoding: FileSystem.EncodingType.UTF8 });
  
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(filePath, {
      mimeType: 'text/csv',
      dialogTitle: 'Export Khata Data',
    });
  }
}

// PDF Report Generation (using HTML -> PDF via web view or native)
// For now, generate HTML that can be printed to PDF
export async function generatePDFReport(options: ExportOptions): Promise<string> {
  const { period } = options;
  const { start, end } = getPeriodRange(period);
  const startISO = start.toISOString() as ISODateString;
  const endISO = end.toISOString() as ISODateString;
  
  const [
    dashboard,
    categorySpending,
    budgetSummaries,
    accountSummaries,
    goals,
    upcomingBills,
    overdueBills,
    debts,
    portfolio,
    insights,
  ] = await Promise.all([
    (await import('../analytics')).getDashboardSummary(period),
    (await import('../analytics')).getCategorySpending(period, 'expense'),
    (await import('../analytics')).getBudgetSummaries(period),
    (await import('../analytics')).getAccountSummaries(period),
    getAllGoals(),
    (await import('../storage/repositories/bills')).getUpcomingBills(30),
    (await import('../storage/repositories/bills')).getOverdueBills(),
    (async () => ({ owedToMe: await (await import('../storage/repositories/debts')).getTotalOwedToMe(), iOwe: await (await import('../storage/repositories/debts')).getTotalIOwe() }))(),
    (await import('../storage/repositories/investments')).getPortfolioValue(),
    (await import('../analytics')).generateInsights(period),
  ]);
  
  const periodLabel = typeof period === 'string' ? period : `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  const currency = SUPPORTED_CURRENCIES[dashboard.currency];
  const symbol = currency.symbol;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Khata Financial Report - ${periodLabel}</title>
  <style>
    * { box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      line-height: 1.6; 
      color: #1d1d1f; 
      max-width: 800px; 
      margin: 0 auto; 
      padding: 40px 20px;
      font-size: 14px;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
    h1 { font-size: 32px; font-weight: 600; margin-bottom: 8px; color: #1d1d1f; }
    h2 { font-size: 20px; font-weight: 600; margin-top: 32px; margin-bottom: 16px; color: #1d1d1f; border-bottom: 1px solid #e5e5ea; padding-bottom: 8px; }
    h3 { font-size: 16px; font-weight: 600; margin-top: 24px; margin-bottom: 12px; color: #1d1d1f; }
    .subtitle { color: #86868b; margin-bottom: 32px; font-size: 16px; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px; }
    .card { background: #f5f5f7; border-radius: 12px; padding: 20px; }
    .card.full { grid-column: span 2; }
    .label { font-size: 12px; color: #86868b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .value { font-size: 24px; font-weight: 600; color: #1d1d1f; }
    .value.income { color: #34c759; }
    .value.expense { color: #ff3b30; }
    .value.savings { color: #007aff; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
    th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #e5e5ea; }
    th { font-weight: 600; color: #86868b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    tr:last-child td { border-bottom: none; }
    .amount { font-family: 'SF Mono', 'Monaco', monospace; font-weight: 500; }
    .amount.positive { color: #34c759; }
    .amount.negative { color: #ff3b30; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 100px; font-size: 11px; font-weight: 500; }
    .badge.healthy { background: #e8f5e9; color: #2e7d32; }
    .badge.near_limit { background: #fff3e0; color: #e65100; }
    .badge.exceeded { background: #fdecec; color: #c62828; }
    .badge.paid { background: #e8f5e9; color: #2e7d32; }
    .badge.unpaid { background: #fdecec; color: #c62828; }
    .progress-bar { height: 6px; background: #e5e5ea; border-radius: 3px; overflow: hidden; margin-top: 8px; }
    .progress-fill { height: 100%; border-radius: 3px; transition: width 0.3s; }
    .progress-fill.healthy { background: #34c759; }
    .progress-fill.near_limit { background: #ff9500; }
    .progress-fill.exceeded { background: #ff3b30; }
    .insight { padding: 12px 16px; background: #f5f5f7; border-radius: 8px; margin-bottom: 8px; border-left: 3px solid #007aff; }
    .insight.warning { border-left-color: #ff9500; }
    .insight.critical { border-left-color: #ff3b30; }
    .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #e5e5ea; color: #86868b; font-size: 12px; text-align: center; }
    .section { margin-bottom: 32px; }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 24px; padding: 16px; background: #e8f0fe; border-radius: 8px; text-align: center;">
    <strong>Khata Financial Report</strong> — Generated ${new Date().toLocaleString()}<br>
    Use your browser's Print function (Cmd/Ctrl+P) to save as PDF
  </div>
  
  <h1>Financial Report</h1>
  <p class="subtitle">${periodLabel} • Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
  
  <div class="section">
    <h2>Overview</h2>
    <div class="grid">
      <div class="card">
        <div class="label">Total Balance</div>
        <div class="value">${formatMoney(dashboard.totalBalance, dashboard.currency)}</div>
      </div>
      <div class="card">
        <div class="label">Net Worth</div>
        <div class="value">${formatMoney(dashboard.netWorth, dashboard.currency)}</div>
      </div>
      <div class="card">
        <div class="label">Income</div>
        <div class="value income">+${formatMoney(dashboard.totalIncome, dashboard.currency)}</div>
      </div>
      <div class="card">
        <div class="label">Expenses</div>
        <div class="value expense">−${formatMoney(dashboard.totalExpenses, dashboard.currency)}</div>
      </div>
      <div class="card">
        <div class="label">Savings</div>
        <div class="value savings">${formatMoney(dashboard.totalSavings, dashboard.currency)}</div>
      </div>
      <div class="card">
        <div class="label">Savings Rate</div>
        <div class="value">${dashboard.totalIncome > 0 ? ((dashboard.totalIncome - dashboard.totalExpenses) / dashboard.totalIncome * 100).toFixed(1) : 0}%</div>
      </div>
    </div>
  </div>
  
  <div class="section">
    <h2>Account Balances</h2>
    <table>
      <thead>
        <tr><th>Account</th><th>Type</th><th>Balance</th><th>Income</th><th>Expenses</th><th>Net Flow</th></tr>
      </thead>
      <tbody>
        ${accountSummaries.map(a => `
          <tr>
            <td><span style="display:inline-flex;align-items:center;gap:8px;"><span style="width:28px;height:28px;border-radius:6px;background:${a.accountColor};"></span>${a.accountName}</span></td>
            <td>${a.accountType.replace('_', ' ')}</td>
            <td class="amount">${formatMoney(a.balance, a.currency)}</td>
            <td class="amount positive">+${formatMoney(a.income, a.currency)}</td>
            <td class="amount negative">−${formatMoney(a.expenses, a.currency)}</td>
            <td class="amount ${a.netFlow >= 0 ? 'positive' : 'negative'}">${a.netFlow >= 0 ? '+' : ''}${formatMoney(a.netFlow, a.currency)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  
  <div class="section">
    <h2>Spending by Category</h2>
    <table>
      <thead>
        <tr><th>Category</th><th>Amount</th><th>% of Total</th><th>Transactions</th></tr>
      </thead>
      <tbody>
        ${categorySpending.map(c => `
          <tr>
            <td><span style="display:inline-flex;align-items:center;gap:8px;"><span style="width:10px;height:10px;border-radius:50%;background:${c.categoryColor};"></span>${c.categoryName}</span></td>
            <td class="amount negative">−${formatMoney(c.amount, dashboard.currency)}</td>
            <td>${c.percentage.toFixed(1)}%</td>
            <td>${c.transactionCount}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  
  ${budgetSummaries.length > 0 ? `
  <div class="section">
    <h2>Budget Performance</h2>
    <table>
      <thead>
        <tr><th>Budget</th><th>Spent</th><th>Budget</th><th>Remaining</th><th>Usage</th><th>Status</th></tr>
      </thead>
      <tbody>
        ${budgetSummaries.map(b => `
          <tr>
            <td>${b.budget.name}${b.budget.categoryId ? ' (Category)' : b.budget.accountId ? ' (Account)' : ' (Overall)'}</td>
            <td class="amount negative">−${formatMoney(b.spent, b.budget.currency)}</td>
            <td class="amount">${formatMoney(b.budget.amount, b.budget.currency)}</td>
            <td class="amount ${b.remaining >= 0 ? 'positive' : 'negative'}">${b.remaining >= 0 ? '+' : ''}${formatMoney(b.remaining, b.budget.currency)}</td>
            <td>
              <div class="progress-bar">
                <div class="progress-fill ${b.status}" style="width: ${Math.min(b.percentage, 100)}%"></div>
              </div>
              <small>${b.percentage.toFixed(1)}%</small>
            </td>
            <td><span class="badge ${b.status}">${b.status.replace('_', ' ')}</span></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}
  
  ${goals.length > 0 ? `
  <div class="section">
    <h2>Savings Goals</h2>
    <table>
      <thead>
        <tr><th>Goal</th><th>Target</th><th>Saved</th><th>Progress</th><th>Target Date</th><th>Status</th></tr>
      </thead>
      <tbody>
        ${goals.map(g => {
          const progress = g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0;
          return `
          <tr>
            <td><span style="display:inline-flex;align-items:center;gap:8px;"><span style="width:28px;height:28px;border-radius:6px;background:${g.color};"></span>${g.name}</span></td>
            <td class="amount">${formatMoney(g.targetAmount, g.currency)}</td>
            <td class="amount">${formatMoney(g.currentAmount, g.currency)}</td>
            <td>
              <div class="progress-bar">
                <div class="progress-fill ${progress >= 100 ? 'healthy' : progress >= 75 ? 'near_limit' : 'healthy'}" style="width: ${Math.min(progress, 100)}%"></div>
              </div>
              <small>${progress.toFixed(1)}%</small>
            </td>
            <td>${g.targetDate ? new Date(g.targetDate).toLocaleDateString() : 'No date'}</td>
            <td>${g.isCompleted ? '<span class="badge paid">Completed</span>' : '<span class="badge unpaid">In Progress</span>'}</td>
          </tr>
        `}).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}
  
  ${(upcomingBills.length > 0 || overdueBills.length > 0) ? `
  <div class="section">
    <h2>Bills</h2>
    ${upcomingBills.length > 0 ? `
    <h3>Upcoming (Next 30 Days)</h3>
    <table>
      <thead><tr><th>Bill</th><th>Amount</th><th>Due Date</th><th>Days Until</th><th>Status</th></tr></thead>
      <tbody>
        ${upcomingBills.map(b => {
          const days = Math.ceil((new Date(b.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          return `
          <tr>
            <td>${b.name}</td>
            <td class="amount negative">−${formatMoney(b.amount, b.currency)}</td>
            <td>${new Date(b.dueDate).toLocaleDateString()}</td>
            <td>${days} day${days !== 1 ? 's' : ''}</td>
            <td><span class="badge unpaid">Pending</span></td>
          </tr>
        `}).join('')}
      </tbody>
    </table>
    ` : ''}
    ${overdueBills.length > 0 ? `
    <h3>Overdue</h3>
    <table>
      <thead><tr><th>Bill</th><th>Amount</th><th>Due Date</th><th>Days Overdue</th><th>Status</th></tr></thead>
      <tbody>
        ${overdueBills.map(b => {
          const days = Math.ceil((Date.now() - new Date(b.dueDate).getTime()) / (1000 * 60 * 60 * 24));
          return `
          <tr>
            <td>${b.name}</td>
            <td class="amount negative">−${formatMoney(b.amount, b.currency)}</td>
            <td>${new Date(b.dueDate).toLocaleDateString()}</td>
            <td>${days} day${days !== 1 ? 's' : ''}</td>
            <td><span class="badge unpaid">Overdue</span></td>
          </tr>
        `}).join('')}
      </tbody>
    </table>
    ` : ''}
  </div>
  ` : ''}
  
  <div class="section">
    <h2>Debts & Lending</h2>
    <div class="grid">
      <div class="card">
        <div class="label">Money Owed to You</div>
        <div class="value income">+${formatMoney(debts.owedToMe, dashboard.currency)}</div>
      </div>
      <div class="card">
        <div class="label">Money You Owe</div>
        <div class="value expense">−${formatMoney(debts.iOwe, dashboard.currency)}</div>
      </div>
    </div>
  </div>
  
  <div class="section">
    <h2>Investments</h2>
    <div class="grid">
      <div class="card">
        <div class="label">Total Invested</div>
        <div class="value">${formatMoney(portfolio.totalInvested, dashboard.currency)}</div>
      </div>
      <div class="card">
        <div class="label">Current Value</div>
        <div class="value">${formatMoney(portfolio.currentValue, dashboard.currency)}</div>
      </div>
      <div class="card">
        <div class="label">Gain/Loss</div>
        <div class="value ${portfolio.gainLoss >= 0 ? 'income' : 'expense'}">${portfolio.gainLoss >= 0 ? '+' : ''}${formatMoney(portfolio.gainLoss, dashboard.currency)}</div>
      </div>
      <div class="card">
        <div class="label">Return</div>
        <div class="value ${portfolio.gainLossPercent >= 0 ? 'income' : 'expense'}">${portfolio.gainLossPercent >= 0 ? '+' : ''}${portfolio.gainLossPercent.toFixed(2)}%</div>
      </div>
    </div>
  </div>
  
  ${insights.length > 0 ? `
  <div class="section">
    <h2>Key Insights</h2>
    ${insights.map(i => `
      <div class="insight ${i.severity}">
        <strong>${i.title}</strong><br>
        ${i.description}
      </div>
    `).join('')}
  </div>
  ` : ''}
  
  <div class="footer">
    <p>Generated by Khata — Your Personal Finance Manager</p>
    <p>All data stored locally on your device. No cloud synchronization.</p>
  </div>
</body>
</html>
  `;
  
  return html;
}

// Generate and save PDF report (HTML file that can be printed)
export async function generateAndSavePDFReport(
  options: ExportOptions,
  filename?: string
): Promise<string> {
  const html = await generatePDFReport(options);
  const timestamp = new Date().toISOString().split('T')[0];
  const defaultFilename = `khata-report-${timestamp}.html`;
  const filePath = `${FileSystem.documentDirectory}${filename || defaultFilename}`;
  
  await FileSystem.writeAsStringAsync(filePath, html, { encoding: FileSystem.EncodingType.UTF8 });
  
  return filePath;
}

// Backup - Full encrypted backup
export interface BackupData {
  version: number;
  exportedAt: ISODateString;
  appVersion: string;
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  goals: SavingsGoal[];
  bills: Bill[];
  debts: Debt[];
  investments: Investment[];
  settings: any; // AppSettings without sensitive data
}

export async function createFullBackup(password: string): Promise<{ filePath: string; metadata: any }> {
  const { encryptData } = await import('../security');
  
  const [
    accounts,
    transactions,
    categories,
    budgets,
    goals,
    bills,
    debts,
    investments,
    settings,
  ] = await Promise.all([
    getActiveAccounts(),
    queryAll(`SELECT * FROM transactions WHERE deleted_at IS NULL ORDER BY date DESC`),
    getAllCategories(),
    getAllBudgets(false),
    getAllGoals(),
    getAllBills(),
    getAllDebts(),
    getAllInvestments(),
    (await import('../storage/database')).getSettings(),
  ]);
  
  // Remove sensitive data from settings
  const safeSettings = { ...settings };
  delete safeSettings.pinHash;
  delete safeSettings.pinSalt;
  delete safeSettings.geminiApiKey;
  
  const backup: BackupData = {
    version: 1,
    exportedAt: new Date().toISOString() as ISODateString,
    appVersion: '1.0.0',
    accounts,
    transactions: transactions as Transaction[],
    categories,
    budgets,
    goals,
    bills,
    debts,
    investments,
    settings: safeSettings,
  };
  
  const json = JSON.stringify(backup, null, 2);
  const { encrypted, salt, iv } = await encryptData(json, password);
  
  const backupPayload = {
    version: 1,
    encrypted: true,
    salt,
    iv,
    data: encrypted,
    exportedAt: backup.exportedAt,
    appVersion: backup.appVersion,
  };
  
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `khata-backup-${timestamp}.khata`;
  const filePath = `${FileSystem.documentDirectory}${filename}`;
  
  await FileSystem.writeAsStringAsync(filePath, JSON.stringify(backupPayload), { encoding: FileSystem.EncodingType.UTF8 });
  
  return { filePath, metadata: { version: 1, exportedAt: backup.exportedAt, appVersion: backup.appVersion } };
}

export async function restoreFromBackup(filePath: string, password: string): Promise<void> {
  const { decryptData } = await import('../security');
  const { getDatabase } = await import('../storage/database');
  
  const content = await FileSystem.readAsStringAsync(filePath, { encoding: FileSystem.EncodingType.UTF8 });
  const backupPayload = JSON.parse(content);
  
  if (!backupPayload.encrypted) {
    throw new Error('Unencrypted backups are not supported');
  }
  
  const json = await decryptData(backupPayload.data, backupPayload.salt, backupPayload.iv, password);
  const backup: BackupData = JSON.parse(json);
  
  const db = await getDatabase();
  
  // Clear existing data (in a transaction)
  await db.withExclusiveTransactionAsync(async (tx) => {
    // Delete all data
    const tables = [
      'transactions', 'accounts', 'categories', 'budgets', 'savings_goals', 'goal_contributions',
      'recurring_transactions', 'bills', 'debts', 'debt_payments', 'investments', 'investment_transactions',
      'receipts', 'ai_conversations', 'ai_insights', 'backup_metadata'
    ];
    
    for (const table of tables) {
      await tx.runAsync(`DELETE FROM ${table}`);
    }
    
    // Reset settings (keep PIN and API key)
    const currentSettings = await (await import('../storage/database')).getSettings();
    await tx.runAsync(
      `UPDATE settings SET theme = ?, default_currency = ?, enabled_currencies = ?, biometric_enabled = ?, auto_lock_minutes = ?, ai_enabled = ?, ai_privacy_mode = ?, bill_reminders = ?, budget_alerts = ?, goal_reminders = ?, recurring_reminders = ?, weekly_summary = ?, onboarding_completed = ?, onboarding_step = ?, app_version = ?, schema_version = ?, updated_at = ? WHERE id = ?`,
      [
        backup.settings.theme,
        backup.settings.defaultCurrency,
        JSON.stringify(backup.settings.enabledCurrencies),
        backup.settings.biometricEnabled ? 1 : 0,
        backup.settings.autoLockMinutes,
        backup.settings.aiEnabled ? 1 : 0,
        backup.settings.aiPrivacyMode,
        backup.settings.billReminders ? 1 : 0,
        backup.settings.budgetAlerts ? 1 : 0,
        backup.settings.goalReminders ? 1 : 0,
        backup.settings.recurringReminders ? 1 : 0,
        backup.settings.weeklySummary ? 1 : 0,
        backup.settings.onboardingCompleted ? 1 : 0,
        backup.settings.onboardingStep,
        backup.settings.appVersion,
        backup.settings.schemaVersion,
        new Date().toISOString(),
        'default',
      ]
    );
    
    // Insert accounts
    for (const a of backup.accounts) {
      await tx.runAsync(
        `INSERT INTO accounts (id, name, type, custom_type_label, opening_balance, current_balance, currency, icon, color, notes, is_archived, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [a.id, a.name, a.type, a.customTypeLabel, a.openingBalance, a.currentBalance, a.currency, a.icon, a.color, a.notes, a.isArchived ? 1 : 0, a.sortOrder, a.createdAt, a.updatedAt]
      );
    }
    
    // Insert categories
    for (const c of backup.categories) {
      await tx.runAsync(
        `INSERT INTO categories (id, name, parent_id, icon, color, type, is_default, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [c.id, c.name, c.parentId, c.icon, c.color, c.type, c.isDefault ? 1 : 0, c.sortOrder, c.createdAt, c.updatedAt]
      );
    }
    
    // Insert transactions
    for (const t of backup.transactions) {
      await tx.runAsync(
        `INSERT INTO transactions (id, type, amount, currency, account_id, to_account_id, category_id, note, receipt_path, date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [t.id, t.type, t.amount, t.currency, t.accountId, t.toAccountId, t.categoryId, t.note, t.receiptPath, t.date, t.createdAt, t.updatedAt]
      );
    }
    
    // Insert budgets
    for (const b of backup.budgets) {
      await tx.runAsync(
        `INSERT INTO budgets (id, name, amount, currency, period, custom_period_start, custom_period_end, category_id, account_id, alert_threshold, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [b.id, b.name, b.amount, b.currency, b.period, b.customPeriodStart, b.customPeriodEnd, b.categoryId, b.accountId, b.alertThreshold, b.isActive ? 1 : 0, b.createdAt, b.updatedAt]
      );
    }
    
    // Insert goals
    for (const g of backup.goals) {
      await tx.runAsync(
        `INSERT INTO savings_goals (id, name, target_amount, current_amount, currency, target_date, icon, color, description, account_id, is_completed, completed_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [g.id, g.name, g.targetAmount, g.currentAmount, g.currency, g.targetDate, g.icon, g.color, g.description, g.accountId, g.isCompleted ? 1 : 0, g.completedAt, g.createdAt, g.updatedAt]
      );
    }
    
    // Insert bills
    for (const b of backup.bills) {
      await tx.runAsync(
        `INSERT INTO bills (id, name, amount, currency, due_date, frequency, category_id, account_id, reminder_days_before, notes, is_paid, paid_date, paid_amount, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [b.id, b.name, b.amount, b.currency, b.dueDate, b.frequency, b.categoryId, b.accountId, JSON.stringify(b.reminderDaysBefore), b.notes, b.isPaid ? 1 : 0, b.paidDate, b.paidAmount, b.createdAt, b.updatedAt]
      );
    }
    
    // Insert debts
    for (const d of backup.debts) {
      await tx.runAsync(
        `INSERT INTO debts (id, person_name, direction, original_amount, current_amount, currency, date, due_date, note, is_settled, settled_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [d.id, d.personName, d.direction, d.originalAmount, d.currentAmount, d.currency, d.date, d.dueDate, d.note, d.isSettled ? 1 : 0, d.settledDate, d.createdAt, d.updatedAt]
      );
    }
    
    // Insert investments
    for (const inv of backup.investments) {
      await tx.runAsync(
        `INSERT INTO investments (id, name, type, symbol, quantity, buy_price, current_price, currency, buy_date, account_id, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [inv.id, inv.name, inv.type, inv.symbol, inv.quantity, inv.buyPrice, inv.currentPrice, inv.currency, inv.buyDate, inv.accountId, inv.notes, inv.createdAt, inv.updatedAt]
      );
    }
  });
}