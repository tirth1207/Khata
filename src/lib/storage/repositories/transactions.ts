// Khata - Transaction Repository
// Data access layer for transactions

import { 
  Transaction, 
  EntityId, 
  MinorUnits, 
  ISODateString,
  TransactionType,
  TransactionFilters,
  PaginatedResult,
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
  getPaginatedEntities,
  runTransaction,
  queryFirst,
  queryAll,
} from '../database';

const TABLE = 'transactions';
const MAPPER = (row: any): Transaction => ({
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
});

export async function createTransaction(data: {
  type: TransactionType;
  amount: MinorUnits;
  currency: string;
  accountId: EntityId;
  toAccountId?: EntityId;
  categoryId?: EntityId;
  note?: string;
  receiptPath?: string;
  date: ISODateString;
}): Promise<Transaction> {
  return runTransaction(async (tx) => {
    const now = nowISO();
    const id = generateId();
    await tx.runAsync(
      `INSERT INTO transactions (id, type, amount, currency, account_id, to_account_id, category_id, note, receipt_path, date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.type, data.amount, data.currency, data.accountId, data.toAccountId, data.categoryId, data.note, data.receiptPath, data.date, now, now]
    );
    const delta = data.type === 'income' || data.type === 'adjustment' ? data.amount : data.type === 'expense' ? -data.amount : 0;
    if (delta !== 0) {
      await tx.runAsync('UPDATE accounts SET current_balance = current_balance + ?, updated_at = ? WHERE id = ?', [delta, now, data.accountId]);
    }
    const row = await tx.getFirstAsync('SELECT * FROM transactions WHERE id = ?', [id]);
    return MAPPER(row);
  });
}

export async function getTransaction(id: EntityId): Promise<Transaction | null> {
  return getEntity<Transaction>(TABLE, id, MAPPER);
}

export async function getTransactions(filters: TransactionFilters = {}): Promise<PaginatedResult<Transaction>> {
  return getPaginatedEntities<Transaction>(TABLE, MAPPER, filters, 'date', 'desc');
}

export async function getAllTransactions(): Promise<Transaction[]> {
  return getAllEntities<Transaction>(TABLE, MAPPER, 'deleted_at IS NULL', []);
}

export async function getTransactionsByAccount(accountId: EntityId, limit = 100): Promise<Transaction[]> {
  const db = await (await import('../database')).getDatabase();
  const rows = await db.getAllAsync(
    `SELECT * FROM transactions WHERE account_id = ? AND deleted_at IS NULL ORDER BY date DESC LIMIT ?`,
    [accountId, limit]
  );
  return rows.map(MAPPER);
}

export async function getTransactionsByCategory(categoryId: EntityId, limit = 100): Promise<Transaction[]> {
  const db = await (await import('../database')).getDatabase();
  const rows = await db.getAllAsync(
    `SELECT * FROM transactions WHERE category_id = ? AND deleted_at IS NULL ORDER BY date DESC LIMIT ?`,
    [categoryId, limit]
  );
  return rows.map(MAPPER);
}

export async function getTransactionsByDateRange(
  startDate: ISODateString,
  endDate: ISODateString,
  accountId?: EntityId
): Promise<Transaction[]> {
  const db = await (await import('../database')).getDatabase();
  
  let sql = `SELECT * FROM transactions WHERE date >= ? AND date <= ? AND deleted_at IS NULL`;
  const params: any[] = [startDate, endDate];
  
  if (accountId) {
    sql += ` AND account_id = ?`;
    params.push(accountId);
  }
  
  sql += ` ORDER BY date DESC`;
  
  const rows = await db.getAllAsync(sql, params);
  return rows.map(MAPPER);
}

export async function updateTransaction(
  id: EntityId,
  updates: Partial<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  await updateEntity(TABLE, id, updates);
}

export async function deleteTransaction(id: EntityId, force = false): Promise<void> {
  if (force) {
    await hardDeleteEntity(TABLE, id);
  } else {
    await softDeleteEntity(TABLE, id);
  }
}

export async function getTransactionCount(): Promise<number> {
  const result = await queryFirst<{ count: number }>(
    'SELECT COUNT(*) as count FROM transactions WHERE deleted_at IS NULL'
  );
  return result?.count ?? 0;
}

export async function getTransactionSumByType(
  type: TransactionType,
  startDate?: ISODateString,
  endDate?: ISODateString,
  accountId?: EntityId
): Promise<MinorUnits> {
  const db = await (await import('../database')).getDatabase();
  
  let sql = `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = ? AND deleted_at IS NULL`;
  const params: any[] = [type];
  
  if (startDate) {
    sql += ` AND date >= ?`;
    params.push(startDate);
  }
  
  if (endDate) {
    sql += ` AND date <= ?`;
    params.push(endDate);
  }
  
  if (accountId) {
    sql += ` AND account_id = ?`;
    params.push(accountId);
  }
  
  const result = await db.getFirstAsync<{ total: number }>(sql, params);
  return (result?.total ?? 0) as MinorUnits;
}

export async function getTransactionSumByCategory(
  categoryId: EntityId,
  startDate?: ISODateString,
  endDate?: ISODateString
): Promise<MinorUnits> {
  const db = await (await import('../database')).getDatabase();
  
  let sql = `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE category_id = ? AND deleted_at IS NULL`;
  const params: any[] = [categoryId];
  
  if (startDate) {
    sql += ` AND date >= ?`;
    params.push(startDate);
  }
  
  if (endDate) {
    sql += ` AND date <= ?`;
    params.push(endDate);
  }
  
  const result = await db.getFirstAsync<{ total: number }>(sql, params);
  return (result?.total ?? 0) as MinorUnits;
}

export async function getMonthlyTransactionSummary(
  year: number,
  month: number, // 0-11
  currency: string = 'INR'
): Promise<{ income: MinorUnits; expenses: MinorUnits; transfers: MinorUnits }> {
  const startDate = new Date(year, month, 1).toISOString() as ISODateString;
  const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999).toISOString() as ISODateString;
  
  const [income, expenses, transfers] = await Promise.all([
    getTransactionSumByType('income', startDate, endDate),
    getTransactionSumByType('expense', startDate, endDate),
    getTransactionSumByType('transfer', startDate, endDate),
  ]);
  
  return { income, expenses, transfers };
}

export async function getCategorySpending(
  startDate: ISODateString,
  endDate: ISODateString,
  type: 'expense' | 'income' = 'expense'
): Promise<Array<{ categoryId: EntityId; categoryName: string; categoryIcon: string; categoryColor: string; amount: MinorUnits; count: number }>> {
  const db = await (await import('../database')).getDatabase();
  
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
  `, [type, startDate, endDate]);
  
  return rows.map(row => ({
    categoryId: row.category_id,
    categoryName: row.category_name,
    categoryIcon: row.category_icon,
    categoryColor: row.category_color,
    amount: row.amount as MinorUnits,
    count: row.count,
  }));
}

export async function getAccountSpending(
  startDate: ISODateString,
  endDate: ISODateString,
  type: 'expense' | 'income' = 'expense'
): Promise<Array<{ accountId: EntityId; accountName: string; accountType: string; amount: MinorUnits; count: number }>> {
  const db = await (await import('../database')).getDatabase();
  
  const rows = await db.getAllAsync(`
    SELECT 
      a.id as account_id,
      a.name as account_name,
      a.type as account_type,
      COALESCE(SUM(t.amount), 0) as amount,
      COUNT(t.id) as count
    FROM transactions t
    JOIN accounts a ON t.account_id = a.id
    WHERE t.type = ? 
      AND t.date >= ? 
      AND t.date <= ? 
      AND t.deleted_at IS NULL
      AND a.deleted_at IS NULL
    GROUP BY a.id, a.name, a.type
    ORDER BY amount DESC
  `, [type, startDate, endDate]);
  
  return rows.map(row => ({
    accountId: row.account_id,
    accountName: row.account_name,
    accountType: row.account_type,
    amount: row.amount as MinorUnits,
    count: row.count,
  }));
}

export async function getDailySpending(
  startDate: ISODateString,
  endDate: ISODateString,
  type: 'expense' | 'income' = 'expense'
): Promise<Array<{ date: ISODateString; amount: MinorUnits; count: number }>> {
  const db = await (await import('../database')).getDatabase();
  
  const rows = await db.getAllAsync(`
    SELECT 
      date(date) as date,
      COALESCE(SUM(amount), 0) as amount,
      COUNT(*) as count
    FROM transactions
    WHERE type = ? 
      AND date >= ? 
      AND date <= ? 
      AND deleted_at IS NULL
    GROUP BY date(date)
    ORDER BY date(date)
  `, [type, startDate, endDate]);
  
  return rows.map(row => ({
    date: row.date,
    amount: row.amount as MinorUnits,
    count: row.count,
  }));
}

export async function getRecentTransactions(limit = 10): Promise<Transaction[]> {
  const db = await (await import('../database')).getDatabase();
  const rows = await db.getAllAsync(
    `SELECT * FROM transactions WHERE deleted_at IS NULL ORDER BY date DESC, created_at DESC LIMIT ?`,
    [limit]
  );
  return rows.map(MAPPER);
}

// Create transfer (creates two linked transactions)
export async function createTransfer(data: {
  amount: MinorUnits;
  currency: string;
  fromAccountId: EntityId;
  toAccountId: EntityId;
  note?: string;
  date: ISODateString;
}): Promise<{ outflow: Transaction; inflow: Transaction }> {
  return runTransaction(async (tx) => {
    const now = nowISO();
    await tx.runAsync(
      `INSERT INTO transactions (id, type, amount, currency, account_id, to_account_id, note, date, created_at, updated_at)
       VALUES (?, 'transfer', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [generateId(), data.amount, data.currency, data.fromAccountId, data.toAccountId, data.note, data.date, now, now]
    );
    await tx.runAsync(
      `INSERT INTO transactions (id, type, amount, currency, account_id, to_account_id, note, date, created_at, updated_at)
       VALUES (?, 'adjustment', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [generateId(), data.amount, data.currency, data.toAccountId, data.fromAccountId, data.note, data.date, now, now]
    );
    await tx.runAsync('UPDATE accounts SET current_balance = current_balance - ?, updated_at = ? WHERE id = ?', [data.amount, now, data.fromAccountId]);
    await tx.runAsync('UPDATE accounts SET current_balance = current_balance + ?, updated_at = ? WHERE id = ?', [data.amount, now, data.toAccountId]);

    // Get both transactions
    const outflow = await tx.getFirstAsync(`SELECT * FROM transactions WHERE account_id = ? AND to_account_id = ? AND date = ? AND type = 'transfer' ORDER BY created_at DESC LIMIT 1`, [data.fromAccountId, data.toAccountId, data.date]);
    const inflow = await tx.getFirstAsync(`SELECT * FROM transactions WHERE account_id = ? AND to_account_id = ? AND date = ? AND type = 'adjustment' ORDER BY created_at DESC LIMIT 1`, [data.toAccountId, data.fromAccountId, data.date]);
    
    return {
      outflow: MAPPER(outflow),
      inflow: MAPPER(inflow),
    };
  });
}