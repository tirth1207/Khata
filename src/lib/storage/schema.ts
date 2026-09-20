// Khata - Database Schema and Migrations
// SQLite schema for local-first financial data

import { 
  Account, 
  Transaction, 
  Category, 
  Budget, 
  SavingsGoal, 
  GoalContribution,
  RecurringTransaction,
  Bill,
  Debt,
  DebtPayment,
  Investment,
  InvestmentTransaction,
  Receipt,
  AIConversation,
  AIInsight,
  AppSettings,
  BackupMetadata,
  EntityId,
  ISODateString,
  nowISO,
  generateId,
} from '@/types';

// Database version for migrations
export const DB_VERSION = 1;
export const DB_NAME = 'khata.db';

// SQL Statements for schema creation
export const SCHEMA_SQL = `
-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Settings table (single row)
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  theme TEXT NOT NULL DEFAULT 'system',
  default_currency TEXT NOT NULL DEFAULT 'INR',
  enabled_currencies TEXT NOT NULL DEFAULT '["INR"]',
  pin_hash TEXT,
  pin_salt TEXT,
  biometric_enabled INTEGER NOT NULL DEFAULT 0,
  auto_lock_minutes INTEGER NOT NULL DEFAULT 0,
  ai_enabled INTEGER NOT NULL DEFAULT 0,
  gemini_api_key_encrypted TEXT,
  ai_privacy_mode TEXT NOT NULL DEFAULT 'standard',
  backup_frequency TEXT,
  last_backup_date TEXT,
  bill_reminders INTEGER NOT NULL DEFAULT 1,
  budget_alerts INTEGER NOT NULL DEFAULT 1,
  goal_reminders INTEGER NOT NULL DEFAULT 1,
  recurring_reminders INTEGER NOT NULL DEFAULT 1,
  weekly_summary INTEGER NOT NULL DEFAULT 0,
  onboarding_completed INTEGER NOT NULL DEFAULT 0,
  onboarding_step INTEGER NOT NULL DEFAULT 0,
  app_version TEXT NOT NULL DEFAULT '1.0.0',
  schema_version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);

-- Accounts
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  custom_type_label TEXT,
  opening_balance INTEGER NOT NULL DEFAULT 0,
  current_balance INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  notes TEXT,
  is_archived INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id TEXT,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'both')),
  is_default INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (parent_id) REFERENCES categories(id)
);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'transfer', 'adjustment')),
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  account_id TEXT NOT NULL,
  to_account_id TEXT,
  category_id TEXT,
  note TEXT,
  receipt_path TEXT,
  date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (account_id) REFERENCES accounts(id),
  FOREIGN KEY (to_account_id) REFERENCES accounts(id),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Budgets
CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  period TEXT NOT NULL CHECK (period IN ('weekly', 'monthly', 'quarterly', 'yearly', 'custom')),
  custom_period_start TEXT,
  custom_period_end TEXT,
  category_id TEXT,
  account_id TEXT,
  alert_threshold INTEGER NOT NULL DEFAULT 80,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- Savings Goals
CREATE TABLE IF NOT EXISTS savings_goals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  target_amount INTEGER NOT NULL,
  current_amount INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  target_date TEXT,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  description TEXT,
  account_id TEXT,
  is_completed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- Goal Contributions
CREATE TABLE IF NOT EXISTS goal_contributions (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  account_id TEXT NOT NULL,
  note TEXT,
  date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (goal_id) REFERENCES savings_goals(id),
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- Recurring Transactions
CREATE TABLE IF NOT EXISTS recurring_transactions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  account_id TEXT NOT NULL,
  to_account_id TEXT,
  category_id TEXT,
  note TEXT,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
  custom_frequency_days INTEGER,
  start_date TEXT NOT NULL,
  end_date TEXT,
  last_processed_date TEXT,
  next_due_date TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  day_of_month INTEGER,
  day_of_week INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (account_id) REFERENCES accounts(id),
  FOREIGN KEY (to_account_id) REFERENCES accounts(id),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Bills
CREATE TABLE IF NOT EXISTS bills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  due_date TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
  category_id TEXT,
  account_id TEXT NOT NULL,
  reminder_days_before TEXT NOT NULL DEFAULT '[]', -- JSON array
  notes TEXT,
  is_paid INTEGER NOT NULL DEFAULT 0,
  paid_date TEXT,
  paid_amount INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- Debts
CREATE TABLE IF NOT EXISTS debts (
  id TEXT PRIMARY KEY,
  person_name TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('owed_to_me', 'i_owe')),
  original_amount INTEGER NOT NULL,
  current_amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  date TEXT NOT NULL,
  due_date TEXT,
  note TEXT,
  is_settled INTEGER NOT NULL DEFAULT 0,
  settled_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

-- Debt Payments
CREATE TABLE IF NOT EXISTS debt_payments (
  id TEXT PRIMARY KEY,
  debt_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  account_id TEXT NOT NULL,
  note TEXT,
  date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (debt_id) REFERENCES debts(id),
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- Investments
CREATE TABLE IF NOT EXISTS investments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('stock', 'mutual_fund', 'etf', 'gold', 'crypto', 'fixed_deposit', 'ppf', 'nps', 'other')),
  symbol TEXT,
  quantity REAL NOT NULL,
  buy_price INTEGER NOT NULL,
  current_price INTEGER,
  currency TEXT NOT NULL DEFAULT 'INR',
  buy_date TEXT NOT NULL,
  account_id TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- Investment Transactions
CREATE TABLE IF NOT EXISTS investment_transactions (
  id TEXT PRIMARY KEY,
  investment_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell', 'dividend', 'interest', 'split', 'bonus')),
  quantity REAL NOT NULL,
  price_per_unit INTEGER NOT NULL,
  total_amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  date TEXT NOT NULL,
  fees INTEGER,
  notes TEXT,
  created_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (investment_id) REFERENCES investments(id)
);

-- Receipts
CREATE TABLE IF NOT EXISTS receipts (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  created_at TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id)
);

-- AI Conversations
CREATE TABLE IF NOT EXISTS ai_conversations (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  messages TEXT NOT NULL DEFAULT '[]', -- JSON array
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

-- AI Insights
CREATE TABLE IF NOT EXISTS ai_insights (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('spending_pattern', 'budget_warning', 'savings_opportunity', 'anomaly', 'trend', 'recommendation')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  related_entity_ids TEXT NOT NULL DEFAULT '[]', -- JSON array
  is_read INTEGER NOT NULL DEFAULT 0,
  is_dismissed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  deleted_at TEXT
);

-- Backup Metadata
CREATE TABLE IF NOT EXISTS backup_metadata (
  id TEXT PRIMARY KEY,
  version INTEGER NOT NULL,
  exported_at TEXT NOT NULL,
  app_version TEXT NOT NULL,
  entity_counts TEXT NOT NULL, -- JSON
  checksum TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_account_date ON transactions(account_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category_date ON transactions(category_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type_date ON transactions(type, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_accounts_archived ON accounts(is_archived);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_budgets_active ON budgets(is_active);
CREATE INDEX IF NOT EXISTS idx_goals_completed ON savings_goals(is_completed);
CREATE INDEX IF NOT EXISTS idx_recurring_active_next_due ON recurring_transactions(is_active, next_due_date);
CREATE INDEX IF NOT EXISTS idx_bills_due_date ON bills(due_date);
CREATE INDEX IF NOT EXISTS idx_debts_settled ON debts(is_settled);
CREATE INDEX IF NOT EXISTS idx_investments_account ON investments(account_id);
CREATE INDEX IF NOT EXISTS idx_receipts_transaction ON receipts(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_read ON ai_insights(is_read, is_dismissed);
`;

