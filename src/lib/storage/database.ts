import * as Crypto from 'expo-crypto';
// Khata - Database Service
// Wrapper around expo-sqlite with type-safe operations

import * as SQLite from 'expo-sqlite';
import { runMigrations, seedDefaultCategories, seedDefaultSettings } from './schema';
import type { 
  EntityId, 
  ISODateString, 
  MinorUnits,
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
  TransactionFilters,
  PaginatedResult,
} from '@/types';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }
  
  dbInstance = await SQLite.openDatabaseAsync('khata.db');
  
  // Enable foreign keys
  await dbInstance.execAsync('PRAGMA foreign_keys = ON;');
  
  // Run migrations
  await runMigrations(dbInstance);
  
  // Seed defaults
  await seedDefaultCategories(dbInstance);
  await seedDefaultSettings(dbInstance);
  
  return dbInstance;
}

export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.closeAsync();
    dbInstance = null;
  }
}

// Row mappers
function mapAccount(row: any): Account {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    customTypeLabel: row.custom_type_label,
    openingBalance: row.opening_balance,
    currentBalance: row.current_balance,
    currency: row.currency,
    icon: row.icon,
    color: row.color,
    notes: row.notes,
    isArchived: !!row.is_archived,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function mapTransaction(row: any): Transaction {
  return {
    id: row.id,
    type: row.type,
    amount: row.amount,
    currency: row.currency,
    accountId: row.account_id,
    toAccountId: row.to_account_id,
    categoryId: row.category_id,
    note: row.note,
    receiptPath: row.receipt_path,
    date: row.date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function mapCategory(row: any): Category {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parent_id,
    icon: row.icon,
    color: row.color,
    type: row.type,
    isDefault: !!row.is_default,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function mapBudget(row: any): Budget {
  return {
    id: row.id,
    name: row.name,
    amount: row.amount,
    currency: row.currency,
    period: row.period,
    customPeriodStart: row.custom_period_start,
    customPeriodEnd: row.custom_period_end,
    categoryId: row.category_id,
    accountId: row.account_id,
    alertThreshold: row.alert_threshold,
    isActive: !!row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function mapSavingsGoal(row: any): SavingsGoal {
  return {
    id: row.id,
    name: row.name,
    targetAmount: row.target_amount,
    currentAmount: row.current_amount,
    currency: row.currency,
    targetDate: row.target_date,
    icon: row.icon,
    color: row.color,
    description: row.description,
    accountId: row.account_id,
    isCompleted: !!row.is_completed,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function mapGoalContribution(row: any): GoalContribution {
  return {
    id: row.id,
    goalId: row.goal_id,
    amount: row.amount,
    currency: row.currency,
    accountId: row.account_id,
    note: row.note,
    date: row.date,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
  };
}

function mapRecurringTransaction(row: any): RecurringTransaction {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    amount: row.amount,
    currency: row.currency,
    accountId: row.account_id,
    toAccountId: row.to_account_id,
    categoryId: row.category_id,
    note: row.note,
    frequency: row.frequency,
    customFrequencyDays: row.custom_frequency_days,
    startDate: row.start_date,
    endDate: row.end_date,
    lastProcessedDate: row.last_processed_date,
    nextDueDate: row.next_due_date,
    isActive: !!row.is_active,
    dayOfMonth: row.day_of_month,
    dayOfWeek: row.day_of_week,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function mapBill(row: any): Bill {
  return {
    id: row.id,
    name: row.name,
    amount: row.amount,
    currency: row.currency,
    dueDate: row.due_date,
    frequency: row.frequency,
    categoryId: row.category_id,
    accountId: row.account_id,
    reminderDaysBefore: JSON.parse(row.reminder_days_before || '[]'),
    notes: row.notes,
    isPaid: !!row.is_paid,
    paidDate: row.paid_date,
    paidAmount: row.paid_amount,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function mapDebt(row: any): Debt {
  return {
    id: row.id,
    personName: row.person_name,
    direction: row.direction,
    originalAmount: row.original_amount,
    currentAmount: row.current_amount,
    currency: row.currency,
    date: row.date,
    dueDate: row.due_date,
    note: row.note,
    isSettled: !!row.is_settled,
    settledDate: row.settled_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function mapDebtPayment(row: any): DebtPayment {
  return {
    id: row.id,
    debtId: row.debt_id,
    amount: row.amount,
    currency: row.currency,
    accountId: row.account_id,
    note: row.note,
    date: row.date,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
  };
}

function mapInvestment(row: any): Investment {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    symbol: row.symbol,
    quantity: row.quantity,
    buyPrice: row.buy_price,
    currentPrice: row.current_price,
    currency: row.currency,
    buyDate: row.buy_date,
    accountId: row.account_id,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function mapInvestmentTransaction(row: any): InvestmentTransaction {
  return {
    id: row.id,
    investmentId: row.investment_id,
    type: row.type,
    quantity: row.quantity,
    pricePerUnit: row.price_per_unit,
    totalAmount: row.total_amount,
    currency: row.currency,
    date: row.date,
    fees: row.fees,
    notes: row.notes,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
  };
}

function mapReceipt(row: any): Receipt {
  return {
    id: row.id,
    transactionId: row.transaction_id,
    filePath: row.file_path,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    width: row.width,
    height: row.height,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
  };
}

function mapAIConversation(row: any): AIConversation {
  return {
    id: row.id,
    title: row.title,
    messages: JSON.parse(row.messages || '[]'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function mapAIInsight(row: any): AIInsight {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    description: row.description,
    severity: row.severity,
    relatedEntityIds: JSON.parse(row.related_entity_ids || '[]'),
    isRead: !!row.is_read,
    isDismissed: !!row.is_dismissed,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
  };
}

function mapSettings(row: any): AppSettings {
  return {
    theme: row.theme,
    defaultCurrency: row.default_currency,
    enabledCurrencies: JSON.parse(row.enabled_currencies || '["INR"]'),
    pinHash: row.pin_hash,
    pinSalt: row.pin_salt,
    biometricEnabled: !!row.biometric_enabled,
    autoLockMinutes: row.auto_lock_minutes,
    aiEnabled: !!row.ai_enabled,
    geminiApiKey: row.gemini_api_key_encrypted,
    aiPrivacyMode: row.ai_privacy_mode,
    backupFrequency: row.backup_frequency,
    lastBackupDate: row.last_backup_date,
    billReminders: !!row.bill_reminders,
    budgetAlerts: !!row.budget_alerts,
    goalReminders: !!row.goal_reminders,
    recurringReminders: !!row.recurring_reminders,
    weeklySummary: !!row.weekly_summary,
    onboardingCompleted: !!row.onboarding_completed,
    onboardingStep: row.onboarding_step,
    appVersion: row.app_version,
    schemaVersion: row.schema_version,
  };
}

// Generic CRUD operations
export async function createEntity<T extends { id: EntityId; createdAt: ISODateString; updatedAt: ISODateString }>(
  table: string,
  entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'> & { id?: EntityId }
): Promise<T> {
  const db = await getDatabase();
  const id = entity.id || Crypto.randomUUID() as EntityId;
  const now = new Date().toISOString() as ISODateString;
  
  // Only persist business fields here. createdAt/updatedAt are managed by this repository.
  const entityKeys = Object.keys(entity).filter(k => k !== 'id' && k !== 'createdAt' && k !== 'updatedAt');
  const columns = ['id', 'created_at', 'updated_at', ...entityKeys.map(snakeCase)];
  const placeholders = columns.map(() => '?').join(', ');
  const values = [id, now, now, ...entityKeys.map(k => entity[k as keyof typeof entity])];
  
  await db.runAsync(
    `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
    values
  );
  
  return { ...entity, id, createdAt: now, updatedAt: now } as T;
}

export async function updateEntity<T extends { id: EntityId; updatedAt: ISODateString }>(
  table: string,
  id: EntityId,
  updates: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString() as ISODateString;
  
  const keys = Object.keys(updates);
  if (keys.length === 0) return;
  
  const setClause = keys.map(k => `${snakeCase(k)} = ?`).join(', ');
  const values = [...Object.values(updates), now, id];
  
  await db.runAsync(
    `UPDATE ${table} SET ${setClause}, updated_at = ? WHERE id = ?`,
    values
  );
}

export async function softDeleteEntity(table: string, id: EntityId): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString() as ISODateString;
  
  await db.runAsync(
    `UPDATE ${table} SET deleted_at = ?, updated_at = ? WHERE id = ?`,
    [now, now, id]
  );
}

export async function hardDeleteEntity(table: string, id: EntityId): Promise<void> {
  const db = await getDatabase();
  
  await db.runAsync(
    `DELETE FROM ${table} WHERE id = ?`,
    [id]
  );
}

export async function getEntity<T>(
  table: string,
  id: EntityId,
  mapper: (row: any) => T
): Promise<T | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync(`SELECT * FROM ${table} WHERE id = ? AND deleted_at IS NULL`, [id]);
  return row ? mapper(row) : null;
}

export async function getAllEntities<T>(
  table: string,
  mapper: (row: any) => T,
  whereClause: string = '',
  params: any[] = []
): Promise<T[]> {
  const db = await getDatabase();
  const conditions = ['deleted_at IS NULL'];
  if (whereClause) conditions.push(`(${whereClause})`);
  const where = `WHERE ${conditions.join(' AND ')}`;
  const rows = await db.getAllAsync(`SELECT * FROM ${table} ${where} ORDER BY created_at DESC`, params);
  return rows.map(mapper);
}

export async function getPaginatedEntities<T>(
  table: string,
  mapper: (row: any) => T,
  filters: TransactionFilters = {},
  defaultSortBy: string = 'date',
  defaultSortOrder: 'asc' | 'desc' = 'desc'
): Promise<PaginatedResult<T>> {
  const db = await getDatabase();
  
  const { 
    query,
    type,
    accountId,
    categoryId,
    dateFrom,
    dateTo,
    amountMin,
    amountMax,
    hasReceipt,
    sortBy = defaultSortBy,
    sortOrder = defaultSortOrder,
    page = 1,
    pageSize = 50,
  } = filters;
  
  const conditions = ['deleted_at IS NULL'];
  const params: any[] = [];
  
  if (query) {
    conditions.push('(note LIKE ? OR category_id IN (SELECT id FROM categories WHERE name LIKE ? AND deleted_at IS NULL))');
    params.push(`%${query}%`, `%${query}%`);
  }
  
  if (type) {
    const types = Array.isArray(type) ? type : [type];
    conditions.push(`type IN (${types.map(() => '?').join(', ')})`);
    params.push(...types);
  }
  
  if (accountId) {
    const ids = Array.isArray(accountId) ? accountId : [accountId];
    conditions.push(`account_id IN (${ids.map(() => '?').join(', ')})`);
    params.push(...ids);
  }
  
  if (categoryId) {
    const ids = Array.isArray(categoryId) ? categoryId : [categoryId];
    conditions.push(`category_id IN (${ids.map(() => '?').join(', ')})`);
    params.push(...ids);
  }
  
  if (dateFrom) {
    conditions.push('date >= ?');
    params.push(dateFrom);
  }
  
  if (dateTo) {
    conditions.push('date <= ?');
    params.push(dateTo);
  }
  
  if (amountMin !== undefined) {
    conditions.push('amount >= ?');
    params.push(amountMin);
  }
  
  if (amountMax !== undefined) {
    conditions.push('amount <= ?');
    params.push(amountMax);
  }
  
  if (hasReceipt !== undefined) {
    conditions.push(hasReceipt ? 'receipt_path IS NOT NULL' : 'receipt_path IS NULL');
  }
  
  const whereClause = conditions.join(' AND ');
  const sortColumn = snakeCase(sortBy);
  const order = sortOrder.toUpperCase();
  
  // Count total
  const countResult = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM ${table} WHERE ${whereClause}`,
    params
  );
  const total = countResult?.count ?? 0;
  const totalPages = Math.ceil(total / pageSize);
  
  // Get paginated results
  const offset = (page - 1) * pageSize;
  const rows = await db.getAllAsync(
    `SELECT * FROM ${table} WHERE ${whereClause} ORDER BY ${sortColumn} ${order} LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
  
  return {
    items: rows.map(mapper),
    total,
    page,
    pageSize,
    totalPages,
  };
}

// Snake case helper
function snakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// Settings operations
export async function getSettings(): Promise<AppSettings> {
  const db = await getDatabase();
  const row = await db.getFirstAsync('SELECT * FROM settings WHERE id = ?', ['default']);
  if (!row) throw new Error('Settings not found');
  return mapSettings(row);
}

export async function updateSettings(updates: Partial<AppSettings>): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString() as ISODateString;
  
  const keys = Object.keys(updates);
  if (keys.length === 0) return;
  
  const setClause = keys.map(k => `${snakeCase(k)} = ?`).join(', ');
  const values = keys.map(k => {
    const value = updates[k as keyof AppSettings];
    if (Array.isArray(value)) return JSON.stringify(value);
    return value;
  });
  values.push(now);
  
  await db.runAsync(
    `UPDATE settings SET ${setClause}, updated_at = ? WHERE id = ?`,
    [...values, 'default']
  );
}

// Backup metadata
export async function saveBackupMetadata(metadata: BackupMetadata): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO backup_metadata (id, version, exported_at, app_version, entity_counts, checksum, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      Crypto.randomUUID(),
      metadata.version,
      metadata.exportedAt,
      metadata.appVersion,
      JSON.stringify(metadata.entityCounts),
      metadata.checksum,
      new Date().toISOString(),
    ]
  );
}

export async function getLatestBackupMetadata(): Promise<BackupMetadata | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync(
    'SELECT * FROM backup_metadata ORDER BY created_at DESC LIMIT 1'
  );
  if (!row) return null;
  
  return {
    version: row.version,
    exportedAt: row.exported_at,
    appVersion: row.app_version,
    entityCounts: JSON.parse(row.entity_counts),
    checksum: row.checksum,
  };
}

// Transaction for batch operations
export async function runTransaction<T>(callback: (tx: SQLite.SQLiteDatabase) => Promise<T>): Promise<T> {
  const db = await getDatabase();
  let result!: T;
  await db.withExclusiveTransactionAsync(async (tx) => {
    result = await callback(tx as unknown as SQLite.SQLiteDatabase);
  });
  return result;
}

// Raw query for analytics
export async function queryAll(sql: string, params: any[] = []): Promise<any[]> {
  const db = await getDatabase();
  return db.getAllAsync(sql, params);
}

export async function queryFirst(sql: string, params: any[] = []): Promise<any | null> {
  const db = await getDatabase();
  return db.getFirstAsync(sql, params);
}

export async function executeAsync(sql: string, params: any[] = []): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(sql, params);
}