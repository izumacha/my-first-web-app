/**
 * API通信モジュール - リトライ、エラーハンドリング、オフラインキュー
 */

import { showToast } from '../utils/dom.js';

const API_BASE = '/api';
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // 指数バックオフ

/**
 * 認証トークン管理
 */
export const Auth = {
  TOKEN_KEY: 'authToken',

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  setToken(token) {
    localStorage.setItem(this.TOKEN_KEY, token);
  },

  removeToken() {
    localStorage.removeItem(this.TOKEN_KEY);
  },

  isAuthenticated() {
    return !!this.getToken();
  },

  /**
   * 認証が必要なページでリダイレクト
   */
  requireAuth() {
    if (!this.isAuthenticated()) {
      window.location.href = '/login.html';
      return false;
    }
    return true;
  }
};

/**
 * オフライン時のリクエストキュー
 */
class OfflineQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.loadFromStorage();

    // オンライン復帰時にキューを処理
    window.addEventListener('online', () => this.processQueue());
  }

  loadFromStorage() {
    try {
      const stored = localStorage.getItem('offlineQueue');
      this.queue = stored ? JSON.parse(stored) : [];
    } catch {
      this.queue = [];
    }
  }

  saveToStorage() {
    localStorage.setItem('offlineQueue', JSON.stringify(this.queue));
  }

  add(request) {
    this.queue.push({
      ...request,
      timestamp: Date.now()
    });
    this.saveToStorage();
    showToast('オフラインです。オンライン復帰時に同期します。', 'warning');
  }

  async processQueue() {
    if (this.isProcessing || this.queue.length === 0 || !navigator.onLine) {
      return;
    }

    this.isProcessing = true;
    const failedRequests = [];

    for (const request of this.queue) {
      try {
        await fetchWithRetry(request.url, request.options, false);
      } catch {
        // 24時間以上前のリクエストは破棄
        if (Date.now() - request.timestamp < 24 * 60 * 60 * 1000) {
          failedRequests.push(request);
        }
      }
    }

    this.queue = failedRequests;
    this.saveToStorage();
    this.isProcessing = false;

    if (failedRequests.length === 0 && this.queue.length === 0) {
      showToast('オフラインデータを同期しました', 'success');
    }
  }
}

const offlineQueue = new OfflineQueue();

/**
 * リトライ付きfetch
 * @param {string} url
 * @param {RequestInit} options
 * @param {boolean} queueIfOffline
 * @returns {Promise<Response>}
 */
async function fetchWithRetry(url, options, queueIfOffline = true) {
  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // オフラインチェック
      if (!navigator.onLine) {
        if (queueIfOffline && options.method !== 'GET') {
          offlineQueue.add({ url, options });
          throw new Error('オフラインです');
        }
        throw new Error('ネットワーク接続がありません');
      }

      const response = await fetch(url, options);

      // 429 Too Many Requests - リトライ
      if (response.status === 429 && attempt < MAX_RETRIES) {
        const retryAfter = response.headers.get('Retry-After');
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : RETRY_DELAYS[attempt];
        await sleep(delay);
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;

      // ネットワークエラーの場合のみリトライ
      if (error.name === 'TypeError' && attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAYS[attempt]);
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * API リクエスト
 * @param {string} endpoint
 * @param {Object} options
 * @returns {Promise<any>}
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const token = Auth.getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers
  };

  const config = {
    ...options,
    headers
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetchWithRetry(url, config);

    // 認証エラー
    if (response.status === 401) {
      Auth.removeToken();
      window.location.href = '/login.html';
      throw new Error('セッションが期限切れです');
    }

    // エラーレスポンス
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const message = error.message || `エラーが発生しました (${response.status})`;
      throw new ApiError(message, response.status, error.details);
    }

    // 204 No Content
    if (response.status === 204) {
      return null;
    }

    return response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // ネットワークエラー
    console.error('API request failed:', error);
    throw new ApiError(error.message || 'ネットワークエラーが発生しました', 0);
  }
}

