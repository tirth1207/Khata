// Khata - Savings Goals Repository
// Data access layer for savings goals

import { 
  SavingsGoal, 
  GoalContribution, 
  EntityId, 
  MinorUnits, 
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

const GOALS_TABLE = 'savings_goals';
const CONTRIBUTIONS_TABLE = 'goal_contributions';

const GOAL_MAPPER = (row: any): SavingsGoal => ({
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
});

const CONTRIBUTION_MAPPER = (row: any): GoalContribution => ({
  id: row.id,
  goalId: row.goal_id,
  amount: row.amount,
  currency: row.currency,
  accountId: row.account_id,
  note: row.note,
  date: row.date,
  createdAt: row.created_at,
  deletedAt: row.deleted_at,
});

// Goals
export async function createGoal(data: {
  name: string;
  targetAmount: MinorUnits;
  currency: string;
  targetDate?: ISODateString;
  icon: string;
  color: string;
  description?: string;
  accountId?: EntityId;
}): Promise<SavingsGoal> {
  const now = nowISO();
  return createEntity<SavingsGoal>(GOALS_TABLE, {
    ...data,
    currentAmount: 0 as MinorUnits,
    isCompleted: false,
    createdAt: now,
    updatedAt: now,
  });
}

export async function getGoal(id: EntityId): Promise<SavingsGoal | null> {
  return getEntity<SavingsGoal>(GOALS_TABLE, id, GOAL_MAPPER);
}

export async function getAllGoals(includeCompleted = true): Promise<SavingsGoal[]> {
  const whereClause = includeCompleted ? 'deleted_at IS NULL' : 'is_completed = 0 AND deleted_at IS NULL';
  return getAllEntities<SavingsGoal>(GOALS_TABLE, GOAL_MAPPER, whereClause);
}

export async function getActiveGoals(): Promise<SavingsGoal[]> {
  return getAllEntities<SavingsGoal>(GOALS_TABLE, GOAL_MAPPER, 'is_completed = 0 AND deleted_at IS NULL');
}

export async function getGoalsByAccount(accountId: EntityId): Promise<SavingsGoal[]> {
  return getAllEntities<SavingsGoal>(GOALS_TABLE, GOAL_MAPPER, 'account_id = ? AND deleted_at IS NULL', [accountId]);
}

export async function updateGoal(
  id: EntityId,
  updates: Partial<Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  await updateEntity(GOALS_TABLE, id, updates);
}

export async function deleteGoal(id: EntityId, force = false): Promise<void> {
  if (force) {
    await hardDeleteEntity(GOALS_TABLE, id);
  } else {
    await softDeleteEntity(GOALS_TABLE, id);
  }
}

export async function markGoalCompleted(id: EntityId): Promise<void> {
  await updateEntity(GOALS_TABLE, id, { 
    isCompleted: true, 
    completedAt: nowISO() 
  });
}

export async function getGoalCount(): Promise<number> {
  const result = await queryFirst<{ count: number }>(
    'SELECT COUNT(*) as count FROM savings_goals WHERE deleted_at IS NULL'
  );
  return result?.count ?? 0;
}

// Contributions
export async function addGoalContribution(data: {
  goalId: EntityId;
  amount: MinorUnits;
  currency: string;
  accountId: EntityId;
  note?: string;
  date: ISODateString;
}): Promise<GoalContribution> {
  return runTransaction(async (tx) => {
    const now = nowISO();
    const contributionId = generateId();
    
    // Add contribution
    await tx.runAsync(
      `INSERT INTO goal_contributions (id, goal_id, amount, currency, account_id, note, date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [contributionId, data.goalId, data.amount, data.currency, data.accountId, data.note, data.date, now]
    );
    
    // Update goal current amount
    await tx.runAsync(
      `UPDATE savings_goals SET current_amount = current_amount + ?, updated_at = ? WHERE id = ?`,
      [data.amount, now, data.goalId]
    );
    
    // Check if goal is completed
    const goal = await tx.getFirstAsync<{ target_amount: number; current_amount: number }>(
      'SELECT target_amount, current_amount FROM savings_goals WHERE id = ?',
      [data.goalId]
    );
    
    if (goal && goal.current_amount >= goal.target_amount) {
      await tx.runAsync(
        `UPDATE savings_goals SET is_completed = 1, completed_at = ?, updated_at = ? WHERE id = ?`,
        [now, now, data.goalId]
      );
    }
    
    return CONTRIBUTION_MAPPER({
      id: contributionId,
      goal_id: data.goalId,
      amount: data.amount,
      currency: data.currency,
      account_id: data.accountId,
      note: data.note,
      date: data.date,
      created_at: now,
    });
  });
}

export async function getGoalContributions(goalId: EntityId): Promise<GoalContribution[]> {
  return getAllEntities<GoalContribution>(
    CONTRIBUTIONS_TABLE, 
    CONTRIBUTION_MAPPER, 
    'goal_id = ? AND deleted_at IS NULL', 
    [goalId]
  );
}

export async function deleteGoalContribution(id: EntityId): Promise<void> {
  await runTransaction(async (tx) => {
    // Get contribution to know amount and goal
    const contribution = await tx.getFirstAsync<{ goal_id: EntityId; amount: number }>(
      'SELECT goal_id, amount FROM goal_contributions WHERE id = ?',
      [id]
    );
    
    if (contribution) {
      // Update goal current amount
      await tx.runAsync(
        `UPDATE savings_goals SET current_amount = current_amount - ?, updated_at = ? WHERE id = ?`,
        [contribution.amount, nowISO(), contribution.goal_id]
      );
      
      // Mark contribution as deleted
      await tx.runAsync(
        `UPDATE goal_contributions SET deleted_at = ? WHERE id = ?`,
        [nowISO(), id]
      );
      
      // Check if goal should be uncompleted
      const goal = await tx.getFirstAsync<{ target_amount: number; current_amount: number; is_completed: number }>(
        'SELECT target_amount, current_amount, is_completed FROM savings_goals WHERE id = ?',
        [contribution.goal_id]
      );
      
      if (goal && goal.is_completed && goal.current_amount < goal.target_amount) {
        await tx.runAsync(
          `UPDATE savings_goals SET is_completed = 0, completed_at = NULL, updated_at = ? WHERE id = ?`,
          [nowISO(), contribution.goal_id]
        );
      }
    }
  });
}

// Get goal with progress
export async function getGoalWithProgress(id: EntityId): Promise<{ goal: SavingsGoal; progress: number; remaining: MinorUnits; daysRemaining?: number } | null> {
  const goal = await getGoal(id);
  if (!goal) return null;
  
  const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
  const remaining = goal.targetAmount - goal.currentAmount;
  
  let daysRemaining: number | undefined;
  if (goal.targetDate) {
    const target = new Date(goal.targetDate);
    const now = new Date();
    const diff = target.getTime() - now.getTime();
    daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
  
  return { goal, progress, remaining, daysRemaining };
}