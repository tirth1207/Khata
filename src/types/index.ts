import * as Crypto from 'expo-crypto';
// Khata - Core Type Definitions
// Financial types using integer minor units for precision

export type CurrencyCode =
  | "INR"
  | "USD"
  | "EUR"
  | "GBP"
  | "JPY"
  | "CAD"
  | "AUD"
  | "SGD";

export interface Currency {
  code: CurrencyCode;
  symbol: string;
  name: string;
  minorUnit: number; // 100 for INR/USD (cents/paise), 1000 for JPY
  decimals: number; // Display decimals
}

export const SUPPORTED_CURRENCIES: Record<CurrencyCode, Currency> = {
  INR: {
    code: "INR",
    symbol: "₹",
    name: "Indian Rupee",
    minorUnit: 100,
    decimals: 2,
  },
  USD: {
    code: "USD",
    symbol: "$",
    name: "US Dollar",
    minorUnit: 100,
    decimals: 2,
  },
  EUR: { code: "EUR", symbol: "€", name: "Euro", minorUnit: 100, decimals: 2 },
  GBP: {
    code: "GBP",
    symbol: "£",
    name: "British Pound",
    minorUnit: 100,
    decimals: 2,
  },
  JPY: {
    code: "JPY",
    symbol: "¥",
    name: "Japanese Yen",
    minorUnit: 1,
    decimals: 0,
  },
  CAD: {
    code: "CAD",
    symbol: "C$",
    name: "Canadian Dollar",
    minorUnit: 100,
    decimals: 2,
  },
  AUD: {
    code: "AUD",
    symbol: "A$",
    name: "Australian Dollar",
    minorUnit: 100,
    decimals: 2,
  },
  SGD: {
    code: "SGD",
    symbol: "S$",
    name: "Singapore Dollar",
    minorUnit: 100,
    decimals: 2,
  },
};

export const DEFAULT_CURRENCY: CurrencyCode = "INR";

// Money amount stored as integer minor units (e.g., paise for INR)
export type MinorUnits = number & { readonly __brand: unique symbol };

export function toMinorUnits(
  amount: number,
  currency: CurrencyCode = DEFAULT_CURRENCY,
): MinorUnits {
  const { minorUnit } = SUPPORTED_CURRENCIES[currency];
  return Math.round(amount * minorUnit) as MinorUnits;
}

export function fromMinorUnits(
  minorUnits: MinorUnits,
  currency: CurrencyCode = DEFAULT_CURRENCY,
): number {
  const { minorUnit } = SUPPORTED_CURRENCIES[currency];
  return minorUnits / minorUnit;
}

export function formatMoney(
  minorUnits: MinorUnits,
  currency: CurrencyCode = DEFAULT_CURRENCY,
): string {
  const { symbol, decimals } = SUPPORTED_CURRENCIES[currency];
  const amount = fromMinorUnits(minorUnits, currency);
  return `${symbol}${amount.toFixed(decimals)}`;
}

export function formatMoneySigned(
  minorUnits: MinorUnits,
  currency: CurrencyCode = DEFAULT_CURRENCY,
): string {
  const { symbol, decimals } = SUPPORTED_CURRENCIES[currency];
  const amount = fromMinorUnits(minorUnits, currency);
  const sign = amount >= 0 ? "+" : "−";
  return `${sign}${symbol}${Math.abs(amount).toFixed(decimals)}`;
}

// Entity IDs - using UUID v4
export type EntityId = string & { readonly __brand: unique symbol };

export function generateId(): EntityId {
  return Crypto.randomUUID() as EntityId;
}