/**
 * カスタムAPIエラークラス
 */
export class ApiError extends Error {
  constructor(message, status, details = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * API クライアント
 */
export const api = {
  // 認証
  auth: {
    register: (data) => request('/auth/register', { method: 'POST', body: data }),
    login: (data) => request('/auth/login', { method: 'POST', body: data }),
    logout: () => request('/auth/logout', { method: 'POST' }),
    me: () => request('/auth/me'),
    updatePassword: (data) => request('/auth/password', { method: 'PUT', body: data }),
    updateProfile: (data) => request('/auth/profile', { method: 'PUT', body: data }),
    deleteAccount: () => request('/auth/account', { method: 'DELETE' })
  },

  // 支出
  expenses: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/expenses${query ? `?${query}` : ''}`);
    },
    create: (data) => request('/expenses', { method: 'POST', body: data }),
    update: (id, data) => request(`/expenses/${id}`, { method: 'PUT', body: data }),
    delete: (id) => request(`/expenses/${id}`, { method: 'DELETE' }),
    deleteAll: () => request('/expenses', { method: 'DELETE' }),
    bulkCreate: (data) => request('/expenses/bulk', { method: 'POST', body: data })
  },

  // 収入
  incomes: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/incomes${query ? `?${query}` : ''}`);
    },
    create: (data) => request('/incomes', { method: 'POST', body: data }),
    update: (id, data) => request(`/incomes/${id}`, { method: 'PUT', body: data }),
    delete: (id) => request(`/incomes/${id}`, { method: 'DELETE' }),
    deleteAll: () => request('/incomes', { method: 'DELETE' }),
    bulkCreate: (data) => request('/incomes/bulk', { method: 'POST', body: data })
  },

  // 予算
  budgets: {
    get: () => request('/budgets'),
    update: (data) => request('/budgets', { method: 'PUT', body: data })
  },

  // サブスクリプション
  subscriptions: {
    getAll: () => request('/subscriptions'),
    create: (data) => request('/subscriptions', { method: 'POST', body: data }),
    update: (id, data) => request(`/subscriptions/${id}`, { method: 'PUT', body: data }),
    delete: (id) => request(`/subscriptions/${id}`, { method: 'DELETE' })
  },

  // 目標
  goals: {
    getAll: () => request('/goals'),
    create: (data) => request('/goals', { method: 'POST', body: data }),
    update: (id, data) => request(`/goals/${id}`, { method: 'PUT', body: data }),
    delete: (id) => request(`/goals/${id}`, { method: 'DELETE' })
  },

  // 家族
  family: {
    getAll: () => request('/family'),
    create: (data) => request('/family', { method: 'POST', body: data }),
    update: (id, data) => request(`/family/${id}`, { method: 'PUT', body: data }),
    delete: (id) => request(`/family/${id}`, { method: 'DELETE' })
  },

  // ゲーミフィケーション
  gamification: {
    get: () => request('/gamification'),
    update: (data) => request('/gamification', { method: 'PUT', body: data })
  },

  // 連携口座
  linkedAccounts: {
    get: () => request('/linked-accounts'),
    update: (data) => request('/linked-accounts', { method: 'PUT', body: data })
  },

  // 接続アカウント
  connectedAccounts: {
    get: () => request('/connected-accounts'),
    update: (serviceId, data) => request(`/connected-accounts/${serviceId}`, { method: 'PUT', body: data })
  },

  // 同期ログ
  syncLogs: {
    get: () => request('/sync-logs'),
    add: (data) => request('/sync-logs', { method: 'POST', body: data })
  },

  // クイック入力
  quickInputs: {
    getAll: () => request('/quick-inputs'),
    create: (data) => request('/quick-inputs', { method: 'POST', body: data }),
    delete: (id) => request(`/quick-inputs/${id}`, { method: 'DELETE' })
  },

  // 全データ
  allData: {
    export: () => request('/all-data'),
    deleteAll: () => request('/all-data', { method: 'DELETE' })
  }
};

export default api;
