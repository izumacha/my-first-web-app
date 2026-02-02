/**
 * 状態管理ストア - シンプルなリアクティブステート管理
 */

import { api } from './api.js';

/**
 * ストアの作成
 * @param {Object} initialState
 * @returns {Object}
 */
function createStore(initialState) {
  let state = { ...initialState };
  const listeners = new Set();

  return {
    /**
     * 現在の状態を取得
     */
    getState() {
      return state;
    },

    /**
     * 状態を更新
     * @param {Object|Function} updates
     */
    setState(updates) {
      const newState = typeof updates === 'function'
        ? updates(state)
        : { ...state, ...updates };

      const changed = Object.keys(newState).some(
        key => newState[key] !== state[key]
      );

      if (changed) {
        state = newState;
        this.notify();
      }
    },

    /**
     * リスナーを登録
     * @param {Function} listener
     * @returns {Function} unsubscribe
     */
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    /**
     * 全リスナーに通知
     */
    notify() {
      for (const listener of listeners) {
        try {
          listener(state);
        } catch (error) {
          console.error('Store listener error:', error);
        }
      }
    }
  };
}

// ============================================
// アプリケーションストア
// ============================================

export const store = createStore({
  // ユーザー
  user: null,
  isAuthenticated: false,

  // データ
  expenses: [],
  incomes: [],
  budgets: {},
  subscriptions: [],
  goals: [],
  familyMembers: [],
  gamification: {
    level: 1,
    xp: 0,
    streak: 0,
    badges: [],
    challenges: []
  },
  linkedAccounts: {
    bank: [],
    credit: [],
    emoney: [],
    securities: [],
    points: []
  },
  quickInputs: [],

  // UI状態
  loading: false,
  error: null,
  currentTab: 'input',
  filters: {
    startDate: '',
    endDate: '',
    category: '',
    description: ''
  }
});

// ============================================
// アクション - 状態変更を行う関数群
// ============================================

