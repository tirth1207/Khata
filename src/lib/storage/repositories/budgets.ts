// Khata - Budget Repository
// Data access layer for budgets

import { 
  Budget, 
  EntityId, 
  MinorUnits, 
  ISODateString,
  BudgetPeriod,
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

const TABLE = 'budgets';
const MAPPER = (row: any): Budget => ({
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
});

export async function createBudget(data: {
  name: string;
  amount: MinorUnits;
  currency: string;
  period: BudgetPeriod;
  customPeriodStart?: ISODateString;
  customPeriodEnd?: ISODateString;
  categoryId?: EntityId;
  accountId?: EntityId;
  alertThreshold?: number;
}): Promise<Budget> {
  const now = nowISO();
  return createEntity<Budget>(TABLE, {
    ...data,
    alertThreshold: data.alertThreshold ?? 80,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });
}

export async function getBudget(id: EntityId): Promise<Budget | null> {
  return getEntity<Budget>(TABLE, id, MAPPER);
}

export async function getAllBudgets(activeOnly = true): Promise<Budget[]> {
  const whereClause = activeOnly ? 'is_active = 1 AND deleted_at IS NULL' : 'deleted_at IS NULL';
  return getAllEntities<Budget>(TABLE, MAPPER, whereClause);
}

export async function getActiveBudgets(): Promise<Budget[]> {
  return getAllEntities<Budget>(TABLE, MAPPER, 'is_active = 1 AND deleted_at IS NULL');
}

export async function getBudgetsByCategory(categoryId: EntityId): Promise<Budget[]> {
  return getAllEntities<Budget>(TABLE, MAPPER, 'category_id = ? AND is_active = 1 AND deleted_at IS NULL', [categoryId]);
}

export async function getBudgetsByAccount(accountId: EntityId): Promise<Budget[]> {
  return getAllEntities<Budget>(TABLE, MAPPER, 'account_id = ? AND is_active = 1 AND deleted_at IS NULL', [accountId]);
}

export async function getOverallBudgets(): Promise<Budget[]> {
  return getAllEntities<Budget>(TABLE, MAPPER, 'category_id IS NULL AND is_active = 1 AND deleted_at IS NULL');
}

export async function updateBudget(
  id: EntityId,
  updates: Partial<Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  await updateEntity(TABLE, id, updates);
}

export async function deleteBudget(id: EntityId, force = false): Promise<void> {
  if (force) {
    await hardDeleteEntity(TABLE, id);
  } else {
    await softDeleteEntity(TABLE, id);
  }
}

export async function setBudgetActive(id: EntityId, active: boolean): Promise<void> {
  await updateEntity(TABLE, id, { isActive: active });
}

export async function getBudgetCount(): Promise<number> {
  const result = await queryFirst<{ count: number }>(
    'SELECT COUNT(*) as count FROM budgets WHERE deleted_at IS NULL'
  );
  return result?.count ?? 0;
}

// Get budget with spending stats for a period
export async function getBudgetWithSpending(
  budgetId: EntityId,
  periodStart: ISODateString,
  periodEnd: ISODateString
): Promise<{ budget: Budget; spent: MinorUnits; remaining: MinorUnits; percentage: number } | null> {
  const db = await (await import('../database')).getDatabase();
  
  const budget = await getBudget(budgetId);
  if (!budget) return null;
  
  let sql = `
    SELECT COALESCE(SUM(amount), 0) as spent
    FROM transactions
    WHERE type = 'expense'
      AND date >= ?
      AND date <= ?
      AND deleted_at IS NULL
  `;
  const params: any[] = [periodStart, periodEnd];
  
  if (budget.categoryId) {
    sql += ` AND category_id = ?`;
    params.push(budget.categoryId);
  }
  
  if (budget.accountId) {
    sql += ` AND account_id = ?`;
    params.push(budget.accountId);
  }
  
  const result = await db.getFirstAsync<{ spent: number }>(sql, params);
  const spent = (result?.spent ?? 0) as MinorUnits;
  const remaining = budget.amount - spent;
  const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
  
  return { budget, spent, remaining, percentage };
}