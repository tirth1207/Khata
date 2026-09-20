// Khata - AI Service
// Local AI context preparation and Gemini integration

import { 
  EntityId, 
  MinorUnits, 
  ISODateString,
  AIConversation,
  AIMessage,
  AIInsight,
  AnalyticsPeriod,
  formatMoney,
  getPeriodRange,
} from '@/types';
import { getSettings, updateSettings } from '../storage/database';
import { getDashboardSummary } from '../analytics';
import { getCategorySpending, getBudgetSummaries, generateInsights } from '../analytics';
import { getActiveAccounts } from '../storage/repositories/accounts';
import { getActiveBudgets } from '../storage/repositories/budgets';
import { getActiveGoals } from '../storage/repositories/goals';
import { getUpcomingBills } from '../storage/repositories/bills';
import { getTotalOwedToMe, getTotalIOwe } from '../storage/repositories/debts';
import { getPortfolioValue } from '../storage/repositories/investments';
import { getGeminiApiKey } from '../security';

// AI Privacy Modes
export type AIPrivacyMode = 'minimal' | 'standard' | 'full';

export interface AIContext {
  period: AnalyticsPeriod;
  summary: {
    totalBalance: string;
    totalIncome: string;
    totalExpenses: string;
    savings: string;
    netWorth: string;
  };
  topCategories: Array<{ name: string; amount: string; percentage: number }>;
  budgets: Array<{ name: string; spent: string; budget: string; percentage: number; status: string }>;
  goals: Array<{ name: string; target: string; current: string; progress: number }>;
  upcomingBills: Array<{ name: string; amount: string; dueDate: string; daysUntil: number }>;
  debts: { owedToMe: string; iOwe: string };
  investments: { invested: string; current: string; gainLoss: string; gainLossPercent: number };
  insights: Array<{ type: string; title: string; description: string; severity: string }>;
}