// Default Categories Seed Data
export const DEFAULT_CATEGORIES = [
  // Expense Categories
  { name: 'Food & Dining', icon: 'utensils', color: '#FF3B30', type: 'expense' as const, subcategories: [
    { name: 'Restaurant', icon: 'utensils', color: '#FF3B30' },
    { name: 'Fast Food', icon: 'hamburger', color: '#FF6B6B' },
    { name: 'Groceries', icon: 'shopping-cart', color: '#FF9F43' },
    { name: 'Coffee & Tea', icon: 'coffee', color: '#FFD93D' },
    { name: 'Food Delivery', icon: 'truck', color: '#6BCB77' },
  ]},
  { name: 'Transport', icon: 'car', color: '#FF9500', type: 'expense' as const, subcategories: [
    { name: 'Fuel', icon: 'fuel', color: '#FF9500' },
    { name: 'Public Transport', icon: 'bus', color: '#FFB340' },
    { name: 'Taxi/Rideshare', icon: 'taxi', color: '#FFD60A' },
    { name: 'Parking', icon: 'parking', color: '#FFD93D' },
    { name: 'Maintenance', icon: 'wrench', color: '#6BCB77' },
  ]},
  { name: 'Shopping', icon: 'shopping-bag', color: '#AF52DE', type: 'expense' as const, subcategories: [
    { name: 'Clothing', icon: 'shirt', color: '#AF52DE' },
    { name: 'Electronics', icon: 'smartphone', color: '#BF5AF2' },
    { name: 'Accessories', icon: 'watch', color: '#D4A5F7' },
    { name: 'Household', icon: 'home', color: '#E8CFFF' },
    { name: 'Personal Care', icon: 'sparkles', color: '#FF2D92' },
  ]},
  { name: 'Bills & Utilities', icon: 'file-text', color: '#007AFF', type: 'expense' as const, subcategories: [
    { name: 'Electricity', icon: 'zap', color: '#007AFF' },
    { name: 'Internet', icon: 'wifi', color: '#0A84FF' },
    { name: 'Mobile', icon: 'phone', color: '#5AC8FA' },
    { name: 'Rent', icon: 'home', color: '#A2845E' },
    { name: 'Subscriptions', icon: 'repeat', color: '#8E8E93' },
  ]},
  { name: 'Lifestyle', icon: 'heart', color: '#FF2D92', type: 'expense' as const, subcategories: [
    { name: 'Entertainment', icon: 'film', color: '#FF2D92' },
    { name: 'Gaming', icon: 'gamepad', color: '#FF6BCB' },
    { name: 'Travel', icon: 'plane', color: '#5AC8FA' },
    { name: 'Fitness', icon: 'dumbbell', color: '#34C759' },
    { name: 'Hobbies', icon: 'palette', color: '#AF52DE' },
  ]},
  { name: 'Education', icon: 'book', color: '#5AC8FA', type: 'expense' as const, subcategories: [
    { name: 'Books', icon: 'book', color: '#5AC8FA' },
    { name: 'Courses', icon: 'graduation-cap', color: '#007AFF' },
    { name: 'College', icon: 'university', color: '#0A84FF' },
    { name: 'Software', icon: 'code', color: '#5AC8FA' },
  ]},
  { name: 'Financial', icon: 'dollar-sign', color: '#34C759', type: 'expense' as const, subcategories: [
    { name: 'Investments', icon: 'trending-up', color: '#34C759' },
    { name: 'Insurance', icon: 'shield', color: '#30D158' },
    { name: 'EMI/Loans', icon: 'credit-card', color: '#28CD41' },
    { name: 'Fees & Charges', icon: 'receipt', color: '#6BCB77' },
  ]},
  
  // Income Categories
  { name: 'Income', icon: 'plus-circle', color: '#34C759', type: 'income' as const, subcategories: [
    { name: 'Salary', icon: 'briefcase', color: '#34C759' },
    { name: 'Freelance', icon: 'laptop', color: '#30D158' },
    { name: 'Business', icon: 'building', color: '#28CD41' },
    { name: 'Interest', icon: 'percent', color: '#6BCB77' },
    { name: 'Gifts', icon: 'gift', color: '#9EE493' },
    { name: 'Other Income', icon: 'plus', color: '#8E8E93' },
  ]},
];