export const actions = {
  /**
   * ローディング状態を設定
   */
  setLoading(loading) {
    store.setState({ loading });
  },

  /**
   * エラーを設定
   */
  setError(error) {
    store.setState({ error: error?.message || error });
  },

  /**
   * エラーをクリア
   */
  clearError() {
    store.setState({ error: null });
  },

  /**
   * タブを切り替え
   */
  setTab(tab) {
    store.setState({ currentTab: tab });
  },

  /**
   * フィルターを設定
   */
  setFilters(filters) {
    store.setState(state => ({
      filters: { ...state.filters, ...filters }
    }));
  },

  // ============================================
  // 認証アクション
  // ============================================

  /**
   * ログイン
   */
  async login(username, password) {
    this.setLoading(true);
    this.clearError();

    try {
      const { user, token } = await api.auth.login({ username, password });
      localStorage.setItem('authToken', token);
      store.setState({ user, isAuthenticated: true });
      return true;
    } catch (error) {
      this.setError(error);
      return false;
    } finally {
      this.setLoading(false);
    }
  },

  /**
   * 登録
   */
  async register(username, password, email, displayName) {
    this.setLoading(true);
    this.clearError();

    try {
      const { user, token } = await api.auth.register({
        username,
        password,
        email,
        displayName
      });
      localStorage.setItem('authToken', token);
      store.setState({ user, isAuthenticated: true });
      return true;
    } catch (error) {
      this.setError(error);
      return false;
    } finally {
      this.setLoading(false);
    }
  },

  /**
   * ログアウト
   */
  async logout() {
    try {
      await api.auth.logout();
    } catch {
      // エラーは無視
    } finally {
      localStorage.removeItem('authToken');
      store.setState({
        user: null,
        isAuthenticated: false,
        expenses: [],
        incomes: [],
        budgets: {},
        subscriptions: [],
        goals: [],
        familyMembers: [],
        quickInputs: []
      });
      window.location.href = '/login.html';
    }
  },

  /**
   * 現在のユーザー情報を取得
   */
  async fetchCurrentUser() {
    try {
      const user = await api.auth.me();
      store.setState({ user, isAuthenticated: true });
      return user;
    } catch {
      store.setState({ user: null, isAuthenticated: false });
      return null;
    }
  },

  // ============================================
  // データアクション
  // ============================================

  /**
   * 全データを同期
   */
  async syncAllData() {
    this.setLoading(true);
    this.clearError();

    try {
      const [
        expensesResult,
        incomesResult,
        budgets,
        subscriptionsResult,
        goalsResult,
        familyResult,
        gamification,
        linkedAccounts,
        quickInputsResult
      ] = await Promise.all([
        api.expenses.getAll(),
        api.incomes.getAll(),
        api.budgets.get(),
        api.subscriptions.getAll(),
        api.goals.getAll(),
        api.family.getAll(),
        api.gamification.get(),
        api.linkedAccounts.get(),
        api.quickInputs.getAll()
      ]);

      store.setState({
        expenses: expensesResult.data || [],
        incomes: incomesResult.data || [],
        budgets: budgets || {},
        subscriptions: subscriptionsResult.data || [],
        goals: goalsResult.data || [],
        familyMembers: familyResult.data || [],
        gamification: gamification || store.getState().gamification,
        linkedAccounts: linkedAccounts || store.getState().linkedAccounts,
        quickInputs: quickInputsResult.data || []
      });

      return true;
    } catch (error) {
      this.setError(error);
      return false;
    } finally {
      this.setLoading(false);
    }
  },

  // ============================================
  // 支出アクション
  // ============================================

  /**
   * 支出を追加
   */
  async addExpense(expense) {
    try {
      const created = await api.expenses.create(expense);
      store.setState(state => ({
        expenses: [created, ...state.expenses]
      }));
      return created;
    } catch (error) {
      this.setError(error);
      throw error;
    }
  },

  /**
   * 支出を更新
   */
  async updateExpense(id, expense) {
    try {
      const updated = await api.expenses.update(id, expense);
      store.setState(state => ({
        expenses: state.expenses.map(e => e.id === id ? updated : e)
      }));
      return updated;
    } catch (error) {
      this.setError(error);
      throw error;
    }
  },

  /**
   * 支出を削除
   */
  async deleteExpense(id) {
    try {
      await api.expenses.delete(id);
      store.setState(state => ({
        expenses: state.expenses.filter(e => e.id !== id)
      }));
    } catch (error) {
      this.setError(error);
      throw error;
    }
  },

  // ============================================
  // 収入アクション
  // ============================================

  async addIncome(income) {
    try {
      const created = await api.incomes.create(income);
      store.setState(state => ({
        incomes: [created, ...state.incomes]
      }));
      return created;
    } catch (error) {
      this.setError(error);
      throw error;
    }
  },

  async updateIncome(id, income) {
    try {
      const updated = await api.incomes.update(id, income);
      store.setState(state => ({
        incomes: state.incomes.map(i => i.id === id ? updated : i)
      }));
      return updated;
    } catch (error) {
      this.setError(error);
      throw error;
    }
  },

  async deleteIncome(id) {
    try {
      await api.incomes.delete(id);
      store.setState(state => ({
        incomes: state.incomes.filter(i => i.id !== id)
      }));
    } catch (error) {
      this.setError(error);
      throw error;
    }
  },

  // ============================================
  // 予算アクション
  // ============================================

  async updateBudgets(budgets) {
    try {
      await api.budgets.update(budgets);
      store.setState({ budgets });
    } catch (error) {
      this.setError(error);
      throw error;
    }
  },

  // ============================================
  // サブスクリプションアクション
  // ============================================

  async addSubscription(subscription) {
    try {
      const created = await api.subscriptions.create(subscription);
      store.setState(state => ({
        subscriptions: [created, ...state.subscriptions]
      }));
      return created;
    } catch (error) {
      this.setError(error);
      throw error;
    }
  },

  async updateSubscription(id, subscription) {
    try {
      const updated = await api.subscriptions.update(id, subscription);
      store.setState(state => ({
        subscriptions: state.subscriptions.map(s => s.id === id ? updated : s)
      }));
      return updated;
    } catch (error) {
      this.setError(error);
      throw error;
    }
  },

  async deleteSubscription(id) {
    try {
      await api.subscriptions.delete(id);
      store.setState(state => ({
        subscriptions: state.subscriptions.filter(s => s.id !== id)
      }));
    } catch (error) {
      this.setError(error);
      throw error;
    }
  },

  // ============================================
  // 目標アクション
  // ============================================

  async addGoal(goal) {
    try {
      const created = await api.goals.create(goal);
      store.setState(state => ({
        goals: [created, ...state.goals]
      }));
      return created;
    } catch (error) {
      this.setError(error);
      throw error;
    }
  },

  async updateGoal(id, goal) {
    try {
      const updated = await api.goals.update(id, goal);
      store.setState(state => ({
        goals: state.goals.map(g => g.id === id ? updated : g)
      }));
      return updated;
    } catch (error) {
      this.setError(error);
      throw error;
    }
  },

  async deleteGoal(id) {
    try {
      await api.goals.delete(id);
      store.setState(state => ({
        goals: state.goals.filter(g => g.id !== id)
      }));
    } catch (error) {
      this.setError(error);
      throw error;
    }
  },

  // ============================================
  // 家族アクション
  // ============================================

  async addFamilyMember(member) {
    try {
      const created = await api.family.create(member);
      store.setState(state => ({
        familyMembers: [created, ...state.familyMembers]
      }));
      return created;
    } catch (error) {
      this.setError(error);
      throw error;
    }
  },

  async deleteFamilyMember(id) {
    try {
      await api.family.delete(id);
      store.setState(state => ({
        familyMembers: state.familyMembers.filter(m => m.id !== id)
      }));
    } catch (error) {
      this.setError(error);
      throw error;
    }
  },

  // ============================================
  // ゲーミフィケーションアクション
  // ============================================

  async updateGamification(data) {
    try {
      await api.gamification.update(data);
      store.setState(state => ({
        gamification: { ...state.gamification, ...data }
      }));
    } catch (error) {
      this.setError(error);
      throw error;
    }
  },

  /**
   * XPを追加
   */
  async addXP(amount) {
    const state = store.getState();
    const { level, xp } = state.gamification;

    const newXP = xp + amount;
    const xpForNextLevel = level * 100;

    if (newXP >= xpForNextLevel) {
      // レベルアップ
      await this.updateGamification({
        level: level + 1,
        xp: newXP - xpForNextLevel
      });
    } else {
      await this.updateGamification({ xp: newXP });
    }
  },

  // ============================================
  // 連携口座アクション
  // ============================================

  async updateLinkedAccounts(accounts) {
    try {
      await api.linkedAccounts.update(accounts);
      store.setState({ linkedAccounts: accounts });
    } catch (error) {
      this.setError(error);
      throw error;
    }
  },

  // ============================================
  // クイック入力アクション
  // ============================================

  async addQuickInput(input) {
    try {
      const created = await api.quickInputs.create(input);
      store.setState(state => ({
        quickInputs: [created, ...state.quickInputs]
      }));
      return created;
    } catch (error) {
      this.setError(error);
      throw error;
    }
  },

  async deleteQuickInput(id) {
    try {
      await api.quickInputs.delete(id);
      store.setState(state => ({
        quickInputs: state.quickInputs.filter(q => q.id !== id)
      }));
    } catch (error) {
      this.setError(error);
      throw error;
    }
  }
};