// Prepare minimal context for AI (privacy-focused)
export async function prepareAIContext(
  period: AnalyticsPeriod,
  privacyMode: AIPrivacyMode = 'standard'
): Promise<AIContext> {
  const { start, end } = getPeriodRange(period);
  const startISO = start.toISOString() as ISODateString;
  const endISO = end.toISOString() as ISODateString;
  
  const [
    dashboard,
    categorySpending,
    budgetSummaries,
    goals,
    upcomingBills,
    owedToMe,
    iOwe,
    portfolio,
    insights,
  ] = await Promise.all([
    getDashboardSummary(period),
    getCategorySpending(period, 'expense'),
    getBudgetSummaries(period),
    getActiveGoals(),
    getUpcomingBills(30),
    getTotalOwedToMe(),
    getTotalIOwe(),
    getPortfolioValue(),
    generateInsights(period),
  ]);
  
  // Filter based on privacy mode
  const topCategories = privacyMode !== 'minimal' 
    ? categorySpending.slice(0, 5).map(c => ({
        name: c.categoryName,
        amount: formatMoney(c.amount),
        percentage: Math.round(c.percentage),
      }))
    : [];
  
  const budgets = privacyMode === 'full'
    ? budgetSummaries.map(b => ({
        name: b.budget.name,
        spent: formatMoney(b.spent),
        budget: formatMoney(b.budget.amount),
        percentage: Math.round(b.percentage),
        status: b.status,
      }))
    : [];
  
  const goalsData = privacyMode !== 'minimal'
    ? goals.map(g => ({
        name: g.name,
        target: formatMoney(g.targetAmount),
        current: formatMoney(g.currentAmount),
        progress: Math.round((g.currentAmount / g.targetAmount) * 100),
      }))
    : [];
  
  const bills = privacyMode !== 'minimal'
    ? upcomingBills.slice(0, 5).map(b => ({
        name: b.name,
        amount: formatMoney(b.amount),
        dueDate: b.dueDate,
        daysUntil: Math.ceil((new Date(b.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      }))
    : [];
  
  return {
    period,
    summary: {
      totalBalance: formatMoney(dashboard.totalBalance),
      totalIncome: formatMoney(dashboard.totalIncome),
      totalExpenses: formatMoney(dashboard.totalExpenses),
      savings: formatMoney(dashboard.totalSavings),
      netWorth: formatMoney(dashboard.netWorth),
    },
    topCategories,
    budgets,
    goals: goalsData,
    upcomingBills: bills,
    debts: {
      owedToMe: formatMoney(owedToMe),
      iOwe: formatMoney(iOwe),
    },
    investments: {
      invested: formatMoney(portfolio.totalInvested),
      current: formatMoney(portfolio.currentValue),
      gainLoss: formatMoney(portfolio.gainLoss),
      gainLossPercent: Math.round(portfolio.gainLossPercent * 100) / 100,
    },
    insights: insights.map(i => ({
      type: i.type,
      title: i.title,
      description: i.description,
      severity: i.severity,
    })),
  };
}

// Build system prompt for Gemini
export function buildSystemPrompt(context: AIContext, privacyMode: AIPrivacyMode): string {
  const periodLabels: Record<AnalyticsPeriod, string> = {
    today: 'today',
    this_week: 'this week',
    this_month: 'this month',
    last_month: 'last month',
    last_3_months: 'last 3 months',
    last_6_months: 'last 6 months',
    this_year: 'this year',
    last_year: 'last year',
    all_time: 'all time',
  };
  
  const periodLabel = typeof context.period === 'string' 
    ? periodLabels[context.period as AnalyticsPeriod] 
    : 'the selected period';
  
  return `You are Khata AI, a personal finance assistant. You help users understand their finances based on local data they've chosen to share.

FINANCIAL CONTEXT (${periodLabel}):
- Total Balance: ${context.summary.totalBalance}
- Income: ${context.summary.totalIncome}
- Expenses: ${context.summary.totalExpenses}
- Savings: ${context.summary.savings}
- Net Worth: ${context.summary.netWorth}

${context.topCategories.length > 0 ? `TOP SPENDING CATEGORIES:
${context.topCategories.map(c => `- ${c.name}: ${c.amount} (${c.percentage}%)`).join('\n')}` : ''}

${context.budgets.length > 0 ? `BUDGETS:
${context.budgets.map(b => `- ${b.name}: ${b.spent} / ${b.budget} (${b.percentage}%) - ${b.status}`).join('\n')}` : ''}

${context.goals.length > 0 ? `SAVINGS GOALS:
${context.goals.map(g => `- ${g.name}: ${g.current} / ${g.target} (${g.progress}%)`).join('\n')}` : ''}

${context.upcomingBills.length > 0 ? `UPCOMING BILLS:
${context.upcomingBills.map(b => `- ${b.name}: ${b.amount} due ${b.daysUntil} days`).join('\n')}` : ''}

DEBTS:
- Money owed to you: ${context.debts.owedToMe}
- Money you owe: ${context.debts.iOwe}

INVESTMENTS:
- Total Invested: ${context.investments.invested}
- Current Value: ${context.investments.current}
- Gain/Loss: ${context.investments.gainLoss} (${context.investments.gainLossPercent}%)

KEY INSIGHTS:
${context.insights.map(i => `- ${i.title}: ${i.description}`).join('\n')}

PRIVACY MODE: ${privacyMode}
${privacyMode === 'minimal' ? 'Only summary-level data was shared. No category, budget, or transaction details.' : ''}
${privacyMode === 'standard' ? 'Summary, top categories, goals, and upcoming bills were shared. No individual transactions.' : ''}
${privacyMode === 'full' ? 'Full financial context including budgets was shared. No individual transactions.' : ''}

GUIDELINES:
1. Never make up numbers - only use the data provided
2. Clearly distinguish between calculations (based on provided data) and AI-generated insights
3. Be helpful but conservative with financial advice
4. Suggest seeing a financial advisor for major decisions
5. Keep responses concise and actionable
6. If asked about specific transactions, explain you don't have that level of detail
7. All analysis is based on ${periodLabel} data only`;
}

// Call Gemini API
export async function callGemini(
  prompt: string,
  context: AIContext,
  privacyMode: AIPrivacyMode,
  conversationHistory: AIMessage[] = []
): Promise<{ response: string; tokensUsed?: number }> {
  const apiKey = await getGeminiApiKey();
  
  if (!apiKey) {
    throw new Error('Gemini API key not configured. Please add it in Settings > AI.');
  }
  
  const systemPrompt = buildSystemPrompt(context, privacyMode);
  
  // Build conversation
  const contents = [
    { role: 'user', parts: [{ text: systemPrompt }] },
    { role: 'model', parts: [{ text: 'I understand. I\'ll help you analyze your finances based on the data you\'ve shared. What would you like to know?' }] },
    ...conversationHistory.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    })),
    { role: 'user', parts: [{ text: prompt }] },
  ];
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          ],
        }),
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Gemini API error');
    }
    
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
    const tokensUsed = data.usageMetadata?.totalTokenCount;
    
    return { response: text, tokensUsed };
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
}

// AI Conversation Management
const CONVERSATIONS_TABLE = 'ai_conversations';