// Default Settings
export const DEFAULT_SETTINGS: Omit<AppSettings, 'id' | 'updated_at'> = {
  theme: 'system',
  defaultCurrency: 'INR',
  enabledCurrencies: ['INR'],
  pinHash: undefined,
  pinSalt: undefined,
  biometricEnabled: false,
  autoLockMinutes: 0,
  aiEnabled: false,
  geminiApiKey: undefined,
  aiPrivacyMode: 'standard',
  backupFrequency: undefined,
  lastBackupDate: undefined,
  billReminders: true,
  budgetAlerts: true,
  goalReminders: true,
  recurringReminders: true,
  weeklySummary: false,
  onboardingCompleted: false,
  onboardingStep: 0,
  appVersion: '1.0.0',
  schemaVersion: DB_VERSION,
};

// Migration functions
export const MIGRATIONS: Array<{ version: number; up: string }> = [
  {
    version: 1,
    up: SCHEMA_SQL,
  },
  // Future migrations will be added here
];

// Helper to run migrations
export async function runMigrations(db: any): Promise<void> {
  // Get current schema version
  const result = await db.getFirstAsync<{ schema_version: number }>(
    'SELECT schema_version FROM settings WHERE id = ?', ['default']
  );
  
  const currentVersion = result?.schema_version ?? 0;
  
  for (const migration of MIGRATIONS) {
    if (migration.version > currentVersion) {
      console.log(`Running migration to version ${migration.version}`);
      await db.execAsync(migration.up);
      
      // Update schema version
      await db.runAsync(
        'UPDATE settings SET schema_version = ?, updated_at = ? WHERE id = ?',
        [migration.version, nowISO(), 'default']
      );
    }
  }
}

