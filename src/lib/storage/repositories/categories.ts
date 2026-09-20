// Khata - Category Repository
// Data access layer for categories

import { 
  Category, 
  EntityId, 
  ISODateString,
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

const TABLE = 'categories';
const MAPPER = (row: any): Category => ({
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
});

export async function createCategory(data: {
  name: string;
  parentId?: EntityId;
  icon: string;
  color: string;
  type: 'expense' | 'income' | 'both';
  isDefault?: boolean;
}): Promise<Category> {
  const now = nowISO();
  return createEntity<Category>(TABLE, {
    ...data,
    isDefault: data.isDefault ?? false,
    sortOrder: await getNextSortOrder(data.parentId),
    createdAt: now,
    updatedAt: now,
  });
}

export async function getCategory(id: EntityId): Promise<Category | null> {
  return getEntity<Category>(TABLE, id, MAPPER);
}

export async function getAllCategories(includeDefault = true): Promise<Category[]> {
  const whereClause = includeDefault ? 'deleted_at IS NULL' : 'is_default = 0 AND deleted_at IS NULL';
  return getAllEntities<Category>(TABLE, MAPPER, whereClause);
}

export async function getCategoriesByType(type: 'expense' | 'income' | 'both'): Promise<Category[]> {
  return getAllEntities<Category>(
    TABLE, 
    MAPPER, 
    '(type = ? OR type = \'both\') AND deleted_at IS NULL',
    [type]
  );
}

export async function getRootCategories(type?: 'expense' | 'income' | 'both'): Promise<Category[]> {
  let whereClause = 'parent_id IS NULL AND deleted_at IS NULL';
  const params: any[] = [];
  
  if (type) {
    whereClause += ' AND (type = ? OR type = \'both\')';
    params.push(type);
  }
  
  return getAllEntities<Category>(TABLE, MAPPER, whereClause, params);
}

export async function getSubcategories(parentId: EntityId): Promise<Category[]> {
  return getAllEntities<Category>(TABLE, MAPPER, 'parent_id = ? AND deleted_at IS NULL', [parentId]);
}

export async function getCategoryTree(type?: 'expense' | 'income' | 'both'): Promise<Category[]> {
  const roots = await getRootCategories(type);
  const result: Category[] = [];
  
  for (const root of roots) {
    result.push(root);
    const subs = await getSubcategories(root.id);
    result.push(...subs);
  }
  
  return result;
}

export async function updateCategory(
  id: EntityId,
  updates: Partial<Omit<Category, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  await updateEntity(TABLE, id, updates);
}

export async function deleteCategory(id: EntityId, force = false, reassignToId?: EntityId): Promise<void> {
  const db = await (await import('../database')).getDatabase();
  
  if (force) {
    await hardDeleteEntity(TABLE, id);
  } else {
    // Check if category has transactions
    const txnCount = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM transactions WHERE category_id = ? AND deleted_at IS NULL',
      [id]
    );
    
    if (txnCount && txnCount.count > 0) {
      if (reassignToId) {
        // Reassign transactions to another category
        await db.runAsync(
          'UPDATE transactions SET category_id = ?, updated_at = ? WHERE category_id = ?',
          [reassignToId, nowISO(), id]
        );
      } else {
        // Set transactions to have no category
        await db.runAsync(
          'UPDATE transactions SET category_id = NULL, updated_at = ? WHERE category_id = ?',
          [nowISO(), id]
        );
      }
    }
    
    // Also handle subcategories
    const subCount = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM categories WHERE parent_id = ? AND deleted_at IS NULL',
      [id]
    );
    
    if (subCount && subCount.count > 0) {
      if (reassignToId) {
        await db.runAsync(
          'UPDATE categories SET parent_id = ?, updated_at = ? WHERE parent_id = ?',
          [reassignToId, nowISO(), id]
        );
      } else {
        await db.runAsync(
          'UPDATE categories SET parent_id = NULL, updated_at = ? WHERE parent_id = ?',
          [nowISO(), id]
        );
      }
    }
    
    await softDeleteEntity(TABLE, id);
  }
}

export async function reorderCategories(categoryIds: EntityId[]): Promise<void> {
  await runTransaction(async (tx) => {
    for (let i = 0; i < categoryIds.length; i++) {
      await tx.runAsync(
        'UPDATE categories SET sort_order = ?, updated_at = ? WHERE id = ?',
        [i, nowISO(), categoryIds[i]]
      );
    }
  });
}

export async function getNextSortOrder(parentId?: EntityId): Promise<number> {
  const db = await (await import('../database')).getDatabase();
  
  let sql = 'SELECT COALESCE(MAX(sort_order), -1) as max FROM categories';
  const params: any[] = [];
  
  if (parentId) {
    sql += ' WHERE parent_id = ?';
    params.push(parentId);
  } else {
    sql += ' WHERE parent_id IS NULL';
  }
  
  const result = await db.getFirstAsync<{ max: number }>(sql, params);
  return (result?.max ?? -1) + 1;
}

export async function getCategoryCount(): Promise<number> {
  const result = await queryFirst<{ count: number }>(
    'SELECT COUNT(*) as count FROM categories WHERE deleted_at IS NULL'
  );
  return result?.count ?? 0;
}

export async function searchCategories(query: string, type?: 'expense' | 'income' | 'both'): Promise<Category[]> {
  let whereClause = '(name LIKE ?) AND deleted_at IS NULL';
  const params: any[] = [`%${query}%`];
  
  if (type) {
    whereClause += ' AND (type = ? OR type = \'both\')';
    params.push(type);
  }
  
  return getAllEntities<Category>(TABLE, MAPPER, whereClause, params);
}

// Get category with transaction stats
export async function getCategoriesWithStats(
  startDate?: ISODateString,
  endDate?: ISODateString,
  type: 'expense' | 'income' = 'expense'
): Promise<Array<Category & { transactionCount: number; totalAmount: number }>> {
  const db = await (await import('../database')).getDatabase();
  
  let sql = `
    SELECT 
      c.*,
      COALESCE(t.txn_count, 0) as transaction_count,
      COALESCE(t.total_amount, 0) as total_amount
    FROM categories c
    LEFT JOIN (
      SELECT 
        category_id,
        COUNT(*) as txn_count,
        SUM(amount) as total_amount
      FROM transactions
      WHERE type = ? AND deleted_at IS NULL
  `;
  
  const params: any[] = [type];
  
  if (startDate) {
    sql += ` AND date >= ?`;
    params.push(startDate);
  }
  
  if (endDate) {
    sql += ` AND date <= ?`;
    params.push(endDate);
  }
  
  sql += `
      GROUP BY category_id
    ) t ON c.id = t.category_id
    WHERE c.deleted_at IS NULL AND (c.type = ? OR c.type = 'both')
    ORDER BY c.sort_order
  `;
  
  params.push(type);
  
  const rows = await db.getAllAsync(sql, params);
  return rows.map(row => ({
    ...MAPPER(row),
    transactionCount: row.transaction_count,
    totalAmount: row.total_amount,
  }));
}