export async function createAIConversation(title: string): Promise<AIConversation> {
  const db = await (await import('../storage/database')).getDatabase();
  const now = new Date().toISOString() as ISODateString;
  const id = crypto.randomUUID() as EntityId;
  
  await db.runAsync(
    `INSERT INTO ai_conversations (id, title, messages, created_at, updated_at)
     VALUES (?, ?, '[]', ?, ?)`,
    [id, title, now, now]
  );
  
  return {
    id,
    title,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

export async function getAIConversations(): Promise<AIConversation[]> {
  const db = await (await import('../storage/database')).getDatabase();
  const rows = await db.getAllAsync(
    `SELECT * FROM ai_conversations WHERE deleted_at IS NULL ORDER BY updated_at DESC`
  );
  
  return rows.map(row => ({
    id: row.id,
    title: row.title,
    messages: JSON.parse(row.messages || '[]'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  }));
}

export async function getAIConversation(id: EntityId): Promise<AIConversation | null> {
  const db = await (await import('../storage/database')).getDatabase();
  const row = await db.getFirstAsync(
    `SELECT * FROM ai_conversations WHERE id = ? AND deleted_at IS NULL`,
    [id]
  );
  
  if (!row) return null;
  
  return {
    id: row.id,
    title: row.title,
    messages: JSON.parse(row.messages || '[]'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export async function addAIMessage(
  conversationId: EntityId,
  message: AIMessage
): Promise<void> {
  const db = await (await import('../storage/database')).getDatabase();
  const conversation = await getAIConversation(conversationId);
  
  if (!conversation) throw new Error('Conversation not found');
  
  const messages = [...conversation.messages, message];
  
  await db.runAsync(
    `UPDATE ai_conversations SET messages = ?, updated_at = ? WHERE id = ?`,
    [JSON.stringify(messages), new Date().toISOString(), conversationId]
  );
}

export async function deleteAIConversation(id: EntityId): Promise<void> {
  const db = await (await import('../storage/database')).getDatabase();
  const now = new Date().toISOString() as ISODateString;
  
  await db.runAsync(
    `UPDATE ai_conversations SET deleted_at = ? WHERE id = ?`,
    [now, id]
  );
}

// AI Insights (cached)
export async function saveAIInsight(insight: Omit<AIInsight, 'id' | 'createdAt' | 'deletedAt'>): Promise<AIInsight> {
  const db = await (await import('../storage/database')).getDatabase();
  const now = new Date().toISOString() as ISODateString;
  const id = crypto.randomUUID() as EntityId;
  
  await db.runAsync(
    `INSERT INTO ai_insights (id, type, title, description, severity, related_entity_ids, is_read, is_dismissed, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?)`,
    [id, insight.type, insight.title, insight.description, insight.severity, JSON.stringify(insight.relatedEntityIds), now]
  );
  
  return { ...insight, id, createdAt: now };
}

export async function getAIInsights(unreadOnly = false): Promise<AIInsight[]> {
  const db = await (await import('../storage/database')).getDatabase();
  
  let sql = `SELECT * FROM ai_insights WHERE deleted_at IS NULL`;
  if (unreadOnly) {
    sql += ` AND is_read = 0 AND is_dismissed = 0`;
  }
  sql += ` ORDER BY created_at DESC`;
  
  const rows = await db.getAllAsync(sql);
  
  return rows.map(row => ({
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
  }));
}

export async function markAIInsightRead(id: EntityId): Promise<void> {
  const db = await (await import('../storage/database')).getDatabase();
  await db.runAsync(`UPDATE ai_insights SET is_read = 1 WHERE id = ?`, [id]);
}

export async function dismissAIInsight(id: EntityId): Promise<void> {
  const db = await (await import('../storage/database')).getDatabase();
  await db.runAsync(`UPDATE ai_insights SET is_dismissed = 1 WHERE id = ?`, [id]);
}

export async function clearAIInsights(): Promise<void> {
  const db = await (await import('../storage/database')).getDatabase();
  const now = new Date().toISOString() as ISODateString;
  await db.runAsync(`UPDATE ai_insights SET deleted_at = ?`, [now]);
}

// Main AI Assistant Function
export async function askAI(
  question: string,
  period: AnalyticsPeriod = 'this_month',
  conversationId?: EntityId
): Promise<{ response: string; conversationId: EntityId; tokensUsed?: number }> {
  const settings = await getSettings();
  
  if (!settings.aiEnabled) {
    throw new Error('AI is not enabled. Please enable it in Settings.');
  }
  
  const privacyMode = settings.aiPrivacyMode as AIPrivacyMode;
  const context = await prepareAIContext(period, privacyMode);
  
  let conversation: AIConversation;
  let history: AIMessage[] = [];
  
  if (conversationId) {
    conversation = await getAIConversation(conversationId);
    if (!conversation) throw new Error('Conversation not found');
    history = conversation.messages;
  } else {
    conversation = await createAIConversation(question.slice(0, 50));
  }
  
  // Add user message
  const userMessage: AIMessage = {
    id: crypto.randomUUID() as EntityId,
    role: 'user',
    content: question,
    timestamp: new Date().toISOString() as ISODateString,
  };
  
  await addAIMessage(conversation.id, userMessage);
  
  // Get AI response
  const { response, tokensUsed } = await callGemini(question, context, privacyMode, history);
  
  // Add assistant message
  const assistantMessage: AIMessage = {
    id: crypto.randomUUID() as EntityId,
    role: 'assistant',
    content: response,
    timestamp: new Date().toISOString() as ISODateString,
    dataSent: {
      privacyMode,
      period,
      dataPoints: {
        hasCategories: context.topCategories.length > 0,
        hasBudgets: context.budgets.length > 0,
        hasGoals: context.goals.length > 0,
        hasBills: context.upcomingBills.length > 0,
      },
    },
    tokensUsed,
  };
  
  await addAIMessage(conversation.id, assistantMessage);
  
  return { response, conversationId: conversation.id, tokensUsed };
}