// ============================================
// セレクター - 派生状態を計算
// ============================================

export const selectors = {
  /**
   * フィルタリングされた支出を取得
   */
  getFilteredExpenses() {
    const { expenses, filters } = store.getState();
    const { startDate, endDate, category, description } = filters;

    return expenses.filter(expense => {
      if (startDate && expense.date < startDate) return false;
      if (endDate && expense.date > endDate) return false;
      if (category && expense.category !== category) return false;
      if (description && !expense.description.includes(description)) return false;
      return true;
    });
  },

  /**
   * カテゴリ別支出合計
   */
  getExpensesByCategory() {
    const expenses = this.getFilteredExpenses();
    const result = {};

    for (const expense of expenses) {
      if (!result[expense.category]) {
        result[expense.category] = 0;
      }
      result[expense.category] += expense.amount;
    }

    return result;
  },

  /**
   * 月別支出合計
   */
  getMonthlyExpenses() {
    const { expenses } = store.getState();
    const result = {};

    for (const expense of expenses) {
      const month = expense.date.substring(0, 7);
      if (!result[month]) {
        result[month] = 0;
      }
      result[month] += expense.amount;
    }

    return result;
  },

  /**
   * 現在の月の予算 vs 実績
   */
  getBudgetComparison() {
    const { budgets } = store.getState();
    const expenses = this.getFilteredExpenses();
    const currentMonth = new Date().toISOString().substring(0, 7);
    const monthBudgets = budgets[currentMonth] || {};

    const actual = {};
    for (const expense of expenses) {
      if (expense.date.startsWith(currentMonth)) {
        if (!actual[expense.category]) {
          actual[expense.category] = 0;
        }
        actual[expense.category] += expense.amount;
      }
    }

    const result = [];
    const categories = new Set([...Object.keys(monthBudgets), ...Object.keys(actual)]);

    for (const category of categories) {
      const budget = monthBudgets[category] || 0;
      const spent = actual[category] || 0;
      result.push({
        category,
        budget,
        spent,
        remaining: budget - spent,
        percentage: budget > 0 ? Math.round((spent / budget) * 100) : 0
      });
    }

    return result;
  },

  /**
   * 総資産を計算
   */
  getTotalAssets() {
    const { linkedAccounts } = store.getState();
    let total = 0;

    // 銀行・証券・電子マネー・ポイントは資産
    for (const account of linkedAccounts.bank || []) {
      total += account.balance || 0;
    }
    for (const account of linkedAccounts.securities || []) {
      total += account.balance || 0;
    }
    for (const account of linkedAccounts.emoney || []) {
      total += account.balance || 0;
    }
    for (const account of linkedAccounts.points || []) {
      total += account.balance || 0;
    }

    // クレジットカードは負債
    for (const account of linkedAccounts.credit || []) {
      total -= account.balance || 0;
    }

    return total;
  },

  /**
   * 収支バランス
   */
  getBalance() {
    const { expenses, incomes } = store.getState();

    const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
    const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense
    };
  }
};

export default { store, actions, selectors };
