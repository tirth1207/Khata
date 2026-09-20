// Khata - Account Repository
// Data access layer for accounts

import { 
  Account, 
  EntityId, 
  MinorUnits, 
  ISODateString,
  AccountType,
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
} from './database';

const TABLE = 'accounts';
const MAPPER = (row: any): Account => ({
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
});

export async function createAccount(data: {
  name: string;
  type: AccountType;
  customTypeLabel?: string;
  openingBalance: MinorUnits;
  currency: string;
  icon: string;
  color: string;
  notes?: string;
}): Promise<Account> {
  const now = nowISO();
  return createEntity<Account>(TABLE, {
    ...data,
    currentBalance: data.openingBalance,
    isArchived: false,
    sortOrder: await getNextSortOrder(),
    createdAt: now,
    updatedAt: now,
  });
}

export async function getAccount(id: EntityId): Promise<Account | null> {
  return getEntity<Account>(TABLE, id, MAPPER);
}

export async function getAllAccounts(includeArchived = false): Promise<Account[]> {
  const whereClause = includeArchived ? '' : 'is_archived = 0';
  return getAllEntities<Account>(TABLE, MAPPER, whereClause);
}

export async function getActiveAccounts(): Promise<Account[]> {
  return getAllEntities<Account>(TABLE, MAPPER, 'is_archived = 0');
}

export async function getAccountsByType(type: AccountType): Promise<Account[]> {
  return getAllEntities<Account>(TABLE, MAPPER, 'type = ? AND is_archived = 0', [type]);
}

export async function updateAccount(
  id: EntityId,
  updates: Partial<Omit<Account, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  await updateEntity(TABLE, id, updates);
}

export async function archiveAccount(id: EntityId): Promise<void> {
  await updateEntity(TABLE, id, { isArchived: true });
}

export async function unarchiveAccount(id: EntityId): Promise<void> {
  await updateEntity(TABLE, id, { isArchived: false });
}

export async function deleteAccount(id: EntityId, force = false): Promise<void> {
  if (force) {
    await hardDeleteEntity(TABLE, id);
  } else {
    await softDeleteEntity(TABLE, id);
  }
}

export async function updateAccountBalance(id: EntityId, newBalance: MinorUnits): Promise<void> {
  await updateEntity(TABLE, id, { currentBalance: newBalance });
}

export async function adjustAccountBalance(id: EntityId, delta: MinorUnits): Promise<void> {
  const account = await getAccount(id);
  if (!account) throw new Error('Account not found');
  await updateEntity(TABLE, id, { currentBalance: account.currentBalance + delta });
}

export async function reorderAccounts(accountIds: EntityId[]): Promise<void> {
  await runTransaction(async (tx) => {
    for (let i = 0; i < accountIds.length; i++) {
      await tx.runAsync(
        'UPDATE accounts SET sort_order = ?, updated_at = ? WHERE id = ?',
        [i, nowISO(), accountIds[i]]
      );
    }
  });
}

export async function getTotalBalance(currency: string = 'INR'): Promise<MinorUnits> {
  const result = await queryFirst<{ total: number }>(
    'SELECT COALESCE(SUM(current_balance), 0) as total FROM accounts WHERE currency = ? AND is_archived = 0 AND deleted_at IS NULL',
    [currency]
  );
  return (result?.total ?? 0) as MinorUnits;
}

export async function getTotalBalanceByType(): Promise<Record<AccountType, MinorUnits>> {
  const rows = await queryFirst<{ type: AccountType; total: number }[]>(
    'SELECT type, COALESCE(SUM(current_balance), 0) as total FROM accounts WHERE is_archived = 0 AND deleted_at IS NULL GROUP BY type'
  );
  
  const result: Record<AccountType, MinorUnits> = {
    bank: 0,
    cash: 0,
    debit_card: 0,
    credit_card: 0,
    upi: 0,
    wallet: 0,
    savings: 0,
    investment: 0,
    fixed_deposit: 0,
    custom: 0,
  } as Record<AccountType, MinorUnits>;
  
  for (const row of rows) {
    result[row.type] = row.total as MinorUnits;
  }
  
  return result;
}

export async function getNextSortOrder(): Promise<number> {
  const result = await queryFirst<{ max: number }>(
    'SELECT COALESCE(MAX(sort_order), -1) as max FROM accounts'
  );
  return (result?.max ?? -1) + 1;
}

export async function getAccountCount(): Promise<number> {
  const result = await queryFirst<{ count: number }>(
    'SELECT COUNT(*) as count FROM accounts WHERE deleted_at IS NULL'
  );
  return result?.count ?? 0;
}

export async function getActiveAccountCount(): Promise<number> {
  const result = await queryFirst<{ count: number }>(
    'SELECT COUNT(*) as count FROM accounts WHERE is_archived = 0 AND deleted_at IS NULL'
  );
  return result?.count ?? 0;
}

export async function searchAccounts(query: string): Promise<Account[]> {
  return getAllEntities<Account>(
    TABLE, 
    MAPPER, 
    '(name LIKE ? OR notes LIKE ?) AND deleted_at IS NULL',
    [`%${query}%`, `%${query}%`]
  );
}

// Account with transaction counts (for dashboard)
export async function getAccountsWithStats(): Promise<Array<Account & { transactionCount: number; lastTransactionDate?: ISODateString }>> {
  const db = await (await import('./database')).getDatabase();
  const rows = await db.getAllAsync(`
    SELECT 
      a.*,
      COALESCE(t.txn_count, 0) as transaction_count,
      t.last_txn_date
    FROM accounts a
    LEFT JOIN (
      SELECT 
        account_id,
        COUNT(*) as txn_count,
        MAX(date) as last_txn_date
      FROM transactions
      WHERE deleted_at IS NULL
      GROUP BY account_id
    ) t ON a.id = t.account_id
    WHERE a.deleted_at IS NULL
    ORDER BY a.sort_order
  `);
  
  return rows.map(row => ({
    ...MAPPER(row),
    transactionCount: row.transaction_count,
    lastTransactionDate: row.last_txn_date,
  }));
}