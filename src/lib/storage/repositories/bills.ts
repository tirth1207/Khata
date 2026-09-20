// Khata - Bills Repository
// Data access layer for bills

import { 
  Bill, 
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
  queryFirst,
} from '../database';

const TABLE = 'bills';
const MAPPER = (row: any): Bill => ({
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
});

export async function createBill(data: {
  name: string;
  amount: MinorUnits;
  currency: string;
  dueDate: ISODateString;
  frequency: RecurrenceFrequency;
  categoryId?: EntityId;
  accountId: EntityId;
  reminderDaysBefore?: number[];
  notes?: string;
}): Promise<Bill> {
  const now = nowISO();
  return createEntity<Bill>(TABLE, {
    ...data,
    reminderDaysBefore: data.reminderDaysBefore ?? [7, 3, 1],
    isPaid: false,
    createdAt: now,
    updatedAt: now,
  });
}

export async function getBill(id: EntityId): Promise<Bill | null> {
  return getEntity<Bill>(TABLE, id, MAPPER);
}

export async function getAllBills(includePaid = true): Promise<Bill[]> {
  const whereClause = includePaid ? 'deleted_at IS NULL' : 'is_paid = 0 AND deleted_at IS NULL';
  return getAllEntities<Bill>(TABLE, MAPPER, whereClause);
}

export async function getUpcomingBills(days = 30): Promise<Bill[]> {
  const db = await (await import('../database')).getDatabase();
  const now = new Date().toISOString() as ISODateString;
  const future = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString() as ISODateString;
  
  const rows = await db.getAllAsync(`
    SELECT * FROM bills 
    WHERE is_paid = 0 
      AND due_date >= ? 
      AND due_date <= ? 
      AND deleted_at IS NULL
    ORDER BY due_date ASC
  `, [now, future]);
  
  return rows.map(MAPPER);
}

export async function getOverdueBills(): Promise<Bill[]> {
  const db = await (await import('../database')).getDatabase();
  const now = new Date().toISOString() as ISODateString;
  
  const rows = await db.getAllAsync(`
    SELECT * FROM bills 
    WHERE is_paid = 0 
      AND due_date < ? 
      AND deleted_at IS NULL
    ORDER BY due_date ASC
  `, [now]);
  
  return rows.map(MAPPER);
}

export async function getBillsByAccount(accountId: EntityId): Promise<Bill[]> {
  return getAllEntities<Bill>(TABLE, MAPPER, 'account_id = ? AND deleted_at IS NULL', [accountId]);
}

export async function updateBill(
  id: EntityId,
  updates: Partial<Omit<Bill, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const processedUpdates = { ...updates };
  if (updates.reminderDaysBefore) {
    processedUpdates.reminderDaysBefore = JSON.stringify(updates.reminderDaysBefore) as any;
  }
  await updateEntity(TABLE, id, processedUpdates);
}

export async function deleteBill(id: EntityId, force = false): Promise<void> {
  if (force) {
    await hardDeleteEntity(TABLE, id);
  } else {
    await softDeleteEntity(TABLE, id);
  }
}

export async function markBillPaid(id: EntityId, paidAmount?: MinorUnits, paidDate?: ISODateString): Promise<void> {
  const now = paidDate ?? nowISO();
  await updateEntity(TABLE, id, { 
    isPaid: true, 
    paidDate: now, 
    paidAmount: paidAmount ?? 0,
    updatedAt: nowISO(),
  });
}

export async function markBillUnpaid(id: EntityId): Promise<void> {
  await updateEntity(TABLE, id, { 
    isPaid: false, 
    paidDate: null, 
    paidAmount: null,
    updatedAt: nowISO(),
  });
}

export async function getBillCount(): Promise<number> {
  const result = await queryFirst<{ count: number }>(
    'SELECT COUNT(*) as count FROM bills WHERE deleted_at IS NULL'
  );
  return result?.count ?? 0;
}

export async function getPendingBillCount(): Promise<number> {
  const result = await queryFirst<{ count: number }>(
    'SELECT COUNT(*) as count FROM bills WHERE is_paid = 0 AND deleted_at IS NULL'
  );
  return result?.count ?? 0;
}