// Seed default categories
export async function seedDefaultCategories(db: any): Promise<void> {
  const count = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM categories WHERE is_default = 1'
  );
  
  if (count && count.count > 0) {
    return; // Already seeded
  }
  
  console.log('Seeding default categories...');
  
  const now = nowISO();
  let sortOrder = 0;
  
  for (const category of DEFAULT_CATEGORIES) {
    const parentId = generateId();
    
    // Insert parent category
    await db.runAsync(
      `INSERT INTO categories (id, name, icon, color, type, is_default, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      [parentId, category.name, category.icon, category.color, category.type, sortOrder++, now, now]
    );
    
    // Insert subcategories
    let subSortOrder = 0;
    for (const sub of category.subcategories) {
      await db.runAsync(
        `INSERT INTO categories (id, name, parent_id, icon, color, type, is_default, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
        [generateId(), sub.name, parentId, sub.icon, sub.color, category.type, subSortOrder++, now, now]
      );
    }
  }
}

// Seed default settings
export async function seedDefaultSettings(db: any): Promise<void> {
  const exists = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM settings WHERE id = ?', ['default']
  );
  
  if (exists) {
    return;
  }
  
  const now = nowISO();
  await db.runAsync(
    `INSERT INTO settings (id, theme, default_currency, enabled_currencies, biometric_enabled, auto_lock_minutes, 
      ai_enabled, ai_privacy_mode, bill_reminders, budget_alerts, goal_reminders, recurring_reminders, weekly_summary,
      onboarding_completed, onboarding_step, app_version, schema_version, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'default',
      DEFAULT_SETTINGS.theme,
      DEFAULT_SETTINGS.defaultCurrency,
      JSON.stringify(DEFAULT_SETTINGS.enabledCurrencies),
      DEFAULT_SETTINGS.biometricEnabled ? 1 : 0,
      DEFAULT_SETTINGS.autoLockMinutes,
      DEFAULT_SETTINGS.aiEnabled ? 1 : 0,
      DEFAULT_SETTINGS.aiPrivacyMode,
      DEFAULT_SETTINGS.billReminders ? 1 : 0,
      DEFAULT_SETTINGS.budgetAlerts ? 1 : 0,
      DEFAULT_SETTINGS.goalReminders ? 1 : 0,
      DEFAULT_SETTINGS.recurringReminders ? 1 : 0,
      DEFAULT_SETTINGS.weeklySummary ? 1 : 0,
      DEFAULT_SETTINGS.onboardingCompleted ? 1 : 0,
      DEFAULT_SETTINGS.onboardingStep,
      DEFAULT_SETTINGS.appVersion,
      DEFAULT_SETTINGS.schemaVersion,
      now,
    ]
  );
}