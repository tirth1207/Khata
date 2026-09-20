// Khata - Debts Repository
// Data access layer for debts/lending

import { 
  Debt, 
  DebtPayment, 
  EntityId, 
  MinorUnits, 
  ISODateString,
  DebtDirection,
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

const DEBTS_TABLE = 'debts';
const PAYMENTS_TABLE = 'debt_payments';

const DEBT_MAPPER = (row: any): Debt => ({
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
});

const PAYMENT_MAPPER = (row: any): DebtPayment => ({
  id: row.id,
  debtId: row.debt_id,
  amount: row.amount,
  currency: row.currency,
  accountId: row.account_id,
  note: row.note,
  date: row.date,
  createdAt: row.created_at,
  deletedAt: row.deleted_at,
});

// Debts
export async function createDebt(data: {
  personName: string;
  direction: DebtDirection;
  originalAmount: MinorUnits;
  currency: string;
  date: ISODateString;
  dueDate?: ISODateString;
  note?: string;
}): Promise<Debt> {
  const now = nowISO();
  return createEntity<Debt>(DEBTS_TABLE, {
    ...data,
    currentAmount: data.originalAmount,
    isSettled: false,
    createdAt: now,
    updatedAt: now,
  });
}

export async function getDebt(id: EntityId): Promise<Debt | null> {
  return getEntity<Debt>(DEBTS_TABLE, id, DEBT_MAPPER);
}

export async function getAllDebts(includeSettled = true): Promise<Debt[]> {
  const whereClause = includeSettled ? 'deleted_at IS NULL' : 'is_settled = 0 AND deleted_at IS NULL';
  return getAllEntities<Debt>(DEBTS_TABLE, DEBT_MAPPER, whereClause);
}

export async function getActiveDebts(): Promise<Debt[]> {
  return getAllEntities<Debt>(DEBTS_TABLE, DEBT_MAPPER, 'is_settled = 0 AND deleted_at IS NULL');
}

export async function getDebtsByDirection(direction: DebtDirection): Promise<Debt[]> {
  return getAllEntities<Debt>(DEBTS_TABLE, DEBT_MAPPER, 'direction = ? AND is_settled = 0 AND deleted_at IS NULL', [direction]);
}

export async function getOwedToMe(): Promise<Debt[]> {
  return getDebtsByDirection('owed_to_me');
}

export async function getIOwe(): Promise<Debt[]> {
  return getDebtsByDirection('i_owe');
}

export async function updateDebt(
  id: EntityId,
  updates: Partial<Omit<Debt, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  await updateEntity(DEBTS_TABLE, id, updates);
}

export async function deleteDebt(id: EntityId, force = false): Promise<void> {
  if (force) {
    await hardDeleteEntity(DEBTS_TABLE, id);
  } else {
    await softDeleteEntity(DEBTS_TABLE, id);
  }
}

export async function getDebtCount(): Promise<number> {
  const result = await queryFirst<{ count: number }>(
    'SELECT COUNT(*) as count FROM debts WHERE deleted_at IS NULL'
  );
  return result?.count ?? 0;
}

export async function getActiveDebtCount(): Promise<number> {
  const result = await queryFirst<{ count: number }>(
    'SELECT COUNT(*) as count FROM debts WHERE is_settled = 0 AND deleted_at IS NULL'
  );
  return result?.count ?? 0;
}

export async function getTotalOwedToMe(): Promise<MinorUnits> {
  const result = await queryFirst<{ total: number }>(
    'SELECT COALESCE(SUM(current_amount), 0) as total FROM debts WHERE direction = \'owed_to_me\' AND is_settled = 0 AND deleted_at IS NULL'
  );
  return (result?.total ?? 0) as MinorUnits;
}

export async function getTotalIOwe(): Promise<MinorUnits> {
  const result = await queryFirst<{ total: number }>(
    'SELECT COALESCE(SUM(current_amount), 0) as total FROM debts WHERE direction = \'i_owe\' AND is_settled = 0 AND deleted_at IS NULL'
  );
  return (result?.total ?? 0) as MinorUnits;
}

// Payments
export async function addDebtPayment(data: {
  debtId: EntityId;
  amount: MinorUnits;
  currency: string;
  accountId: EntityId;
  note?: string;
  date: ISODateString;
}): Promise<DebtPayment> {
  return runTransaction(async (tx) => {
    const now = nowISO();
    const paymentId = generateId();
    
    // Add payment
    await tx.runAsync(
      `INSERT INTO debt_payments (id, debt_id, amount, currency, account_id, note, date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [paymentId, data.debtId, data.amount, data.currency, data.accountId, data.note, data.date, now]
    );
    
    // Update debt current amount
    await tx.runAsync(
      `UPDATE debts SET current_amount = current_amount - ?, updated_at = ? WHERE id = ?`,
      [data.amount, now, data.debtId]
    );
    
    // Check if debt is settled
    const debt = await tx.getFirstAsync<{ current_amount: number; is_settled: number }>(
      'SELECT current_amount, is_settled FROM debts WHERE id = ?',
      [data.debtId]
    );
    
    if (debt && debt.current_amount <= 0 && !debt.is_settled) {
      await tx.runAsync(
        `UPDATE debts SET is_settled = 1, settled_date = ?, current_amount = 0, updated_at = ? WHERE id = ?`,
        [now, now, data.debtId]
      );
    }
    
    return PAYMENT_MAPPER({
      id: paymentId,
      debt_id: data.debtId,
      amount: data.amount,
      currency: data.currency,
      account_id: data.accountId,
      note: data.note,
      date: data.date,
      created_at: now,
    });
  });
}

export async function getDebtPayments(debtId: EntityId): Promise<DebtPayment[]> {
  return getAllEntities<DebtPayment>(
    PAYMENTS_TABLE, 
    PAYMENT_MAPPER, 
    'debt_id = ? AND deleted_at IS NULL', 
    [debtId]
  );
}

export async function deleteDebtPayment(id: EntityId): Promise<void> {
  await runTransaction(async (tx) => {
    const payment = await tx.getFirstAsync<{ debt_id: EntityId; amount: number }>(
      'SELECT debt_id, amount FROM debt_payments WHERE id = ?',
      [id]
    );
    
    if (payment) {
      await tx.runAsync(
        `UPDATE debts SET current_amount = current_amount + ?, is_settled = 0, settled_date = NULL, updated_at = ? WHERE id = ?`,
        [payment.amount, nowISO(), payment.debt_id]
      );
      
      await tx.runAsync(
        `UPDATE debt_payments SET deleted_at = ? WHERE id = ?`,
        [nowISO(), id]
      );
    }
  });
}

// Get debt with payment history
export async function getDebtWithPayments(id: EntityId): Promise<{ debt: Debt; payments: DebtPayment[]; totalPaid: MinorUnits } | null> {
  const debt = await getDebt(id);
  if (!debt) return null;
  
  const payments = await getDebtPayments(id);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0 as MinorUnits);
  
  return { debt, payments, totalPaid };
}