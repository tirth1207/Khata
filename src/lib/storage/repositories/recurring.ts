// Khata - Recurring Transactions Repository
// Data access layer for recurring transactions

import { 
  RecurringTransaction, 
  EntityId, 
  MinorUnits, 
  ISODateString,
  RecurrenceFrequency,
  nowISO,
  generateId,
} from '@/types';
import { 
  createEntity, 
  updateEntity, 
  softDeleteEntity, 
  hardDeleteEntity,
  getEntity,
  getAllEntities,
  runTransaction,
  queryFirst,
} from '../database';

const TABLE = 'recurring_transactions';
const MAPPER = (row: any): RecurringTransaction => ({
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
});

export async function createRecurringTransaction(data: {
  name: string;
  type: 'expense' | 'income';
  amount: MinorUnits;
  currency: string;
  accountId: EntityId;
  toAccountId?: EntityId;
  categoryId?: EntityId;
  note?: string;
  frequency: RecurrenceFrequency;
  customFrequencyDays?: number;
  startDate: ISODateString;
  endDate?: ISODateString;
  dayOfMonth?: number;
  dayOfWeek?: number;
}): Promise<RecurringTransaction> {
  const now = nowISO();
  return createEntity<RecurringTransaction>(TABLE, {
    ...data,
    lastProcessedDate: undefined,
    nextDueDate: data.startDate,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });
}

export async function getRecurringTransaction(id: EntityId): Promise<RecurringTransaction | null> {
  return getEntity<RecurringTransaction>(TABLE, id, MAPPER);
}

export async function getAllRecurringTransactions(activeOnly = true): Promise<RecurringTransaction[]> {
  const whereClause = activeOnly ? 'is_active = 1 AND deleted_at IS NULL' : 'deleted_at IS NULL';
  return getAllEntities<RecurringTransaction>(TABLE, MAPPER, whereClause);
}

export async function getActiveRecurringTransactions(): Promise<RecurringTransaction[]> {
  return getAllEntities<RecurringTransaction>(TABLE, MAPPER, 'is_active = 1 AND deleted_at IS NULL');
}

export async function getDueRecurringTransactions(): Promise<RecurringTransaction[]> {
  const db = await (await import('../database')).getDatabase();
  const now = new Date().toISOString() as ISODateString;
  
  const rows = await db.getAllAsync(`
    SELECT * FROM recurring_transactions 
    WHERE is_active = 1 
      AND next_due_date <= ? 
      AND (end_date IS NULL OR end_date >= ?)
      AND deleted_at IS NULL
    ORDER BY next_due_date ASC
  `, [now, now]);
  
  return rows.map(MAPPER);
}

export async function getRecurringTransactionsByAccount(accountId: EntityId): Promise<RecurringTransaction[]> {
  return getAllEntities<RecurringTransaction>(TABLE, MAPPER, 'account_id = ? AND deleted_at IS NULL', [accountId]);
}

export async function updateRecurringTransaction(
  id: EntityId,
  updates: Partial<Omit<RecurringTransaction, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  await updateEntity(TABLE, id, updates);
}

export async function deleteRecurringTransaction(id: EntityId, force = false): Promise<void> {
  if (force) {
    await hardDeleteEntity(TABLE, id);
  } else {
    await softDeleteEntity(TABLE, id);
  }
}

export async function setRecurringTransactionActive(id: EntityId, active: boolean): Promise<void> {
  await updateEntity(TABLE, id, { isActive: active });
}

export async function markRecurringProcessed(id: EntityId, processedDate: ISODateString, nextDueDate: ISODateString): Promise<void> {
  await updateEntity(TABLE, id, { 
    lastProcessedDate: processedDate,
    nextDueDate,
    updatedAt: nowISO(),
  });
}

export async function getRecurringTransactionCount(): Promise<number> {
  const result = await queryFirst<{ count: number }>(
    'SELECT COUNT(*) as count FROM recurring_transactions WHERE deleted_at IS NULL'
  );
  return result?.count ?? 0;
}

// Calculate next due date based on frequency
export function calculateNextDueDate(
  currentDate: ISODateString,
  frequency: RecurrenceFrequency,
  customFrequencyDays?: number,
  dayOfMonth?: number,
  dayOfWeek?: number
): ISODateString {
  const date = new Date(currentDate);
  
  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + (customFrequencyDays || 1));
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7 * (customFrequencyDays || 1));
      break;
    case 'biweekly':
      date.setDate(date.getDate() + 14);
      break;
    case 'monthly':
      if (dayOfMonth !== undefined) {
        date.setMonth(date.getMonth() + 1);
        date.setDate(Math.min(dayOfMonth, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()));
      } else {
        date.setMonth(date.getMonth() + 1);
      }
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  
  return date.toISOString() as ISODateString;
}