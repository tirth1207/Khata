// Khata - Investments Repository
// Data access layer for investments

import { 
  Investment, 
  InvestmentTransaction, 
  EntityId, 
  MinorUnits, 
  ISODateString,
  InvestmentType,
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

const INVESTMENTS_TABLE = 'investments';
const INVESTMENT_TXNS_TABLE = 'investment_transactions';

const INVESTMENT_MAPPER = (row: any): Investment => ({
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
});

const INVESTMENT_TXN_MAPPER = (row: any): InvestmentTransaction => ({
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
});

// Investments
export async function createInvestment(data: {
  name: string;
  type: InvestmentType;
  symbol?: string;
  quantity: number;
  buyPrice: MinorUnits;
  currentPrice?: MinorUnits;
  currency: string;
  buyDate: ISODateString;
  accountId: EntityId;
  notes?: string;
}): Promise<Investment> {
  const now = nowISO();
  return createEntity<Investment>(INVESTMENTS_TABLE, {
    ...data,
    createdAt: now,
    updatedAt: now,
  });
}

export async function getInvestment(id: EntityId): Promise<Investment | null> {
  return getEntity<Investment>(INVESTMENTS_TABLE, id, INVESTMENT_MAPPER);
}

export async function getAllInvestments(): Promise<Investment[]> {
  return getAllEntities<Investment>(INVESTMENTS_TABLE, INVESTMENT_MAPPER, 'deleted_at IS NULL');
}

export async function getInvestmentsByAccount(accountId: EntityId): Promise<Investment[]> {
  return getAllEntities<Investment>(INVESTMENTS_TABLE, INVESTMENT_MAPPER, 'account_id = ? AND deleted_at IS NULL', [accountId]);
}

export async function getInvestmentsByType(type: InvestmentType): Promise<Investment[]> {
  return getAllEntities<Investment>(INVESTMENTS_TABLE, INVESTMENT_MAPPER, 'type = ? AND deleted_at IS NULL', [type]);
}

export async function updateInvestment(
  id: EntityId,
  updates: Partial<Omit<Investment, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  await updateEntity(INVESTMENTS_TABLE, id, updates);
}

export async function updateInvestmentCurrentPrice(id: EntityId, currentPrice: MinorUnits): Promise<void> {
  await updateEntity(INVESTMENTS_TABLE, id, { currentPrice });
}

export async function deleteInvestment(id: EntityId, force = false): Promise<void> {
  if (force) {
    await hardDeleteEntity(INVESTMENTS_TABLE, id);
  } else {
    await softDeleteEntity(INVESTMENTS_TABLE, id);
  }
}

export async function getInvestmentCount(): Promise<number> {
  const result = await queryFirst<{ count: number }>(
    'SELECT COUNT(*) as count FROM investments WHERE deleted_at IS NULL'
  );
  return result?.count ?? 0;
}

// Investment Transactions
export async function addInvestmentTransaction(data: {
  investmentId: EntityId;
  type: 'buy' | 'sell' | 'dividend' | 'interest' | 'split' | 'bonus';
  quantity: number;
  pricePerUnit: MinorUnits;
  totalAmount: MinorUnits;
  currency: string;
  date: ISODateString;
  fees?: MinorUnits;
  notes?: string;
}): Promise<InvestmentTransaction> {
  return runTransaction(async (tx) => {
    const now = nowISO();
    const txnId = generateId();
    
    await tx.runAsync(
      `INSERT INTO investment_transactions (id, investment_id, type, quantity, price_per_unit, total_amount, currency, date, fees, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [txnId, data.investmentId, data.type, data.quantity, data.pricePerUnit, data.totalAmount, data.currency, data.date, data.fees ?? 0, data.notes, now]
    );
    
    // Update investment quantity and buy price for buy/sell
    if (data.type === 'buy' || data.type === 'sell') {
      const investment = await tx.getFirstAsync<{ quantity: number; buy_price: number }>(
        'SELECT quantity, buy_price FROM investments WHERE id = ?',
        [data.investmentId]
      );
      
      if (investment) {
        let newQuantity = investment.quantity;
        let newBuyPrice = investment.buy_price;
        
        if (data.type === 'buy') {
          // Weighted average buy price
          const totalCost = investment.quantity * investment.buy_price + data.totalAmount;
          newQuantity = investment.quantity + data.quantity;
          newBuyPrice = Math.round(totalCost / newQuantity);
        } else if (data.type === 'sell') {
          newQuantity = investment.quantity - data.quantity;
        }
        
        await tx.runAsync(
          `UPDATE investments SET quantity = ?, buy_price = ?, updated_at = ? WHERE id = ?`,
          [newQuantity, newBuyPrice, now, data.investmentId]
        );
      }
    }
    
    return INVESTMENT_TXN_MAPPER({
      id: txnId,
      investment_id: data.investmentId,
      type: data.type,
      quantity: data.quantity,
      price_per_unit: data.pricePerUnit,
      total_amount: data.totalAmount,
      currency: data.currency,
      date: data.date,
      fees: data.fees ?? 0,
      notes: data.notes,
      created_at: now,
    });
  });
}

export async function getInvestmentTransactions(investmentId: EntityId): Promise<InvestmentTransaction[]> {
  return getAllEntities<InvestmentTransaction>(
    INVESTMENT_TXNS_TABLE, 
    INVESTMENT_TXN_MAPPER, 
    'investment_id = ? AND deleted_at IS NULL', 
    [investmentId]
  );
}

export async function getInvestmentWithTransactions(id: EntityId): Promise<{ investment: Investment; transactions: InvestmentTransaction[] } | null> {
  const investment = await getInvestment(id);
  if (!investment) return null;
  
  const transactions = await getInvestmentTransactions(id);
  return { investment, transactions };
}

// Portfolio analytics
export async function getPortfolioValue(): Promise<{ totalInvested: MinorUnits; currentValue: MinorUnits; gainLoss: MinorUnits; gainLossPercent: number }> {
  const db = await (await import('../database')).getDatabase();
  
  const rows = await db.getAllAsync(`
    SELECT 
      quantity,
      buy_price,
      current_price
    FROM investments
    WHERE deleted_at IS NULL
  `);
  
  let totalInvested = 0 as MinorUnits;
  let currentValue = 0 as MinorUnits;
  
  for (const row of rows) {
    const invested = (row.quantity * row.buy_price) as MinorUnits;
    const current = row.current_price ? (row.quantity * row.current_price) as MinorUnits : invested;
    totalInvested += invested;
    currentValue += current;
  }
  
  const gainLoss = currentValue - totalInvested;
  const gainLossPercent = totalInvested > 0 ? (gainLoss / totalInvested) * 100 : 0;
  
  return { totalInvested, currentValue, gainLoss, gainLossPercent };
}

export async function getPortfolioByType(): Promise<Array<{ type: InvestmentType; invested: MinorUnits; current: MinorUnits; gainLoss: MinorUnits }>> {
  const db = await (await import('../database')).getDatabase();
  
  const rows = await db.getAllAsync(`
    SELECT 
      type,
      SUM(quantity * buy_price) as invested,
      SUM(quantity * COALESCE(current_price, buy_price)) as current
    FROM investments
    WHERE deleted_at IS NULL
    GROUP BY type
  `);
  
  return rows.map(row => ({
    type: row.type,
    invested: row.invested as MinorUnits,
    current: row.current as MinorUnits,
    gainLoss: (row.current - row.invested) as MinorUnits,
  }));
}