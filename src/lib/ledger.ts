import { request } from '@/lib/api';

/**
 * Kontrak buku besar, cermin dari `src/contracts/ledger.ts` di backend.
 *
 * SELURUH jumlah adalah bilangan bulat dalam satuan terkecil mata uangnya yang
 * beredar — untuk IDR itu rupiah utuh. Tidak ada pecahan yang menyeberangi
 * batas HTTP, dan tidak ada satu pun tempat di frontend yang boleh membaginya.
 */

export type AccountKind = 'cash' | 'bank' | 'ewallet' | 'card' | 'investment';
export type CategoryKind = 'income' | 'expense';
export type TransactionKind = 'income' | 'expense' | 'transfer';
export type BudgetPeriod = 'weekly' | 'monthly' | 'yearly';

export interface WalletAccount {
  id: string;
  name: string;
  kind: AccountKind;
  currency: string;
  openingBalance: number;
  balance: number;
  color: string | null;
  archived: boolean;
}

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  icon: string;
  color: string;
  system: boolean;
}

export interface Transaction {
  id: string;
  accountId: string;
  counterAccountId: string | null;
  categoryId: string | null;
  kind: TransactionKind;
  amount: number;
  currency: string;
  occurredAt: number;
  note: string | null;
  merchant: string | null;
}

export interface TransactionPage {
  items: Transaction[];
  nextCursor: string | null;
}

export interface Budget {
  id: string;
  categoryId: string;
  period: BudgetPeriod;
  amount: number;
  currency: string;
  startsOn: string;
  spent: number;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  currency: string;
  targetDate: string | null;
  color: string | null;
  achieved: boolean;
}

export interface CashflowPoint {
  bucket: string;
  income: number;
  expense: number;
}

export interface CategoryBreakdown {
  categoryId: string | null;
  categoryName: string;
  color: string;
  total: number;
}

export interface DashboardSummary {
  currency: string;
  netWorth: number;
  monthIncome: number;
  monthExpense: number;
  expenseDelta: number | null;
  accounts: WalletAccount[];
  recent: Transaction[];
  cashflow: CashflowPoint[];
  topCategories: CategoryBreakdown[];
  budgets: Budget[];
  goals: Goal[];
}

/* ── panggilan ───────────────────────────────────────────────────────── */

export interface TransactionQuery {
  accountId?: string;
  categoryId?: string;
  kind?: TransactionKind;
  from?: number;
  to?: number;
  cursor?: string;
  limit?: number;
}

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const text = search.toString();
  return text.length > 0 ? `?${text}` : '';
}

export interface TransactionInput {
  accountId: string;
  counterAccountId?: string;
  categoryId?: string;
  kind: TransactionKind;
  amount: number;
  occurredAt: number;
  note?: string;
  merchant?: string;
}

export const ledger = {
  dashboard: () => request<DashboardSummary>('/v1/dashboard'),

  accounts: () => request<WalletAccount[]>('/v1/accounts'),
  createAccount: (body: {
    name: string;
    kind: AccountKind;
    openingBalance?: number;
    color?: string;
  }) => request<WalletAccount>('/v1/accounts', { method: 'POST', body }),
  updateAccount: (id: string, body: { name?: string; kind?: AccountKind; archived?: boolean }) =>
    request<WalletAccount>(`/v1/accounts/${id}`, { method: 'PATCH', body }),

  categories: () => request<Category[]>('/v1/categories'),
  createCategory: (body: { name: string; kind: CategoryKind; icon: string; color: string }) =>
    request<Category>('/v1/categories', { method: 'POST', body }),

  transactions: (params: TransactionQuery = {}) =>
    request<TransactionPage>(`/v1/transactions${query({ ...params })}`),
  createTransaction: (body: TransactionInput) =>
    request<Transaction>('/v1/transactions', { method: 'POST', body }),
  updateTransaction: (id: string, body: TransactionInput) =>
    request<Transaction>(`/v1/transactions/${id}`, { method: 'PUT', body }),
  deleteTransaction: (id: string) =>
    request<Record<string, never>>(`/v1/transactions/${id}`, { method: 'DELETE' }),

  budgets: () => request<Budget[]>('/v1/budgets'),
  createBudget: (body: { categoryId: string; period: BudgetPeriod; amount: number }) =>
    request<Budget>('/v1/budgets', { method: 'POST', body }),
  closeBudget: (id: string) =>
    request<Record<string, never>>(`/v1/budgets/${id}`, { method: 'DELETE' }),

  goals: () => request<Goal[]>('/v1/goals'),
  createGoal: (body: { name: string; targetAmount: number; targetDate?: string; color?: string }) =>
    request<Goal>('/v1/goals', { method: 'POST', body }),
  contribute: (id: string, amount: number) =>
    request<Goal>(`/v1/goals/${id}/contribute`, { method: 'POST', body: { amount } }),
  deleteGoal: (id: string) => request<Record<string, never>>(`/v1/goals/${id}`, { method: 'DELETE' }),

  cashflow: (params: { days?: number; months?: number }) =>
    request<CashflowPoint[]>(`/v1/analytics/cashflow${query({ ...params })}`),
};

/**
 * Kunci cache TanStack Query.
 *
 * Terpusat karena pembatalan cache adalah tempat bug paling sunyi: kunci yang
 * ditulis ulang sedikit berbeda di dua tempat menghasilkan layar yang tidak
 * pernah menyegarkan dirinya, dan tidak ada satu pun galat yang menandainya.
 */
export const keys = {
  dashboard: ['dashboard'] as const,
  accounts: ['accounts'] as const,
  categories: ['categories'] as const,
  transactions: (params: TransactionQuery = {}) => ['transactions', params] as const,
  budgets: ['budgets'] as const,
  goals: ['goals'] as const,
  cashflow: (params: { days?: number; months?: number }) => ['cashflow', params] as const,
};