export function isValidId(id: string): id is EntityId {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// Timestamps stored as ISO strings
export type ISODateString = string & { readonly __brand: unique symbol };

export function nowISO(): ISODateString {
  return new Date().toISOString() as ISODateString;
}

export function parseISO(dateString: string): Date {
  return new Date(dateString);
}

// Soft deletion
export interface SoftDeletable {
  deletedAt?: ISODateString;
}

export function isDeleted<T extends SoftDeletable>(entity: T): boolean {
  return !!entity.deletedAt;
}

// Account Types
export type AccountType =
  | "bank"
  | "cash"
  | "debit_card"
  | "credit_card"
  | "upi"
  | "wallet"
  | "savings"
  | "investment"
  | "fixed_deposit"
  | "custom";

export interface AccountTypeConfig {
  type: AccountType;
  label: string;
  icon: string;
  defaultColor: string;
  isAsset: boolean; // true for assets, false for liabilities (credit cards)
  supportsBalance: boolean;
}

export const ACCOUNT_TYPES: Record<AccountType, AccountTypeConfig> = {
  bank: {
    type: "bank",
    label: "Bank Account",
    icon: "building-2",
    defaultColor: "#007AFF",
    isAsset: true,
    supportsBalance: true,
  },
  cash: {
    type: "cash",
    label: "Cash",
    icon: "banknote",
    defaultColor: "#34C759",
    isAsset: true,
    supportsBalance: true,
  },
  debit_card: {
    type: "debit_card",
    label: "Debit Card",
    icon: "credit-card",
    defaultColor: "#007AFF",
    isAsset: true,
    supportsBalance: true,
  },
  credit_card: {
    type: "credit_card",
    label: "Credit Card",
    icon: "credit-card",
    defaultColor: "#FF3B30",
    isAsset: false,
    supportsBalance: true,
  },
  upi: {
    type: "upi",
    label: "UPI",
    icon: "smartphone",
    defaultColor: "#AF52DE",
    isAsset: true,
    supportsBalance: true,
  },
  wallet: {
    type: "wallet",
    label: "Digital Wallet",
    icon: "wallet",
    defaultColor: "#FF9500",
    isAsset: true,
    supportsBalance: true,
  },
  savings: {
    type: "savings",
    label: "Savings Account",
    icon: "piggy-bank",
    defaultColor: "#34C759",
    isAsset: true,
    supportsBalance: true,
  },
  investment: {
    type: "investment",
    label: "Investment Account",
    icon: "trending-up",
    defaultColor: "#AF52DE",
    isAsset: true,
    supportsBalance: true,
  },
  fixed_deposit: {
    type: "fixed_deposit",
    label: "Fixed Deposit",
    icon: "lock",
    defaultColor: "#007AFF",
    isAsset: true,
    supportsBalance: true,
  },
  custom: {
    type: "custom",
    label: "Custom",
    icon: "circle",
    defaultColor: "#8E8E93",
    isAsset: true,
    supportsBalance: true,
  },
};

// Account
export interface Account extends SoftDeletable {
  id: EntityId;
  name: string;
  type: AccountType;
  customTypeLabel?: string; // For custom type
  openingBalance: MinorUnits;
  currentBalance: MinorUnits;
  currency: CurrencyCode;
  icon: string;
  color: string;
  notes?: string;
  isArchived: boolean;
  sortOrder: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// Transaction Types
export type TransactionType = "expense" | "income" | "transfer" | "adjustment";

export interface Transaction extends SoftDeletable {
  id: EntityId;
  type: TransactionType;
  amount: MinorUnits; // Always positive, type determines direction
  currency: CurrencyCode;
  accountId: EntityId;
  // For transfers
  toAccountId?: EntityId;
  // For expense/income/adjustment
  categoryId?: EntityId;
  note?: string;
  receiptPath?: string; // Local file path
  // Timestamps
  date: ISODateString; // User-selected date (defaults to now)
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// Category
export interface Category extends SoftDeletable {
  id: EntityId;
  name: string;
  parentId?: EntityId; // For subcategories
  icon: string;
  color: string;
  type: "expense" | "income" | "both"; // Which transaction types this category applies to
  isDefault: boolean; // Built-in categories
  sortOrder: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// Budget
export type BudgetPeriod =
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly"
  | "custom";

export interface Budget extends SoftDeletable {
  id: EntityId;
  name: string;
  amount: MinorUnits;
  currency: CurrencyCode;
  period: BudgetPeriod;
  customPeriodStart?: ISODateString;
  customPeriodEnd?: ISODateString;
  categoryId?: EntityId; // null = overall budget
  accountId?: EntityId; // null = all accounts
  alertThreshold: number; // 0-100, percentage at which to alert
  isActive: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// Savings Goal
export interface SavingsGoal extends SoftDeletable {
  id: EntityId;
  name: string;
  targetAmount: MinorUnits;
  currentAmount: MinorUnits;
  currency: CurrencyCode;
  targetDate?: ISODateString;
  icon: string;
  color: string;
  description?: string;
  accountId?: EntityId; // Account to track contributions from
  isCompleted: boolean;
  completedAt?: ISODateString;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface GoalContribution extends SoftDeletable {
  id: EntityId;
  goalId: EntityId;
  amount: MinorUnits;
  currency: CurrencyCode;
  accountId: EntityId;
  note?: string;
  date: ISODateString;
  createdAt: ISODateString;
}

// Recurring Transaction
export type RecurrenceFrequency =
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "yearly";

export interface RecurringTransaction extends SoftDeletable {
  id: EntityId;
  name: string;
  type: "expense" | "income";
  amount: MinorUnits;
  currency: CurrencyCode;
  accountId: EntityId;
  toAccountId?: EntityId; // For transfers
  categoryId?: EntityId;
  note?: string;
  frequency: RecurrenceFrequency;
  customFrequencyDays?: number;
  startDate: ISODateString;
  endDate?: ISODateString;
  lastProcessedDate?: ISODateString;
  nextDueDate: ISODateString;
  isActive: boolean;
  dayOfMonth?: number; // For monthly/yearly (1-31, or -1 for last day)
  dayOfWeek?: number; // For weekly (0-6, Sunday=0)
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// Bill
export interface Bill extends SoftDeletable {
  id: EntityId;
  name: string;
  amount: MinorUnits;
  currency: CurrencyCode;
  dueDate: ISODateString;
  frequency: RecurrenceFrequency;
  categoryId?: EntityId;
  accountId: EntityId;
  reminderDaysBefore: number[]; // e.g., [7, 3, 1] for reminders
  notes?: string;
  isPaid: boolean;
  paidDate?: ISODateString;
  paidAmount?: MinorUnits;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// Debt / Lending
export type DebtDirection = "owed_to_me" | "i_owe";

export interface Debt extends SoftDeletable {
  id: EntityId;
  personName: string;
  direction: DebtDirection;
  originalAmount: MinorUnits;
  currentAmount: MinorUnits;
  currency: CurrencyCode;
  date: ISODateString;
  dueDate?: ISODateString;
  note?: string;
  isSettled: boolean;
  settledDate?: ISODateString;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface DebtPayment extends SoftDeletable {
  id: EntityId;
  debtId: EntityId;
  amount: MinorUnits;
  currency: CurrencyCode;
  accountId: EntityId;
  note?: string;
  date: ISODateString;
  createdAt: ISODateString;
}

// Investment
export type InvestmentType =
  | "stock"
  | "mutual_fund"
  | "etf"
  | "gold"
  | "crypto"
  | "fixed_deposit"
  | "ppf"
  | "nps"
  | "other";

export interface Investment extends SoftDeletable {
  id: EntityId;
  name: string;
  type: InvestmentType;
  symbol?: string; // Ticker symbol
  quantity: number; // Can be fractional
  buyPrice: MinorUnits; // Per unit in minor units
  currentPrice?: MinorUnits; // Per unit in minor units
  currency: CurrencyCode;
  buyDate: ISODateString;
  accountId: EntityId;
  notes?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface InvestmentTransaction extends SoftDeletable {
  id: EntityId;
  investmentId: EntityId;
  type: "buy" | "sell" | "dividend" | "interest" | "split" | "bonus";
  quantity: number;
  pricePerUnit: MinorUnits;
  totalAmount: MinorUnits;
  currency: CurrencyCode;
  date: ISODateString;
  fees?: MinorUnits;
  notes?: string;
  createdAt: ISODateString;
}

// Receipt
export interface Receipt extends SoftDeletable {
  id: EntityId;
  transactionId: EntityId;
  filePath: string; // Local file path
  mimeType: string;
  fileSize: number;
  width?: number;
  height?: number;
  createdAt: ISODateString;
}

// AI Conversation
export interface AIConversation extends SoftDeletable {
  id: EntityId;
  title: string;
  messages: AIMessage[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface AIMessage {
  id: EntityId;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: ISODateString;
  // For assistant messages
  dataSent?: any; // What financial data was sent to AI
  tokensUsed?: number;
}

// AI Insight
export interface AIInsight extends SoftDeletable {
  id: EntityId;
  type:
    | "spending_pattern"
    | "budget_warning"
    | "savings_opportunity"
    | "anomaly"
    | "trend"
    | "recommendation";
  title: string;
  description: string;
  severity: "info" | "warning" | "critical";
  relatedEntityIds: EntityId[]; // Related accounts, categories, etc.
  isRead: boolean;
  isDismissed: boolean;
  createdAt: ISODateString;
}

// App Settings
export interface AppSettings {
  // Appearance
  theme: "light" | "dark" | "system";
  // Currency
  defaultCurrency: CurrencyCode;
  enabledCurrencies: CurrencyCode[];
  // Security
  pinHash?: string; // bcrypt hash
  pinSalt?: string;
  biometricEnabled: boolean;
  autoLockMinutes: number; // 0 = never
  // AI
  aiEnabled: boolean;
  geminiApiKey?: string; // Encrypted
  aiPrivacyMode: "minimal" | "standard" | "full"; // How much data to send
  // Data
  backupFrequency?: "daily" | "weekly" | "monthly" | "manual";
  lastBackupDate?: ISODateString;
  // Notifications
  billReminders: boolean;
  budgetAlerts: boolean;
  goalReminders: boolean;
  recurringReminders: boolean;
  weeklySummary: boolean;
  // Onboarding
  onboardingCompleted: boolean;
  onboardingStep: number;
  // Version
  appVersion: string;
  schemaVersion: number;
}

// Backup Metadata
export interface BackupMetadata {
  version: number;
  exportedAt: ISODateString;
  appVersion: string;
  entityCounts: {
    accounts: number;
    transactions: number;
    categories: number;
    budgets: number;
    goals: number;
    bills: number;
    debts: number;
    investments: number;
    receipts: number;
  };
  checksum: string; // For integrity verification
}

// Period for analytics
export type AnalyticsPeriod =
  | "today"
  | "this_week"
  | "this_month"
  | "last_month"
  | "last_3_months"
  | "last_6_months"
  | "this_year"
  | "last_year"
  | "all_time"
  | { start: ISODateString; end: ISODateString };

export function getPeriodRange(
  period: AnalyticsPeriod,
  now: Date = new Date(),
): { start: Date; end: Date } {
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const endOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  switch (period) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "this_week": {
      const start = startOfDay(now);
      start.setDate(start.getDate() - start.getDay()); // Sunday
      return { start, end: endOfDay(now) };
    }
    case "this_month":
      return {
        start: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)),
        end: endOfDay(now),
      };
    case "last_month": {
      const start = startOfDay(
        new Date(now.getFullYear(), now.getMonth() - 1, 1),
      );
      const end = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
      return { start, end };
    }
    case "last_3_months": {
      const start = startOfDay(
        new Date(now.getFullYear(), now.getMonth() - 2, 1),
      );
      return { start, end: endOfDay(now) };
    }
    case "last_6_months": {
      const start = startOfDay(
        new Date(now.getFullYear(), now.getMonth() - 5, 1),
      );
      return { start, end: endOfDay(now) };
    }
    case "this_year":
      return {
        start: startOfDay(new Date(now.getFullYear(), 0, 1)),
        end: endOfDay(now),
      };
    case "last_year": {
      const start = startOfDay(new Date(now.getFullYear() - 1, 0, 1));
      const end = endOfDay(new Date(now.getFullYear() - 1, 11, 31));
      return { start, end };
    }
    case "all_time":
      return { start: new Date(0), end: endOfDay(now) };
    default:
      // Custom period
      return { start: parseISO(period.start), end: parseISO(period.end) };
  }
}

// Dashboard Summary
export interface DashboardSummary {
  totalBalance: MinorUnits;
  totalIncome: MinorUnits;
  totalExpenses: MinorUnits;
  totalSavings: MinorUnits;
  netWorth: MinorUnits;
  period: AnalyticsPeriod;
  currency: CurrencyCode;
}

// Budget Summary
export interface BudgetSummary {
  budget: Budget;
  spent: MinorUnits;
  remaining: MinorUnits;
  percentage: number;
  status: "healthy" | "near_limit" | "exceeded";
  periodStart: Date;
  periodEnd: Date;
}

// Category Spending
export interface CategorySpending {
  categoryId: EntityId;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  amount: MinorUnits;
  percentage: number;
  transactionCount: number;
}

// Account Summary
export interface AccountSummary {
  accountId: EntityId;
  accountName: string;
  accountType: AccountType;
  accountIcon: string;
  accountColor: string;
  balance: MinorUnits;
  currency: CurrencyCode;
  income: MinorUnits;
  expenses: MinorUnits;
  netFlow: MinorUnits;
}

// Net Worth Point
export interface NetWorthPoint {
  date: ISODateString;
  assets: MinorUnits;
  liabilities: MinorUnits;
  netWorth: MinorUnits;
}

// Cash Flow Point
export interface CashFlowPoint {
  date: ISODateString;
  income: MinorUnits;
  expenses: MinorUnits;
  netFlow: MinorUnits;
}

// Export types
export type ExportFormat = "csv" | "xlsx" | "pdf";

export interface ExportOptions {
  format: ExportFormat;
  period: AnalyticsPeriod;
  includeTransactions: boolean;
  includeAccounts: boolean;
  includeCategories: boolean;
  includeBudgets: boolean;
  includeGoals: boolean;
  includeBills: boolean;
  includeDebts: boolean;
  includeInvestments: boolean;
  includeReceipts: boolean; // For PDF only - embed as base64 or reference
}

// Search Filters
export interface TransactionFilters {
  query?: string;
  type?: TransactionType | TransactionType[];
  accountId?: EntityId | EntityId[];
  categoryId?: EntityId | EntityId[];
  dateFrom?: ISODateString;
  dateTo?: ISODateString;
  amountMin?: MinorUnits;
  amountMax?: MinorUnits;
  hasReceipt?: boolean;
  sortBy?: "date" | "amount" | "createdAt";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
