// 家計簿アプリ - メインJavaScript

// API ベースURL
const API_BASE = '/api';

// データベースAPI通信ヘルパー
const DbApi = {
    async get(endpoint) {
        try {
            const res = await fetch(`${API_BASE}${endpoint}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (err) {
            console.warn(`DB読み込み失敗 (${endpoint}):`, err.message);
            return null;
        }
    },

    async post(endpoint, data) {
        try {
            const res = await fetch(`${API_BASE}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (err) {
            console.warn(`DB書き込み失敗 (${endpoint}):`, err.message);
            return null;
        }
    },

    async put(endpoint, data) {
        try {
            const res = await fetch(`${API_BASE}${endpoint}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (err) {
            console.warn(`DB更新失敗 (${endpoint}):`, err.message);
            return null;
        }
    },

    async delete(endpoint) {
        try {
            const res = await fetch(`${API_BASE}${endpoint}`, { method: 'DELETE' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (err) {
            console.warn(`DB削除失敗 (${endpoint}):`, err.message);
            return null;
        }
    }
};

// データストレージ（localStorage キャッシュ + DB永続化）
const Storage = {
    KEYS: {
        EXPENSES: 'household_expenses',
        BUDGETS: 'household_budgets',
        LINKED_ACCOUNTS: 'household_linked_accounts',
        API_CONFIGS: 'household_api_configs',
        SYNC_LOGS: 'household_sync_logs',
        CUSTOM_APIS: 'household_custom_apis',
        INCOMES: 'household_incomes',
        SUBSCRIPTIONS: 'household_subscriptions',
        GOALS: 'household_goals',
        FAMILY_MEMBERS: 'household_family_members',
        GAMIFICATION: 'household_gamification',
        QUICK_INPUTS: 'household_quick_inputs'
    },

    // localStorageキャッシュ操作
    get(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    },

    set(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    },

    // --- 支出 ---
    getExpenses() {
        return this.get(this.KEYS.EXPENSES) || [];
    },
    saveExpenses(expenses) {
        this.set(this.KEYS.EXPENSES, expenses);
        DbApi.put('/expenses', expenses).catch(() => {});
    },

    // --- 予算 ---
    getBudgets() {
        return this.get(this.KEYS.BUDGETS) || {};
    },
    saveBudgets(budgets) {
        this.set(this.KEYS.BUDGETS, budgets);
        DbApi.put('/budgets', budgets).catch(() => {});
    },

    // --- 連携口座 ---
    getLinkedAccounts() {
        return this.get(this.KEYS.LINKED_ACCOUNTS) || {
            bank: [], securities: [], credit: [], emoney: [], qr: [], points: [], ec: []
        };
    },
    saveLinkedAccounts(accounts) {
        this.set(this.KEYS.LINKED_ACCOUNTS, accounts);
        DbApi.put('/linked-accounts', accounts).catch(() => {});
    },

    // --- アカウント連携設定 ---
    getApiConfigs() {
        return this.get(this.KEYS.API_CONFIGS) || {};
    },
    saveApiConfigs(configs) {
        this.set(this.KEYS.API_CONFIGS, configs);
        DbApi.put('/connected-accounts', configs).catch(() => {});
    },

    // --- 同期ログ ---
    getSyncLogs() {
        return this.get(this.KEYS.SYNC_LOGS) || [];
    },
    saveSyncLogs(logs) {
        const trimmedLogs = logs.slice(-100);
        this.set(this.KEYS.SYNC_LOGS, trimmedLogs);
        DbApi.put('/sync-logs', trimmedLogs).catch(() => {});
    },

    // --- カスタムAPI ---
    getCustomApis() {
        return this.get(this.KEYS.CUSTOM_APIS) || [];
    },
    saveCustomApis(apis) {
        this.set(this.KEYS.CUSTOM_APIS, apis);
    },

    // --- 収入 ---
    getIncomes() {
        return this.get(this.KEYS.INCOMES) || [];
    },
    saveIncomes(incomes) {
        this.set(this.KEYS.INCOMES, incomes);
        DbApi.put('/incomes', incomes).catch(() => {});
    },

    // --- 定期支出 ---
    getSubscriptions() {
        return this.get(this.KEYS.SUBSCRIPTIONS) || [];
    },
    saveSubscriptions(subscriptions) {
        this.set(this.KEYS.SUBSCRIPTIONS, subscriptions);
        DbApi.put('/subscriptions', subscriptions).catch(() => {});
    },

    // --- 目標 ---
    getGoals() {
        return this.get(this.KEYS.GOALS) || [];
    },
    saveGoals(goals) {
        this.set(this.KEYS.GOALS, goals);
        DbApi.put('/goals', goals).catch(() => {});
    },

    // --- 家族メンバー ---
    getFamilyMembers() {
        return this.get(this.KEYS.FAMILY_MEMBERS) || [];
    },
    saveFamilyMembers(members) {
        this.set(this.KEYS.FAMILY_MEMBERS, members);
        DbApi.put('/family', members).catch(() => {});
    },

    // --- ゲーミフィケーション ---
    getGamification() {
        return this.get(this.KEYS.GAMIFICATION) || {
            level: 1, exp: 0, currentStreak: 0, maxStreak: 0,
            lastRecordDate: null, badges: [], challenges: []
        };
    },
    saveGamification(data) {
        this.set(this.KEYS.GAMIFICATION, data);
        DbApi.put('/gamification', data).catch(() => {});
    },

    // --- クイック入力 ---
    getQuickInputs() {
        return this.get(this.KEYS.QUICK_INPUTS) || [];
    },
    saveQuickInputs(inputs) {
        this.set(this.KEYS.QUICK_INPUTS, inputs);
        DbApi.put('/quick-inputs', inputs).catch(() => {});
    },

    // --- DBからlocalStorageへ同期 ---
    async syncFromDatabase() {
        try {
            const data = await DbApi.get('/all-data');
            if (!data) return false;

            if (data.expenses && data.expenses.length > 0) this.set(this.KEYS.EXPENSES, data.expenses);
            if (data.incomes && data.incomes.length > 0) this.set(this.KEYS.INCOMES, data.incomes);
            if (data.budgets && Object.keys(data.budgets).length > 0) this.set(this.KEYS.BUDGETS, data.budgets);
            if (data.subscriptions && data.subscriptions.length > 0) this.set(this.KEYS.SUBSCRIPTIONS, data.subscriptions);
            if (data.goals && data.goals.length > 0) this.set(this.KEYS.GOALS, data.goals);
            if (data.familyMembers && data.familyMembers.length > 0) this.set(this.KEYS.FAMILY_MEMBERS, data.familyMembers);
            if (data.gamification) this.set(this.KEYS.GAMIFICATION, data.gamification);
            if (data.linkedAccounts) this.set(this.KEYS.LINKED_ACCOUNTS, data.linkedAccounts);
            if (data.connectedAccounts && Object.keys(data.connectedAccounts).length > 0) this.set(this.KEYS.API_CONFIGS, data.connectedAccounts);
            if (data.syncLogs && data.syncLogs.length > 0) this.set(this.KEYS.SYNC_LOGS, data.syncLogs);
            if (data.quickInputs && data.quickInputs.length > 0) this.set(this.KEYS.QUICK_INPUTS, data.quickInputs);

            console.log('データベースから同期完了');
            return true;
        } catch (err) {
            console.warn('データベース同期失敗（localStorageで動作）:', err.message);
            return false;
        }
    },

    // --- localStorageからDBへ初回移行 ---
    async migrateToDatabase() {
        try {
            const expenses = this.getExpenses();
            const incomes = this.getIncomes();
            const budgets = this.getBudgets();
            const subscriptions = this.getSubscriptions();
            const goals = this.getGoals();
            const familyMembers = this.getFamilyMembers();
            const gamification = this.getGamification();
            const linkedAccounts = this.getLinkedAccounts();
            const connectedAccounts = this.getApiConfigs();
            const syncLogs = this.getSyncLogs();
            const quickInputs = this.getQuickInputs();

            if (expenses.length > 0) await DbApi.post('/expenses/bulk', expenses);
            if (incomes.length > 0) await DbApi.post('/incomes/bulk', incomes);
            if (Object.keys(budgets).length > 0) await DbApi.put('/budgets', budgets);
            if (subscriptions.length > 0) await DbApi.post('/subscriptions/bulk', subscriptions);
            if (goals.length > 0) await DbApi.post('/goals/bulk', goals);
            if (familyMembers.length > 0) await DbApi.post('/family/bulk', familyMembers);
            await DbApi.put('/gamification', gamification);
            await DbApi.put('/linked-accounts', linkedAccounts);
            if (Object.keys(connectedAccounts).length > 0) await DbApi.put('/connected-accounts', connectedAccounts);
            if (syncLogs.length > 0) await DbApi.put('/sync-logs', syncLogs);
            if (quickInputs.length > 0) await DbApi.post('/quick-inputs/bulk', quickInputs);

            localStorage.setItem('db_migrated', 'true');
            console.log('localStorageからデータベースへの移行完了');
            return true;
        } catch (err) {
            console.warn('データベース移行失敗:', err.message);
            return false;
        }
    }
};

// カテゴリ一覧
const CATEGORIES = ['食費', '日用品', '交通費', '光熱費', '通信費', '住居費', '医療費', '娯楽費', '衣服費', '教育費', 'その他'];

// カテゴリ色
const CATEGORY_COLORS = {
    '食費': '#FF6384',
    '日用品': '#36A2EB',
    '交通費': '#FFCE56',
    '光熱費': '#4BC0C0',
    '通信費': '#9966FF',
    '住居費': '#FF9F40',
    '医療費': '#FF6384',
    '娯楽費': '#C9CBCF',
    '衣服費': '#7BC8A4',
    '教育費': '#E7E9ED',
    'その他': '#8B8B8B'
};

// グローバル状態
let expenses = [];
let budgets = {};
let linkedAccounts = {};
let currentCalendarDate = new Date();
let charts = {};
let incomes = [];
let subscriptions = [];
let goals = [];
let familyMembers = [];
let gamificationData = {};
let quickInputs = [];

// localStorageキャッシュからデータを読み込み
function loadDataFromCache() {
    expenses = Storage.getExpenses();
    budgets = Storage.getBudgets();
    linkedAccounts = Storage.getLinkedAccounts();
    incomes = Storage.getIncomes();
    subscriptions = Storage.getSubscriptions();
    goals = Storage.getGoals();
    familyMembers = Storage.getFamilyMembers();
    gamificationData = Storage.getGamification();
    quickInputs = Storage.getQuickInputs();
}

// 画面を再描画
function refreshUI() {
    renderExpenseTable();
    updateBudgetComparison();
    checkStreak();
}

// 初期化
document.addEventListener('DOMContentLoaded', async () => {
    // まずlocalStorageからデータを即時読み込み（高速）
    loadDataFromCache();

    // 各機能の初期化
    initTabs();
    initExpenseForm();
    initReceiptOCR();
    initFilter();
    initBudget();
    initCalendar();
    initLinkedAccounts();
    initEditModal();
    initIncome();
    initSubscription();
    initGoals();
    initReport();
    initDataManagement();
    initFamily();
    initGamification();
    initAccountLinking();

    // 今日の日付をデフォルトに設定
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('expenseDate').value = today;
    if (document.getElementById('incomeDate')) {
        document.getElementById('incomeDate').value = today;
    }

    // 今月をデフォルトに設定
    const thisMonth = new Date().toISOString().slice(0, 7);
    document.getElementById('budgetMonth').value = thisMonth;
    document.getElementById('chartMonth').value = thisMonth;

    // 初期表示
    refreshUI();

    // データベースとの同期（非同期）
    try {
        const isMigrated = localStorage.getItem('db_migrated');
        if (!isMigrated) {
            // 初回起動：localStorageのデータをDBへ移行
            await Storage.migrateToDatabase();
        }
        // DBからデータを同期
        const synced = await Storage.syncFromDatabase();
        if (synced) {
            // DB同期後にデータを再読み込みして画面更新
            loadDataFromCache();
            refreshUI();
        }
    } catch (err) {
        console.warn('DB同期スキップ（ローカルモードで動作）:', err.message);
    }
});

// タブ切り替え
function initTabs() {
    const navBtns = document.querySelectorAll('.nav-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;

            navBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(t => t.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(tabId).classList.add('active');

            // タブ切り替え時の更新
            if (tabId === 'list') {
                renderExpenseTable();
            } else if (tabId === 'budget') {
                loadBudgetValues();
                updateBudgetComparison();
            } else if (tabId === 'chart') {
                renderCharts();
            } else if (tabId === 'calendar') {
                renderCalendar();
            } else if (tabId === 'link') {
                renderLinkedAccounts();
                updateAssetSummary();
            } else if (tabId === 'income') {
                renderIncomeTable();
                updateBalanceSummary();
            } else if (tabId === 'subscription') {
                renderSubscriptions();
            } else if (tabId === 'goals') {
                renderGoals();
            } else if (tabId === 'report') {
                generateReport();
            } else if (tabId === 'family') {
                renderFamilyMembers();
            } else if (tabId === 'gamification') {
                renderGamification();
            }
        });
    });
}

// 支出入力フォーム
function initExpenseForm() {
    const form = document.getElementById('expenseForm');
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const expense = {
            id: Date.now(),
            date: document.getElementById('expenseDate').value,
            description: document.getElementById('expenseDescription').value,
            amount: parseInt(document.getElementById('expenseAmount').value),
            category: document.getElementById('expenseCategory').value
        };

        expenses.push(expense);
        Storage.saveExpenses(expenses);

        // フォームリセット
        form.reset();
        document.getElementById('expenseDate').value = new Date().toISOString().split('T')[0];

        alert('支出を登録しました');
    });
}

// レシートOCR
function initReceiptOCR() {
    const receiptInput = document.getElementById('receiptInput');
    const ocrStatus = document.getElementById('ocrStatus');
    const receiptPreview = document.getElementById('receiptPreview');

    receiptInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // プレビュー表示
        const reader = new FileReader();
        reader.onload = (event) => {
            receiptPreview.innerHTML = `<img src="${event.target.result}" alt="レシートプレビュー">`;
        };
        reader.readAsDataURL(file);

        // OCR処理
        ocrStatus.textContent = 'レシートを読み取り中...';
        ocrStatus.className = 'ocr-status processing';

        try {
            const result = await Tesseract.recognize(file, 'jpn', {
                logger: (m) => {
                    if (m.status === 'recognizing text') {
                        ocrStatus.textContent = `読み取り中... ${Math.round(m.progress * 100)}%`;
                    }
                }
            });

            const text = result.data.text;
            ocrStatus.textContent = '読み取り完了！';
            ocrStatus.className = 'ocr-status success';

            // テキストから金額を抽出
            const extractedData = parseReceiptText(text);

            // フォームに自動入力
            if (extractedData.amount) {
                document.getElementById('expenseAmount').value = extractedData.amount;
            }
            if (extractedData.date) {
                document.getElementById('expenseDate').value = extractedData.date;
            }
            if (extractedData.description) {
                document.getElementById('expenseDescription').value = extractedData.description;
            }

            // カテゴリ推測
            const guessedCategory = guessCategory(text);
            if (guessedCategory) {
                document.getElementById('expenseCategory').value = guessedCategory;
            }

        } catch (error) {
            ocrStatus.textContent = '読み取りに失敗しました。手動で入力してください。';
            ocrStatus.className = 'ocr-status error';
            console.error('OCR Error:', error);
        }
    });
}

// レシートテキストから情報を抽出
function parseReceiptText(text) {
    const result = {
        amount: null,
        date: null,
        description: null
    };

    // 合計金額を抽出（「合計」「計」「TOTAL」の後の数字）
    const totalPatterns = [
        /合計[:\s]*[¥￥]?[\s]*([0-9,]+)/i,
        /計[:\s]*[¥￥]?[\s]*([0-9,]+)/i,
        /TOTAL[:\s]*[¥￥]?[\s]*([0-9,]+)/i,
        /[¥￥][\s]*([0-9,]+)/
    ];

    for (const pattern of totalPatterns) {
        const match = text.match(pattern);
        if (match) {
            result.amount = parseInt(match[1].replace(/,/g, ''));
            break;
        }
    }

    // 日付を抽出
    const datePatterns = [
        /(\d{4})[年\/\-](\d{1,2})[月\/\-](\d{1,2})/,
        /(\d{2})[年\/\-](\d{1,2})[月\/\-](\d{1,2})/
    ];

    for (const pattern of datePatterns) {
        const match = text.match(pattern);
        if (match) {
            let year = match[1];
            if (year.length === 2) {
                year = '20' + year;
            }
            const month = match[2].padStart(2, '0');
            const day = match[3].padStart(2, '0');
            result.date = `${year}-${month}-${day}`;
            break;
        }
    }

    // 店舗名（1行目または最初の文字列）
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length > 0) {
        result.description = lines[0].trim().substring(0, 50);
    }

    return result;
}

// カテゴリ推測
function guessCategory(text) {
    const keywords = {
        '食費': ['スーパー', 'コンビニ', 'レストラン', '食品', '弁当', 'カフェ', '飲食', 'ラーメン', '寿司', '焼肉', 'マクドナルド', 'ファミリーマート', 'セブンイレブン', 'ローソン'],
        '日用品': ['ドラッグストア', '薬局', '日用品', '洗剤', 'シャンプー', '100均', 'ダイソー', 'セリア'],
        '交通費': ['駅', '電車', 'バス', 'タクシー', 'ガソリン', '駐車場', 'JR', '鉄道'],
        '光熱費': ['電気', 'ガス', '水道', '電力', 'エネルギー'],
        '通信費': ['携帯', '電話', 'インターネット', 'プロバイダ', 'ドコモ', 'au', 'ソフトバンク'],
        '医療費': ['病院', 'クリニック', '薬局', '調剤', '医療'],
        '娯楽費': ['映画', 'カラオケ', 'ゲーム', '遊園地', 'スポーツ', 'ジム'],
        '衣服費': ['服', 'アパレル', 'ユニクロ', 'GU', 'ZARA', 'H&M', '靴'],
        '教育費': ['書籍', '本', '教材', '学校', '塾', '講座']
    };

    const lowerText = text.toLowerCase();

    for (const [category, words] of Object.entries(keywords)) {
        for (const word of words) {
            if (lowerText.includes(word.toLowerCase())) {
                return category;
            }
        }
    }

    return 'その他';
}

// フィルター機能
function initFilter() {
    document.getElementById('applyFilter').addEventListener('click', () => {
        renderExpenseTable();
    });

    document.getElementById('clearFilter').addEventListener('click', () => {
        document.getElementById('filterStartDate').value = '';
        document.getElementById('filterEndDate').value = '';
        document.getElementById('filterCategory').value = '';
        document.getElementById('filterDescription').value = '';
        renderExpenseTable();
    });
}

// 支出テーブルの表示
function renderExpenseTable() {
    const filtered = getFilteredExpenses();
    const tbody = document.getElementById('expenseTableBody');

    // 日付で降順ソート
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    tbody.innerHTML = filtered.map(expense => `
        <tr>
            <td>${expense.date}</td>
            <td>${escapeHtml(expense.description)}</td>
            <td>¥${expense.amount.toLocaleString()}</td>
            <td>${expense.category}</td>
            <td>
                <button class="btn-edit" onclick="openEditModal(${expense.id})">編集</button>
                <button class="btn-delete" onclick="deleteExpense(${expense.id})">削除</button>
            </td>
        </tr>
    `).join('');

    // 合計計算
    const total = filtered.reduce((sum, e) => sum + e.amount, 0);
    document.getElementById('filteredTotal').textContent = `¥${total.toLocaleString()}`;

    // カテゴリ別集計
    renderCategorySummary(filtered);
}

// HTMLエスケープ
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// フィルター適用
function getFilteredExpenses() {
    const startDate = document.getElementById('filterStartDate').value;
    const endDate = document.getElementById('filterEndDate').value;
    const category = document.getElementById('filterCategory').value;
    const description = document.getElementById('filterDescription').value.toLowerCase();

    return expenses.filter(expense => {
        if (startDate && expense.date < startDate) return false;
        if (endDate && expense.date > endDate) return false;
        if (category && expense.category !== category) return false;
        if (description && !expense.description.toLowerCase().includes(description)) return false;
        return true;
    });
}

// カテゴリ別集計表示
function renderCategorySummary(filteredExpenses) {
    const summary = {};
    CATEGORIES.forEach(cat => summary[cat] = 0);

    filteredExpenses.forEach(expense => {
        summary[expense.category] = (summary[expense.category] || 0) + expense.amount;
    });

    const container = document.getElementById('categorySummary');
    container.innerHTML = CATEGORIES
        .filter(cat => summary[cat] > 0)
        .map(cat => `
            <div class="category-summary-item">
                <span class="category-name">${cat}</span>
                <span class="category-amount">¥${summary[cat].toLocaleString()}</span>
            </div>
        `).join('');
}

// 支出削除
function deleteExpense(id) {
    if (confirm('この支出を削除しますか？')) {
        expenses = expenses.filter(e => e.id !== id);
        Storage.saveExpenses(expenses);
        renderExpenseTable();
    }
}

// 編集モーダル
function initEditModal() {
    const modal = document.getElementById('editModal');
    const closeBtn = modal.querySelector('.close-modal');
    const form = document.getElementById('editForm');

    closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = parseInt(document.getElementById('editId').value);
        const index = expenses.findIndex(e => e.id === id);

        if (index !== -1) {
            expenses[index] = {
                ...expenses[index],
                date: document.getElementById('editDate').value,
                description: document.getElementById('editDescription').value,
                amount: parseInt(document.getElementById('editAmount').value),
                category: document.getElementById('editCategory').value
            };

            Storage.saveExpenses(expenses);
            modal.classList.remove('active');
            renderExpenseTable();
            alert('支出を更新しました');
        }
    });
}

function openEditModal(id) {
    const expense = expenses.find(e => e.id === id);
    if (!expense) return;

    document.getElementById('editId').value = expense.id;
    document.getElementById('editDate').value = expense.date;
    document.getElementById('editDescription').value = expense.description;
    document.getElementById('editAmount').value = expense.amount;
    document.getElementById('editCategory').value = expense.category;

    document.getElementById('editModal').classList.add('active');
}

// 予算管理
function initBudget() {
    const monthInput = document.getElementById('budgetMonth');
    monthInput.addEventListener('change', () => {
        loadBudgetValues();
        updateBudgetComparison();
    });

    document.getElementById('saveBudget').addEventListener('click', () => {
        saveBudgetValues();
        updateBudgetComparison();
        alert('予算を保存しました');
    });
}

function loadBudgetValues() {
    const month = document.getElementById('budgetMonth').value;
    const monthBudget = budgets[month] || {};

    document.querySelectorAll('.budget-input').forEach(input => {
        const category = input.dataset.category;
        input.value = monthBudget[category] || '';
    });
}

function saveBudgetValues() {
    const month = document.getElementById('budgetMonth').value;
    if (!month) {
        alert('対象月を選択してください');
        return;
    }

    const monthBudget = {};
    document.querySelectorAll('.budget-input').forEach(input => {
        const category = input.dataset.category;
        const value = parseInt(input.value) || 0;
        if (value > 0) {
            monthBudget[category] = value;
        }
    });

    budgets[month] = monthBudget;
    Storage.saveBudgets(budgets);
}

function updateBudgetComparison() {
    const month = document.getElementById('budgetMonth').value;
    if (!month) return;

    const monthBudget = budgets[month] || {};
    const monthExpenses = expenses.filter(e => e.date.startsWith(month));

    // カテゴリ別実績
    const actuals = {};
    CATEGORIES.forEach(cat => actuals[cat] = 0);
    monthExpenses.forEach(e => {
        actuals[e.category] = (actuals[e.category] || 0) + e.amount;
    });

    const tbody = document.getElementById('budgetComparisonBody');
    tbody.innerHTML = CATEGORIES.map(category => {
        const budget = monthBudget[category] || 0;
        const actual = actuals[category] || 0;
        const diff = budget - actual;
        const rate = budget > 0 ? Math.round((actual / budget) * 100) : 0;
        const isOverBudget = diff < 0;

        return `
            <tr class="${isOverBudget ? 'over-budget' : ''}">
                <td>${category}</td>
                <td>¥${budget.toLocaleString()}</td>
                <td>¥${actual.toLocaleString()}</td>
                <td class="${diff >= 0 ? 'positive' : 'negative'}">¥${diff.toLocaleString()}</td>
                <td>${budget > 0 ? rate + '%' : '-'}</td>
            </tr>
        `;
    }).join('');
}

// チャート
function renderCharts() {
    const month = document.getElementById('chartMonth').value;
    if (!month) return;

    const monthBudget = budgets[month] || {};
    const monthExpenses = expenses.filter(e => e.date.startsWith(month));

    // カテゴリ別実績
    const actuals = {};
    CATEGORIES.forEach(cat => actuals[cat] = 0);
    monthExpenses.forEach(e => {
        actuals[e.category] = (actuals[e.category] || 0) + e.amount;
    });

    // 既存チャートの破棄
    Object.values(charts).forEach(chart => chart.destroy());
    charts = {};

    // 予算 vs 実績 棒グラフ
    const budgetVsActualCtx = document.getElementById('budgetVsActualChart').getContext('2d');
    charts.budgetVsActual = new Chart(budgetVsActualCtx, {
        type: 'bar',
        data: {
            labels: CATEGORIES,
            datasets: [
                {
                    label: '予算',
                    data: CATEGORIES.map(cat => monthBudget[cat] || 0),
                    backgroundColor: 'rgba(102, 126, 234, 0.6)',
                    borderColor: 'rgba(102, 126, 234, 1)',
                    borderWidth: 1
                },
                {
                    label: '実績',
                    data: CATEGORIES.map(cat => actuals[cat] || 0),
                    backgroundColor: 'rgba(118, 75, 162, 0.6)',
                    borderColor: 'rgba(118, 75, 162, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => '¥' + value.toLocaleString()
                    }
                }
            }
        }
    });

    // カテゴリ別円グラフ
    const categoriesWithData = CATEGORIES.filter(cat => actuals[cat] > 0);
    const categoryPieCtx = document.getElementById('categoryPieChart').getContext('2d');
    charts.categoryPie = new Chart(categoryPieCtx, {
        type: 'doughnut',
        data: {
            labels: categoriesWithData,
            datasets: [{
                data: categoriesWithData.map(cat => actuals[cat]),
                backgroundColor: categoriesWithData.map(cat => CATEGORY_COLORS[cat]),
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${context.label}: ¥${value.toLocaleString()} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });

    // 差額グラフ
    const differences = CATEGORIES.map(cat => (monthBudget[cat] || 0) - (actuals[cat] || 0));
    const differenceCtx = document.getElementById('differenceChart').getContext('2d');
    charts.difference = new Chart(differenceCtx, {
        type: 'bar',
        data: {
            labels: CATEGORIES,
            datasets: [{
                label: '差額（予算 - 実績）',
                data: differences,
                backgroundColor: differences.map(d => d >= 0 ? 'rgba(40, 167, 69, 0.6)' : 'rgba(220, 53, 69, 0.6)'),
                borderColor: differences.map(d => d >= 0 ? 'rgba(40, 167, 69, 1)' : 'rgba(220, 53, 69, 1)'),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    ticks: {
                        callback: value => '¥' + value.toLocaleString()
                    }
                }
            }
        }
    });

    // 月の変更時にチャートを再描画
    document.getElementById('chartMonth').addEventListener('change', renderCharts);
}

// カレンダー
function initCalendar() {
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
        renderCalendar();
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
        renderCalendar();
    });
}

function renderCalendar() {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    // タイトル更新
    document.getElementById('calendarMonth').textContent = `${year}年${month + 1}月`;

    // 月初と月末
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // 今日
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

    // 日付ごとの支出集計
    const dailyExpenses = {};
    expenses.forEach(expense => {
        if (expense.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)) {
            if (!dailyExpenses[expense.date]) {
                dailyExpenses[expense.date] = { total: 0, items: [] };
            }
            dailyExpenses[expense.date].total += expense.amount;
            dailyExpenses[expense.date].items.push(expense);
        }
    });

    // カレンダー生成
    const container = document.getElementById('calendarDays');
    container.innerHTML = '';

    // 空白セル（月初の曜日まで）
    for (let i = 0; i < firstDay.getDay(); i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day empty';
        container.appendChild(emptyCell);
    }

    // 日付セル
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayData = dailyExpenses[dateStr];

        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';

        if (isCurrentMonth && day === today.getDate()) {
            dayCell.classList.add('today');
        }

        if (dayData) {
            dayCell.classList.add('has-expense');
        }

        dayCell.innerHTML = `
            <div class="day-number">${day}</div>
            ${dayData ? `<div class="day-amount">¥${dayData.total.toLocaleString()}</div>` : ''}
        `;

        dayCell.addEventListener('click', () => showDayDetail(dateStr, dayData));
        container.appendChild(dayCell);
    }
}

function showDayDetail(dateStr, dayData) {
    const detailDiv = document.getElementById('dayDetail');
    const titleDiv = document.getElementById('dayDetailTitle');
    const contentDiv = document.getElementById('dayDetailContent');

    titleDiv.textContent = dateStr;

    if (!dayData || dayData.items.length === 0) {
        contentDiv.innerHTML = '<p>この日の支出はありません</p>';
    } else {
        contentDiv.innerHTML = dayData.items.map(item => `
            <div class="day-detail-item">
                <span>${escapeHtml(item.description)} (${item.category})</span>
                <span>¥${item.amount.toLocaleString()}</span>
            </div>
        `).join('') + `
            <div class="day-detail-item" style="font-weight: bold; border-top: 2px solid #667eea; margin-top: 10px; padding-top: 15px;">
                <span>合計</span>
                <span>¥${dayData.total.toLocaleString()}</span>
            </div>
        `;
    }

    detailDiv.classList.add('active');
}

// 外部連携
function initLinkedAccounts() {
    // 口座追加ボタン
    document.querySelectorAll('.add-account-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            addAccountRow(type);
        });
    });

    // 削除ボタン（イベント委譲）
    document.querySelectorAll('.service-accounts').forEach(container => {
        container.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-account')) {
                e.target.closest('.account-item').remove();
            }
        });
    });

    // 保存ボタン
    document.getElementById('saveLinkedAccounts').addEventListener('click', () => {
        saveAllLinkedAccounts();
        updateAssetSummary();
        alert('連携情報を保存しました');
    });

    // 初期表示
    renderLinkedAccounts();
}

function addAccountRow(type) {
    const containerIds = {
        bank: 'bankAccounts',
        securities: 'securitiesAccounts',
        credit: 'creditCards',
        emoney: 'eMoney',
        qr: 'qrPayments',
        points: 'points',
        ec: 'ecSites'
    };

    const placeholders = {
        bank: ['口座名（例：〇〇銀行）', '残高'],
        securities: ['口座名（例：〇〇証券）', '評価額'],
        credit: ['カード名', '利用額'],
        emoney: ['名称（例：Suica）', '残高'],
        qr: ['名称（例：PayPay）', '残高'],
        points: ['名称（例：楽天ポイント）', 'ポイント数'],
        ec: ['名称（例：Amazonギフト券）', '残高']
    };

    const container = document.getElementById(containerIds[type]);
    const newRow = document.createElement('div');
    newRow.className = 'account-item';
    newRow.innerHTML = `
        <input type="text" placeholder="${placeholders[type][0]}" class="account-name">
        <input type="number" placeholder="${placeholders[type][1]}" class="account-balance">
        <button class="remove-account">×</button>
    `;

    container.appendChild(newRow);
}

function renderLinkedAccounts() {
    const accounts = Storage.getLinkedAccounts();

    const containerIds = {
        bank: 'bankAccounts',
        securities: 'securitiesAccounts',
        credit: 'creditCards',
        emoney: 'eMoney',
        qr: 'qrPayments',
        points: 'points',
        ec: 'ecSites'
    };

    const placeholders = {
        bank: ['口座名（例：〇〇銀行）', '残高'],
        securities: ['口座名（例：〇〇証券）', '評価額'],
        credit: ['カード名', '利用額'],
        emoney: ['名称（例：Suica）', '残高'],
        qr: ['名称（例：PayPay）', '残高'],
        points: ['名称（例：楽天ポイント）', 'ポイント数'],
        ec: ['名称（例：Amazonギフト券）', '残高']
    };

    Object.keys(containerIds).forEach(type => {
        const container = document.getElementById(containerIds[type]);
        const typeAccounts = accounts[type] || [];

        if (typeAccounts.length === 0) {
            // デフォルトの空行を表示
            container.innerHTML = `
                <div class="account-item">
                    <input type="text" placeholder="${placeholders[type][0]}" class="account-name">
                    <input type="number" placeholder="${placeholders[type][1]}" class="account-balance">
                    <button class="remove-account">×</button>
                </div>
            `;
        } else {
            container.innerHTML = typeAccounts.map(account => `
                <div class="account-item">
                    <input type="text" placeholder="${placeholders[type][0]}" class="account-name" value="${escapeHtml(account.name)}">
                    <input type="number" placeholder="${placeholders[type][1]}" class="account-balance" value="${account.balance}">
                    <button class="remove-account">×</button>
                </div>
            `).join('');
        }
    });
}

function saveAllLinkedAccounts() {
    const containerIds = {
        bank: 'bankAccounts',
        securities: 'securitiesAccounts',
        credit: 'creditCards',
        emoney: 'eMoney',
        qr: 'qrPayments',
        points: 'points',
        ec: 'ecSites'
    };

    const newAccounts = {};

    Object.keys(containerIds).forEach(type => {
        const container = document.getElementById(containerIds[type]);
        const rows = container.querySelectorAll('.account-item');
        newAccounts[type] = [];

        rows.forEach(row => {
            const name = row.querySelector('.account-name').value.trim();
            const balance = parseInt(row.querySelector('.account-balance').value) || 0;

            if (name) {
                newAccounts[type].push({ name, balance });
            }
        });
    });

    linkedAccounts = newAccounts;
    Storage.saveLinkedAccounts(linkedAccounts);
}

function updateAssetSummary() {
    const accounts = Storage.getLinkedAccounts();
    const container = document.getElementById('assetSummaryContent');

    const typeLabels = {
        bank: '銀行口座',
        securities: '証券口座',
        credit: 'クレジットカード',
        emoney: '電子マネー',
        qr: 'コード決済',
        points: 'ポイント',
        ec: 'ECサイト残高'
    };

    let totalAssets = 0;
    let html = '';

    Object.keys(accounts).forEach(type => {
        accounts[type].forEach(account => {
            if (account.name && account.balance) {
                // クレジットカードは負債なので引く
                if (type === 'credit') {
                    totalAssets -= account.balance;
                } else {
                    totalAssets += account.balance;
                }

                html += `
                    <div class="asset-item">
                        <div class="asset-type">${typeLabels[type]}</div>
                        <div class="asset-name">${escapeHtml(account.name)}</div>
                        <div class="asset-value ${type === 'credit' ? 'negative' : ''}">
                            ${type === 'credit' ? '-' : ''}¥${account.balance.toLocaleString()}
                        </div>
                    </div>
                `;
            }
        });
    });

    container.innerHTML = html || '<p>登録された資産がありません</p>';
    document.getElementById('totalAssets').textContent = `¥${totalAssets.toLocaleString()}`;
    document.getElementById('totalAssets').className = totalAssets >= 0 ? 'total-value' : 'total-value negative';
}

// ========================================
// アカウント連携機能
// ========================================

// 連携アカウント設定
let connectedAccounts = {};

// サービス情報マスタ
const SERVICE_INFO = {
    // 銀行
    'mufg': { name: '三菱UFJ銀行', icon: '🏦', category: 'bank' },
    'smbc': { name: '三井住友銀行', icon: '🏦', category: 'bank' },
    'mizuho': { name: 'みずほ銀行', icon: '🏦', category: 'bank' },
    'rakuten-bank': { name: '楽天銀行', icon: '🏦', category: 'bank' },
    'yucho': { name: 'ゆうちょ銀行', icon: '🏦', category: 'bank' },
    // クレジットカード
    'rakuten-card': { name: '楽天カード', icon: '💳', category: 'credit' },
    'aeon-card': { name: 'イオンカード', icon: '💳', category: 'credit' },
    'mitsui-sumitomo-card': { name: '三井住友カード', icon: '💳', category: 'credit' },
    'jcb': { name: 'JCBカード', icon: '💳', category: 'credit' },
    // 証券
    'sbi': { name: 'SBI証券', icon: '📈', category: 'securities' },
    'rakuten-sec': { name: '楽天証券', icon: '📈', category: 'securities' },
    'monex': { name: 'マネックス証券', icon: '📈', category: 'securities' },
    // 電子マネー・コード決済
    'paypay': { name: 'PayPay', icon: '📱', category: 'qr' },
    'linepay': { name: 'LINE Pay', icon: '📱', category: 'qr' },
    'suica': { name: 'モバイルSuica', icon: '🚃', category: 'emoney' },
    'nanaco': { name: 'nanaco', icon: '💳', category: 'emoney' },
    'waon': { name: 'WAON', icon: '💳', category: 'emoney' },
    // ポイント
    'rakuten-point': { name: '楽天ポイント', icon: '🎁', category: 'points' },
    'tpoint': { name: 'Tポイント', icon: '🎁', category: 'points' },
    'dpoint': { name: 'dポイント', icon: '🎁', category: 'points' },
    'ponta': { name: 'Pontaポイント', icon: '🎁', category: 'points' },
    // ECサイト
    'amazon': { name: 'Amazon', icon: '🛒', category: 'ec' },
    'rakuten-ichiba': { name: '楽天市場', icon: '🛒', category: 'ec' }
};

// アカウント連携の初期化
function initAccountLinking() {
    // 連携アカウントを読み込み
    connectedAccounts = Storage.getApiConfigs() || {};

    // 連携ボタン
    document.querySelectorAll('.connect-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const service = btn.dataset.service;
            openLoginModal(service);
        });
    });

    // ログインボタン
    const doLoginBtn = document.getElementById('doLogin');
    if (doLoginBtn) {
        doLoginBtn.addEventListener('click', doLogin);
    }

    // キャンセルボタン
    const cancelBtn = document.getElementById('cancelLogin');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            document.getElementById('accountLoginModal').classList.remove('active');
        });
    }

    // モーダル閉じるボタン
    document.querySelectorAll('.modal .close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').classList.remove('active');
        });
    });

    // すべて更新ボタン
    const syncAllBtn = document.getElementById('syncAllBtn');
    if (syncAllBtn) {
        syncAllBtn.addEventListener('click', syncAllAccounts);
    }

    // 接続状態を更新
    updateServiceStatus();
    renderConnectedAccounts();
}

// ログインモーダルを開く
function openLoginModal(service) {
    const modal = document.getElementById('accountLoginModal');
    const serviceInfo = SERVICE_INFO[service];

    if (!serviceInfo) {
        alert('サービスが見つかりません');
        return;
    }

    document.getElementById('loginService').value = service;
    document.getElementById('loginServiceIcon').textContent = serviceInfo.icon;
    document.getElementById('loginServiceName').textContent = serviceInfo.name;
    document.getElementById('loginModalTitle').textContent = serviceInfo.name + ' との連携';

    // 既存の認証情報があれば復元
    const existing = connectedAccounts[service];
    if (existing) {
        try {
            document.getElementById('loginId').value = existing.loginId ? atob(existing.loginId) : '';
            document.getElementById('loginPassword').value = existing.loginPassword ? atob(existing.loginPassword) : '';
        } catch (e) {
            document.getElementById('loginId').value = '';
            document.getElementById('loginPassword').value = '';
        }
    } else {
        document.getElementById('loginId').value = '';
        document.getElementById('loginPassword').value = '';
    }

    document.getElementById('loginResult').className = 'login-result';
    document.getElementById('loginResult').innerHTML = '';

    modal.classList.add('active');
}

// ログイン処理
async function doLogin() {
    const service = document.getElementById('loginService').value;
    const loginId = document.getElementById('loginId').value;
    const password = document.getElementById('loginPassword').value;
    const remember = document.getElementById('rememberLogin').checked;
    const resultDiv = document.getElementById('loginResult');
    const loginBtn = document.getElementById('doLogin');

    if (!loginId || !password) {
        alert('ログインIDとパスワードを入力してください');
        return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = '連携中...';
    resultDiv.className = 'login-result show loading';
    resultDiv.textContent = 'ログイン中...';

    try {
        // シミュレート（実際のサービスではAPIを呼び出す）
        await new Promise(resolve => setTimeout(resolve, 1500));

        // 検証（実際のサービスでは認証APIを使用）
        if (password.length < 4) {
            throw new Error('パスワードが正しくありません');
        }

        // 成功
        const account = {
            service,
            isConnected: true,
            connectedAt: new Date().toISOString(),
            lastSync: new Date().toISOString(),
            balance: Math.floor(Math.random() * 500000) + 10000 // デモ用
        };

        if (remember) {
            account.loginId = btoa(loginId);
            account.loginPassword = btoa(password);
        }

        connectedAccounts[service] = account;
        Storage.saveApiConfigs(connectedAccounts);

        resultDiv.className = 'login-result show success';
        resultDiv.textContent = '連携が完了しました！';

        setTimeout(() => {
            document.getElementById('accountLoginModal').classList.remove('active');
            updateServiceStatus();
            renderConnectedAccounts();
            updateAssetSummary();
        }, 1000);

    } catch (error) {
        resultDiv.className = 'login-result show error';
        resultDiv.textContent = 'エラー: ' + error.message;
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = '連携する';
    }
}

// サービス状態を更新
function updateServiceStatus() {
    Object.keys(SERVICE_INFO).forEach(service => {
        const statusEl = document.getElementById(`status-${service}`);
        const itemEl = document.querySelector(`.service-item[data-service="${service}"]`);
        const btnEl = itemEl?.querySelector('.connect-btn');
        const account = connectedAccounts[service];

        if (statusEl) {
            if (account && account.isConnected) {
                statusEl.textContent = '連携済';
                statusEl.className = 'service-status connected';
                if (itemEl) itemEl.classList.add('connected');
                if (btnEl) btnEl.textContent = '再連携';
            } else {
                statusEl.textContent = '未連携';
                statusEl.className = 'service-status';
                if (itemEl) itemEl.classList.remove('connected');
                if (btnEl) btnEl.textContent = '連携する';
            }
        }
    });
}

// 連携済みアカウント一覧を表示
function renderConnectedAccounts() {
    const container = document.getElementById('connectedAccountsList');
    if (!container) return;

    const connected = Object.entries(connectedAccounts).filter(([_, acc]) => acc.isConnected);

    if (connected.length === 0) {
        container.innerHTML = '<p class="no-accounts">連携しているアカウントはありません</p>';
        return;
    }

    container.innerHTML = connected.map(([service, account]) => {
        const info = SERVICE_INFO[service] || { name: service, icon: '📱' };
        const lastSync = account.lastSync ? new Date(account.lastSync).toLocaleString('ja-JP') : '未同期';
        const balance = account.balance ? `¥${account.balance.toLocaleString()}` : '-';

        return `
            <div class="connected-account-item">
                <span class="account-icon">${info.icon}</span>
                <div class="account-info">
                    <div class="account-name">${info.name}</div>
                    <div class="account-last-sync">最終更新: ${lastSync}</div>
                </div>
                <span class="account-balance">${balance}</span>
                <button class="disconnect-btn" onclick="disconnectAccount('${service}')">解除</button>
            </div>
        `;
    }).join('');

    // 最終更新時刻を更新
    const lastSyncEl = document.getElementById('lastSyncTime');
    if (lastSyncEl && connected.length > 0) {
        const latestSync = connected
            .map(([_, acc]) => acc.lastSync)
            .filter(Boolean)
            .sort()
            .reverse()[0];
        if (latestSync) {
            lastSyncEl.textContent = new Date(latestSync).toLocaleString('ja-JP');
        }
    }
}

// アカウント連携を解除
function disconnectAccount(service) {
    const info = SERVICE_INFO[service] || { name: service };
    if (!confirm(`${info.name}との連携を解除しますか？`)) return;

    delete connectedAccounts[service];
    Storage.saveApiConfigs(connectedAccounts);

    updateServiceStatus();
    renderConnectedAccounts();
    updateAssetSummary();
}

// すべてのアカウントを同期
async function syncAllAccounts() {
    const syncBtn = document.getElementById('syncAllBtn');
    syncBtn.disabled = true;
    syncBtn.innerHTML = '<span class="sync-icon" style="animation: spin 1s linear infinite;">🔄</span> 更新中...';

    const connected = Object.entries(connectedAccounts).filter(([_, acc]) => acc.isConnected);

    if (connected.length === 0) {
        alert('連携しているアカウントがありません');
        syncBtn.disabled = false;
        syncBtn.innerHTML = '<span class="sync-icon">🔄</span> すべて更新';
        return;
    }

    for (const [service, account] of connected) {
        // シミュレート（実際のサービスではデータを取得）
        await new Promise(resolve => setTimeout(resolve, 500));
        account.lastSync = new Date().toISOString();
        account.balance = Math.floor(Math.random() * 500000) + 10000;
    }

    Storage.saveApiConfigs(connectedAccounts);
    renderConnectedAccounts();
    updateAssetSummary();

    syncBtn.disabled = false;
    syncBtn.innerHTML = '<span class="sync-icon">🔄</span> すべて更新';
    alert('更新が完了しました');
}

// パスワード表示/非表示切り替え
function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
    } else {
        input.type = 'password';
    }
}

// サービス名を取得
function getServiceName(service) {
    return SERVICE_INFO[service]?.name || service;
}

// グローバル関数として公開
window.disconnectAccount = disconnectAccount;
window.togglePasswordVisibility = togglePasswordVisibility;

// ========================================
// 収支管理機能
// ========================================

function initIncome() {
    const form = document.getElementById('incomeForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const income = {
            id: Date.now(),
            date: document.getElementById('incomeDate').value,
            description: document.getElementById('incomeDescription').value,
            amount: parseInt(document.getElementById('incomeAmount').value),
            category: document.getElementById('incomeCategory').value
        };

        incomes.push(income);
        Storage.saveIncomes(incomes);

        form.reset();
        document.getElementById('incomeDate').value = new Date().toISOString().split('T')[0];

        renderIncomeTable();
        updateBalanceSummary();
        addExp(10);
        alert('収入を登録しました');
    });
}

function renderIncomeTable() {
    const tbody = document.getElementById('incomeTableBody');
    if (!tbody) return;

    const thisMonth = new Date().toISOString().slice(0, 7);
    const monthlyIncomes = incomes.filter(i => i.date.startsWith(thisMonth));
    monthlyIncomes.sort((a, b) => new Date(b.date) - new Date(a.date));

    tbody.innerHTML = monthlyIncomes.map(income => `
        <tr>
            <td>${income.date}</td>
            <td>${escapeHtml(income.description)}</td>
            <td>¥${income.amount.toLocaleString()}</td>
            <td>${income.category}</td>
            <td>
                <button class="btn-delete" onclick="deleteIncome(${income.id})">削除</button>
            </td>
        </tr>
    `).join('');
}

function deleteIncome(id) {
    if (confirm('この収入を削除しますか？')) {
        incomes = incomes.filter(i => i.id !== id);
        Storage.saveIncomes(incomes);
        renderIncomeTable();
        updateBalanceSummary();
    }
}

function updateBalanceSummary() {
    const thisMonth = new Date().toISOString().slice(0, 7);

    const totalIncome = incomes
        .filter(i => i.date.startsWith(thisMonth))
        .reduce((sum, i) => sum + i.amount, 0);

    const totalExpense = expenses
        .filter(e => e.date.startsWith(thisMonth))
        .reduce((sum, e) => sum + e.amount, 0);

    const netBalance = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? Math.round((netBalance / totalIncome) * 100) : 0;

    const totalIncomeEl = document.getElementById('totalIncome');
    const totalExpenseEl = document.getElementById('totalExpenseBalance');
    const netBalanceEl = document.getElementById('netBalance');
    const savingsRateEl = document.getElementById('savingsRate');

    if (totalIncomeEl) totalIncomeEl.textContent = `¥${totalIncome.toLocaleString()}`;
    if (totalExpenseEl) totalExpenseEl.textContent = `¥${totalExpense.toLocaleString()}`;
    if (netBalanceEl) {
        netBalanceEl.textContent = `¥${netBalance.toLocaleString()}`;
        netBalanceEl.closest('.balance-card').className = `balance-card ${netBalance >= 0 ? 'net-card' : 'expense-card'}`;
    }
    if (savingsRateEl) savingsRateEl.textContent = `${savingsRate}%`;

    renderBalanceChart();
}

function renderBalanceChart() {
    const ctx = document.getElementById('balanceChart');
    if (!ctx) return;

    const last6Months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        last6Months.push(d.toISOString().slice(0, 7));
    }

    const incomeData = last6Months.map(month =>
        incomes.filter(i => i.date.startsWith(month)).reduce((sum, i) => sum + i.amount, 0)
    );

    const expenseData = last6Months.map(month =>
        expenses.filter(e => e.date.startsWith(month)).reduce((sum, e) => sum + e.amount, 0)
    );

    if (charts.balance) charts.balance.destroy();

    charts.balance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: last6Months.map(m => m.replace('-', '/')),
            datasets: [
                {
                    label: '収入',
                    data: incomeData,
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: '支出',
                    data: expenseData,
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top' }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => '¥' + value.toLocaleString()
                    }
                }
            }
        }
    });
}

// ========================================
// 定期支出・サブスク管理機能
// ========================================

function initSubscription() {
    const form = document.getElementById('subscriptionForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const subscription = {
            id: Date.now(),
            name: document.getElementById('subName').value,
            amount: parseInt(document.getElementById('subAmount').value),
            category: document.getElementById('subCategory').value,
            cycle: document.getElementById('subCycle').value,
            payDay: parseInt(document.getElementById('subPayDay').value),
            startDate: document.getElementById('subStartDate').value,
            notify: document.getElementById('subNotify').checked,
            active: true
        };

        subscriptions.push(subscription);
        Storage.saveSubscriptions(subscriptions);

        form.reset();
        document.getElementById('subNotify').checked = true;
        renderSubscriptions();
        addExp(15);
        alert('定期支出を登録しました');
    });
}

function renderSubscriptions() {
    renderSubscriptionSummary();
    renderUpcomingPayments();
    renderSubscriptionCards();
}

function renderSubscriptionSummary() {
    const activeSubscriptions = subscriptions.filter(s => s.active);

    let monthlyTotal = 0;
    activeSubscriptions.forEach(s => {
        if (s.cycle === 'monthly') monthlyTotal += s.amount;
        else if (s.cycle === 'yearly') monthlyTotal += s.amount / 12;
        else if (s.cycle === 'weekly') monthlyTotal += s.amount * 4.33;
    });

    const yearlyTotal = monthlyTotal * 12;

    const monthlyEl = document.getElementById('monthlySubTotal');
    const yearlyEl = document.getElementById('yearlySubTotal');
    const countEl = document.getElementById('subCount');

    if (monthlyEl) monthlyEl.textContent = `¥${Math.round(monthlyTotal).toLocaleString()}`;
    if (yearlyEl) yearlyEl.textContent = `¥${Math.round(yearlyTotal).toLocaleString()}`;
    if (countEl) countEl.textContent = `${activeSubscriptions.length}件`;
}

function renderUpcomingPayments() {
    const container = document.getElementById('upcomingPaymentsList');
    if (!container) return;

    const today = new Date();
    const upcoming = [];

    subscriptions.filter(s => s.active).forEach(s => {
        let nextPayDate;
        if (s.cycle === 'monthly') {
            nextPayDate = new Date(today.getFullYear(), today.getMonth(), s.payDay);
            if (nextPayDate < today) {
                nextPayDate.setMonth(nextPayDate.getMonth() + 1);
            }
        } else if (s.cycle === 'yearly') {
            const startDate = new Date(s.startDate);
            nextPayDate = new Date(today.getFullYear(), startDate.getMonth(), startDate.getDate());
            if (nextPayDate < today) {
                nextPayDate.setFullYear(nextPayDate.getFullYear() + 1);
            }
        } else if (s.cycle === 'weekly') {
            nextPayDate = new Date(today);
            nextPayDate.setDate(nextPayDate.getDate() + (7 - nextPayDate.getDay() + s.payDay) % 7);
        }

        const daysUntil = Math.ceil((nextPayDate - today) / (1000 * 60 * 60 * 24));
        upcoming.push({ ...s, nextPayDate, daysUntil });
    });

    upcoming.sort((a, b) => a.nextPayDate - b.nextPayDate);
    const next7Days = upcoming.filter(u => u.daysUntil <= 7);

    if (next7Days.length === 0) {
        container.innerHTML = '<p class="no-upcoming">今後7日間の支払い予定はありません</p>';
        return;
    }

    container.innerHTML = next7Days.map(item => `
        <div class="upcoming-item ${item.daysUntil <= 3 ? 'soon' : ''}">
            <span class="upcoming-date">${item.daysUntil === 0 ? '今日' : item.daysUntil + '日後'}</span>
            <span class="upcoming-name">${escapeHtml(item.name)}</span>
            <span class="upcoming-amount">¥${item.amount.toLocaleString()}</span>
        </div>
    `).join('');
}

function renderSubscriptionCards() {
    const container = document.getElementById('subscriptionCards');
    if (!container) return;

    if (subscriptions.length === 0) {
        container.innerHTML = '<p>登録されている定期支出はありません</p>';
        return;
    }

    const cycleLabels = { monthly: '毎月', yearly: '年1回', weekly: '毎週' };

    container.innerHTML = subscriptions.map(s => `
        <div class="subscription-card ${s.active ? '' : 'inactive'}">
            <div class="sub-header">
                <span class="sub-name">${escapeHtml(s.name)}</span>
                <span class="sub-category">${s.category}</span>
            </div>
            <div class="sub-amount">¥${s.amount.toLocaleString()}</div>
            <div class="sub-cycle">${cycleLabels[s.cycle]} / ${s.payDay}日払い</div>
            <div class="sub-actions">
                <button onclick="toggleSubscription(${s.id})" style="background: ${s.active ? '#6c757d' : '#28a745'}; color: white;">
                    ${s.active ? '停止' : '再開'}
                </button>
                <button onclick="deleteSubscription(${s.id})" style="background: #dc3545; color: white;">削除</button>
            </div>
        </div>
    `).join('');
}

function toggleSubscription(id) {
    const sub = subscriptions.find(s => s.id === id);
    if (sub) {
        sub.active = !sub.active;
        Storage.saveSubscriptions(subscriptions);
        renderSubscriptions();
    }
}

function deleteSubscription(id) {
    if (confirm('この定期支出を削除しますか？')) {
        subscriptions = subscriptions.filter(s => s.id !== id);
        Storage.saveSubscriptions(subscriptions);
        renderSubscriptions();
    }
}

// ========================================
// 目標設定・貯金管理機能
// ========================================

function initGoals() {
    const form = document.getElementById('goalForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const goal = {
            id: Date.now(),
            name: document.getElementById('goalName').value,
            icon: document.getElementById('goalIcon').value,
            target: parseInt(document.getElementById('goalTarget').value),
            deadline: document.getElementById('goalDeadline').value,
            current: parseInt(document.getElementById('goalInitial').value) || 0,
            deposits: [],
            completed: false,
            createdAt: new Date().toISOString()
        };

        goals.push(goal);
        Storage.saveGoals(goals);

        form.reset();
        renderGoals();
        addExp(20);
        alert('目標を設定しました');
    });

    // 入金モーダル
    const depositForm = document.getElementById('depositForm');
    if (depositForm) {
        depositForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const goalId = parseInt(document.getElementById('depositGoalId').value);
            const amount = parseInt(document.getElementById('depositAmount').value);
            addDeposit(goalId, amount);
        });
    }

    const depositModal = document.getElementById('depositModal');
    if (depositModal) {
        depositModal.querySelector('.close-modal').addEventListener('click', () => {
            depositModal.classList.remove('active');
        });
    }
}

function renderGoals() {
    const container = document.getElementById('goalCards');
    if (!container) return;

    if (goals.length === 0) {
        container.innerHTML = '<p>設定されている目標はありません</p>';
        return;
    }

    container.innerHTML = goals.map(goal => {
        const progress = Math.min(100, Math.round((goal.current / goal.target) * 100));
        const remaining = goal.target - goal.current;
        const deadline = new Date(goal.deadline);
        const today = new Date();
        const daysLeft = Math.max(0, Math.ceil((deadline - today) / (1000 * 60 * 60 * 24)));
        const monthlyNeeded = daysLeft > 0 ? Math.ceil(remaining / (daysLeft / 30)) : remaining;

        return `
            <div class="goal-card ${goal.completed ? 'completed' : ''}">
                <div class="goal-header">
                    <span class="goal-icon">${goal.icon}</span>
                    <div class="goal-info">
                        <h4>${escapeHtml(goal.name)}</h4>
                        <p>期限: ${goal.deadline} (あと${daysLeft}日)</p>
                    </div>
                </div>
                <div class="goal-progress">
                    <div class="goal-progress-bar">
                        <div class="goal-progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <div class="goal-progress-text">
                        <span class="current">¥${goal.current.toLocaleString()}</span>
                        <span class="target">/ ¥${goal.target.toLocaleString()} (${progress}%)</span>
                    </div>
                </div>
                <div class="goal-stats">
                    <div class="goal-stat">
                        <span class="goal-stat-label">残り</span>
                        <span class="goal-stat-value">¥${remaining.toLocaleString()}</span>
                    </div>
                    <div class="goal-stat">
                        <span class="goal-stat-label">月あたり必要</span>
                        <span class="goal-stat-value">¥${monthlyNeeded.toLocaleString()}</span>
                    </div>
                </div>
                <div class="goal-actions">
                    <button class="deposit-btn" onclick="openDepositModal(${goal.id})">入金する</button>
                    <button onclick="deleteGoal(${goal.id})" style="background: #dc3545; color: white;">削除</button>
                </div>
            </div>
        `;
    }).join('');
}

function openDepositModal(goalId) {
    document.getElementById('depositGoalId').value = goalId;
    document.getElementById('depositAmount').value = '';
    document.getElementById('depositModal').classList.add('active');
}

function addDeposit(goalId, amount) {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    goal.current += amount;
    goal.deposits.push({
        amount,
        date: new Date().toISOString()
    });

    if (goal.current >= goal.target && !goal.completed) {
        goal.completed = true;
        addBadge('goal_achieved');
        addExp(100);
        alert('おめでとうございます！目標を達成しました！');
    } else {
        addExp(15);
    }

    Storage.saveGoals(goals);
    document.getElementById('depositModal').classList.remove('active');
    renderGoals();
}

function deleteGoal(id) {
    if (confirm('この目標を削除しますか？')) {
        goals = goals.filter(g => g.id !== id);
        Storage.saveGoals(goals);
        renderGoals();
    }
}

// ========================================
// レポート・分析機能
// ========================================

function initReport() {
    const periodSelect = document.getElementById('reportPeriod');
    const customPeriod = document.getElementById('customPeriod');
    const generateBtn = document.getElementById('generateReport');
    const exportPdfBtn = document.getElementById('exportReportPdf');

    if (periodSelect) {
        periodSelect.addEventListener('change', () => {
            if (periodSelect.value === 'custom') {
                customPeriod.style.display = 'flex';
            } else {
                customPeriod.style.display = 'none';
            }
        });
    }

    if (generateBtn) {
        generateBtn.addEventListener('click', generateReport);
    }

    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', () => {
            alert('PDF出力機能は準備中です');
        });
    }
}

function getReportPeriod() {
    const period = document.getElementById('reportPeriod')?.value || 'thisMonth';
    const now = new Date();
    let startDate, endDate;

    switch (period) {
        case 'thisMonth':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            break;
        case 'lastMonth':
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), 0);
            break;
        case 'last3Months':
            startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            break;
        case 'last6Months':
            startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            break;
        case 'thisYear':
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear(), 11, 31);
            break;
        case 'custom':
            startDate = new Date(document.getElementById('reportStartDate').value);
            endDate = new Date(document.getElementById('reportEndDate').value);
            break;
        default:
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = now;
    }

    return {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
    };
}

function generateReport() {
    const { start, end } = getReportPeriod();

    const periodExpenses = expenses.filter(e => e.date >= start && e.date <= end);
    const periodIncomes = incomes.filter(i => i.date >= start && i.date <= end);

    const totalExpense = periodExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalIncome = periodIncomes.reduce((sum, i) => sum + i.amount, 0);
    const netBalance = totalIncome - totalExpense;

    const days = Math.max(1, Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)));
    const dailyAvg = Math.round(totalExpense / days);

    // サマリー更新
    const totalIncomeEl = document.getElementById('reportTotalIncome');
    const totalExpenseEl = document.getElementById('reportTotalExpense');
    const netBalanceEl = document.getElementById('reportNetBalance');
    const dailyAvgEl = document.getElementById('reportDailyAvg');

    if (totalIncomeEl) totalIncomeEl.textContent = `¥${totalIncome.toLocaleString()}`;
    if (totalExpenseEl) totalExpenseEl.textContent = `¥${totalExpense.toLocaleString()}`;
    if (netBalanceEl) {
        netBalanceEl.textContent = `¥${netBalance.toLocaleString()}`;
        netBalanceEl.className = `report-value ${netBalance >= 0 ? 'positive' : 'negative'}`;
    }
    if (dailyAvgEl) dailyAvgEl.textContent = `¥${dailyAvg.toLocaleString()}`;

    renderPeriodComparison(periodExpenses, start, end);
    detectAnomalies(periodExpenses);
    renderReportCharts(periodExpenses);
}

function renderPeriodComparison(currentExpenses, start, end) {
    const container = document.getElementById('comparisonContent');
    if (!container) return;

    const days = Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24));
    const prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - days);
    const prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);

    const prevExpenses = expenses.filter(e =>
        e.date >= prevStart.toISOString().split('T')[0] &&
        e.date <= prevEnd.toISOString().split('T')[0]
    );

    const currentTotal = currentExpenses.reduce((sum, e) => sum + e.amount, 0);
    const prevTotal = prevExpenses.reduce((sum, e) => sum + e.amount, 0);

    const categoryTotals = {};
    CATEGORIES.forEach(cat => {
        const current = currentExpenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0);
        const prev = prevExpenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0);
        const change = prev > 0 ? Math.round(((current - prev) / prev) * 100) : (current > 0 ? 100 : 0);
        if (current > 0 || prev > 0) {
            categoryTotals[cat] = { current, prev, change };
        }
    });

    const overallChange = prevTotal > 0 ? Math.round(((currentTotal - prevTotal) / prevTotal) * 100) : 0;

    container.innerHTML = `
        <div class="comparison-item">
            <div class="comparison-label">総支出</div>
            <div class="comparison-value">¥${currentTotal.toLocaleString()}</div>
            <div class="comparison-change ${overallChange > 0 ? 'increase' : 'decrease'}">
                ${overallChange > 0 ? '+' : ''}${overallChange}% vs 前期
            </div>
        </div>
        ${Object.entries(categoryTotals).map(([cat, data]) => `
            <div class="comparison-item">
                <div class="comparison-label">${cat}</div>
                <div class="comparison-value">¥${data.current.toLocaleString()}</div>
                <div class="comparison-change ${data.change > 0 ? 'increase' : 'decrease'}">
                    ${data.change > 0 ? '+' : ''}${data.change}%
                </div>
            </div>
        `).join('')}
    `;
}

function detectAnomalies(periodExpenses) {
    const container = document.getElementById('anomalyAlerts');
    if (!container) return;

    const anomalies = [];

    // カテゴリ別の平均を計算
    const categoryAvg = {};
    CATEGORIES.forEach(cat => {
        const catExpenses = expenses.filter(e => e.category === cat);
        if (catExpenses.length > 0) {
            categoryAvg[cat] = catExpenses.reduce((sum, e) => sum + e.amount, 0) / catExpenses.length;
        }
    });

    // 異常な支出を検出
    periodExpenses.forEach(expense => {
        const avg = categoryAvg[expense.category] || 0;
        if (expense.amount > avg * 3 && expense.amount > 5000) {
            anomalies.push({
                type: 'high_amount',
                expense,
                message: `${expense.category}で通常の${Math.round(expense.amount / avg)}倍の支出`
            });
        }
    });

    if (anomalies.length === 0) {
        container.innerHTML = '<p class="no-anomaly">異常な支出は検出されていません</p>';
        return;
    }

    container.innerHTML = anomalies.map(a => `
        <div class="anomaly-item">
            <span class="anomaly-icon">⚠️</span>
            <div class="anomaly-content">
                <h4>${escapeHtml(a.expense.description)}</h4>
                <p>${a.message} - ¥${a.expense.amount.toLocaleString()} (${a.expense.date})</p>
            </div>
        </div>
    `).join('');
}

function renderReportCharts(periodExpenses) {
    // カテゴリ別チャート
    const categoryCtx = document.getElementById('reportCategoryChart');
    if (categoryCtx) {
        const categoryData = {};
        periodExpenses.forEach(e => {
            categoryData[e.category] = (categoryData[e.category] || 0) + e.amount;
        });

        if (charts.reportCategory) charts.reportCategory.destroy();

        charts.reportCategory = new Chart(categoryCtx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(categoryData),
                datasets: [{
                    data: Object.values(categoryData),
                    backgroundColor: Object.keys(categoryData).map(cat => CATEGORY_COLORS[cat] || '#8B8B8B')
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'right' }
                }
            }
        });
    }

    // トレンドチャート
    const trendCtx = document.getElementById('reportTrendChart');
    if (trendCtx) {
        const dailyData = {};
        periodExpenses.forEach(e => {
            dailyData[e.date] = (dailyData[e.date] || 0) + e.amount;
        });

        const sortedDates = Object.keys(dailyData).sort();

        if (charts.reportTrend) charts.reportTrend.destroy();

        charts.reportTrend = new Chart(trendCtx, {
            type: 'line',
            data: {
                labels: sortedDates,
                datasets: [{
                    label: '日別支出',
                    data: sortedDates.map(d => dailyData[d]),
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: value => '¥' + value.toLocaleString()
                        }
                    }
                }
            }
        });
    }
}

// ========================================
// データ管理機能
// ========================================

function initDataManagement() {
    // CSV エクスポート
    document.getElementById('exportCsv')?.addEventListener('click', () => exportToCsv('expenses'));
    document.getElementById('exportIncomeCsv')?.addEventListener('click', () => exportToCsv('incomes'));
    document.getElementById('exportAllCsv')?.addEventListener('click', () => exportToCsv('all'));

    // JSON エクスポート
    document.getElementById('exportJson')?.addEventListener('click', exportToJson);

    // CSV インポート
    const csvImportFile = document.getElementById('csvImportFile');
    if (csvImportFile) {
        csvImportFile.addEventListener('change', handleCsvImport);
    }

    // JSON インポート
    const jsonImportFile = document.getElementById('jsonImportFile');
    if (jsonImportFile) {
        jsonImportFile.addEventListener('change', handleJsonImport);
    }

    // インポート実行ボタン
    document.getElementById('importCsvData')?.addEventListener('click', executeCsvImport);

    // データ削除
    document.getElementById('clearExpenses')?.addEventListener('click', () => {
        if (confirm('すべての支出データを削除しますか？この操作は取り消せません。')) {
            expenses = [];
            Storage.saveExpenses(expenses);
            alert('支出データを削除しました');
        }
    });

    document.getElementById('clearAllData')?.addEventListener('click', () => {
        if (confirm('すべてのデータを削除しますか？この操作は取り消せません。')) {
            localStorage.clear();
            alert('すべてのデータを削除しました。ページを再読み込みします。');
            location.reload();
        }
    });
}

function exportToCsv(type) {
    let data, filename, headers;

    if (type === 'expenses') {
        data = expenses;
        filename = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
        headers = ['日付', '説明', '金額', 'カテゴリ'];
    } else if (type === 'incomes') {
        data = incomes;
        filename = `incomes_${new Date().toISOString().split('T')[0]}.csv`;
        headers = ['日付', '説明', '金額', 'カテゴリ'];
    } else {
        // 全データ
        const allData = [
            ...expenses.map(e => ({ ...e, type: '支出' })),
            ...incomes.map(i => ({ ...i, type: '収入' }))
        ];
        data = allData;
        filename = `all_data_${new Date().toISOString().split('T')[0]}.csv`;
        headers = ['種別', '日付', '説明', '金額', 'カテゴリ'];
    }

    let csvContent = '\uFEFF'; // BOM for Excel
    csvContent += headers.join(',') + '\n';

    data.forEach(item => {
        const row = type === 'all'
            ? [item.type, item.date, `"${item.description}"`, item.amount, item.category]
            : [item.date, `"${item.description}"`, item.amount, item.category];
        csvContent += row.join(',') + '\n';
    });

    downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
}

function exportToJson() {
    const allData = {
        expenses,
        incomes,
        budgets,
        subscriptions,
        goals,
        familyMembers,
        linkedAccounts: Storage.getLinkedAccounts(),
        gamification: gamificationData,
        quickInputs,
        exportDate: new Date().toISOString()
    };

    const jsonContent = JSON.stringify(allData, null, 2);
    const filename = `household_backup_${new Date().toISOString().split('T')[0]}.json`;
    downloadFile(jsonContent, filename, 'application/json');
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

let csvData = null;

function handleCsvImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const text = event.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

        csvData = {
            headers,
            rows: lines.slice(1).map(line => {
                const values = line.match(/(".*?"|[^,]+)/g) || [];
                return values.map(v => v.trim().replace(/^"|"$/g, ''));
            })
        };

        // プレビュー表示
        const preview = document.getElementById('csvPreview');
        preview.innerHTML = `
            <table>
                <thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
                <tbody>${csvData.rows.slice(0, 5).map(row =>
                    `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`
                ).join('')}</tbody>
            </table>
            <p>${csvData.rows.length}行のデータが見つかりました</p>
        `;

        // マッピング設定を表示
        const mapping = document.getElementById('csvMapping');
        mapping.style.display = 'block';

        ['mapDate', 'mapDescription', 'mapAmount', 'mapCategory'].forEach(id => {
            const select = document.getElementById(id);
            select.innerHTML = id === 'mapCategory'
                ? '<option value="">なし（自動推測）</option>'
                : '<option value="">選択してください</option>';
            headers.forEach((h, i) => {
                select.innerHTML += `<option value="${i}">${escapeHtml(h)}</option>`;
            });
        });
    };
    reader.readAsText(file);
}

function executeCsvImport() {
    if (!csvData) return;

    const dateIdx = parseInt(document.getElementById('mapDate').value);
    const descIdx = parseInt(document.getElementById('mapDescription').value);
    const amountIdx = parseInt(document.getElementById('mapAmount').value);
    const categoryIdx = document.getElementById('mapCategory').value;

    if (isNaN(dateIdx) || isNaN(descIdx) || isNaN(amountIdx)) {
        alert('日付、説明、金額の列を選択してください');
        return;
    }

    let imported = 0;
    csvData.rows.forEach(row => {
        const date = parseDate(row[dateIdx]);
        const description = row[descIdx];
        const amount = parseInt(row[amountIdx].replace(/[^0-9]/g, ''));
        const category = categoryIdx !== '' ? row[parseInt(categoryIdx)] : guessCategory(description);

        if (date && description && amount > 0) {
            expenses.push({
                id: Date.now() + imported,
                date,
                description,
                amount,
                category: CATEGORIES.includes(category) ? category : 'その他'
            });
            imported++;
        }
    });

    Storage.saveExpenses(expenses);
    alert(`${imported}件のデータをインポートしました`);

    document.getElementById('csvImportFile').value = '';
    document.getElementById('csvPreview').innerHTML = '';
    document.getElementById('csvMapping').style.display = 'none';
    csvData = null;
}

function parseDate(str) {
    if (!str) return null;

    // 様々な日付形式に対応
    const patterns = [
        /(\d{4})[\/\-年](\d{1,2})[\/\-月](\d{1,2})/,
        /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/
    ];

    for (const pattern of patterns) {
        const match = str.match(pattern);
        if (match) {
            let year, month, day;
            if (match[1].length === 4) {
                year = match[1];
                month = match[2].padStart(2, '0');
                day = match[3].padStart(2, '0');
            } else {
                month = match[1].padStart(2, '0');
                day = match[2].padStart(2, '0');
                year = match[3];
            }
            return `${year}-${month}-${day}`;
        }
    }
    return null;
}

function handleJsonImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);

            if (confirm('現在のデータを上書きしますか？「キャンセル」を選ぶと追加モードになります。')) {
                // 上書きモード
                if (data.expenses) { expenses = data.expenses; Storage.saveExpenses(expenses); }
                if (data.incomes) { incomes = data.incomes; Storage.saveIncomes(incomes); }
                if (data.budgets) { budgets = data.budgets; Storage.saveBudgets(budgets); }
                if (data.subscriptions) { subscriptions = data.subscriptions; Storage.saveSubscriptions(subscriptions); }
                if (data.goals) { goals = data.goals; Storage.saveGoals(goals); }
                if (data.familyMembers) { familyMembers = data.familyMembers; Storage.saveFamilyMembers(familyMembers); }
                if (data.linkedAccounts) { Storage.saveLinkedAccounts(data.linkedAccounts); }
                if (data.gamification) { gamificationData = data.gamification; Storage.saveGamification(gamificationData); }
                if (data.quickInputs) { quickInputs = data.quickInputs; Storage.saveQuickInputs(quickInputs); }
            } else {
                // 追加モード
                if (data.expenses) {
                    data.expenses.forEach(e => {
                        e.id = Date.now() + Math.random();
                        expenses.push(e);
                    });
                    Storage.saveExpenses(expenses);
                }
                if (data.incomes) {
                    data.incomes.forEach(i => {
                        i.id = Date.now() + Math.random();
                        incomes.push(i);
                    });
                    Storage.saveIncomes(incomes);
                }
            }

            alert('データをインポートしました');
            location.reload();
        } catch (error) {
            alert('JSONファイルの読み込みに失敗しました: ' + error.message);
        }
    };
    reader.readAsText(file);
}

// ========================================
// 家族・共有機能
// ========================================

function initFamily() {
    const addBtn = document.getElementById('addFamilyMember');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            document.getElementById('memberModal').classList.add('active');
        });
    }

    const form = document.getElementById('memberForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            addFamilyMember();
        });
    }

    const modal = document.getElementById('memberModal');
    if (modal) {
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }
}

function addFamilyMember() {
    const member = {
        id: Date.now(),
        name: document.getElementById('memberName').value,
        icon: document.getElementById('memberIcon').value,
        role: document.getElementById('memberRole').value,
        createdAt: new Date().toISOString()
    };

    familyMembers.push(member);
    Storage.saveFamilyMembers(familyMembers);

    document.getElementById('memberForm').reset();
    document.getElementById('memberModal').classList.remove('active');

    renderFamilyMembers();
    addExp(10);
}

function renderFamilyMembers() {
    const container = document.getElementById('familyMembers');
    if (!container) return;

    const roleLabels = { editor: '編集可能', viewer: '閲覧のみ' };

    container.innerHTML = `
        <div class="member-card current-user">
            <span class="member-icon">👤</span>
            <span class="member-name">自分（オーナー）</span>
        </div>
        ${familyMembers.map(m => `
            <div class="member-card">
                <span class="member-icon">${m.icon}</span>
                <span class="member-name">${escapeHtml(m.name)}</span>
                <span class="member-role">${roleLabels[m.role]}</span>
                <button class="btn-delete" onclick="deleteFamilyMember(${m.id})" style="margin-left: 10px;">×</button>
            </div>
        `).join('')}
    `;

    updateFamilyExpenses();
}

function deleteFamilyMember(id) {
    if (confirm('このメンバーを削除しますか？')) {
        familyMembers = familyMembers.filter(m => m.id !== id);
        Storage.saveFamilyMembers(familyMembers);
        renderFamilyMembers();
    }
}

function updateFamilyExpenses() {
    const thisMonth = new Date().toISOString().slice(0, 7);
    const monthExpenses = expenses.filter(e => e.date.startsWith(thisMonth));

    // 個人/共有の支出サマリー（将来的には各支出にmemberIdを付与）
    const total = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

    const personalEl = document.getElementById('personalExpenseTotal');
    const sharedEl = document.getElementById('sharedExpenseTotal');

    if (personalEl) personalEl.textContent = `¥${total.toLocaleString()}`;
    if (sharedEl) sharedEl.textContent = '¥0';

    // メンバー別支出（将来実装用のプレースホルダー）
    const memberExpensesContainer = document.getElementById('memberExpenses');
    if (memberExpensesContainer) {
        memberExpensesContainer.innerHTML = `
            <div class="member-expense-card">
                <div class="member-avatar">👤</div>
                <div class="member-name">自分</div>
                <div class="member-total">¥${total.toLocaleString()}</div>
            </div>
            ${familyMembers.map(m => `
                <div class="member-expense-card">
                    <div class="member-avatar">${m.icon}</div>
                    <div class="member-name">${escapeHtml(m.name)}</div>
                    <div class="member-total">¥0</div>
                </div>
            `).join('')}
        `;
    }
}

// ========================================
// ゲーミフィケーション機能
// ========================================

const LEVEL_TITLES = {
    1: '家計簿ビギナー',
    5: '節約見習い',
    10: '家計管理士',
    20: '節約マスター',
    30: '家計の達人',
    50: '貯蓄王'
};

const BADGES = {
    first_expense: { name: '初めての記録', icon: '🎉', description: '初めて支出を記録した' },
    streak_7: { name: '1週間連続', icon: '🔥', description: '7日連続で記録した' },
    streak_30: { name: '1ヶ月連続', icon: '💪', description: '30日連続で記録した' },
    goal_achieved: { name: '目標達成', icon: '🎯', description: '貯金目標を達成した' },
    budget_master: { name: '予算達成', icon: '💰', description: '1ヶ月予算内で生活した' },
    savings_10: { name: '貯蓄10%', icon: '🐷', description: '貯蓄率10%以上を達成した' },
    expense_100: { name: '記録100件', icon: '📝', description: '支出を100件記録した' }
};

const CHALLENGES = [
    { id: 'no_convenience', name: 'コンビニ禁止チャレンジ', description: '1週間コンビニ利用なし', duration: 7, reward: 50 },
    { id: 'lunch_savings', name: 'ランチ節約チャレンジ', description: '1週間ランチを500円以下に', duration: 7, reward: 40 },
    { id: 'record_daily', name: '毎日記録チャレンジ', description: '7日連続で記録する', duration: 7, reward: 30 }
];

function initGamification() {
    // クイック入力
    document.getElementById('addQuickInput')?.addEventListener('click', () => {
        document.getElementById('quickInputModal').classList.add('active');
    });

    const quickForm = document.getElementById('quickInputForm');
    if (quickForm) {
        quickForm.addEventListener('submit', (e) => {
            e.preventDefault();
            addQuickInput();
        });
    }

    const quickModal = document.getElementById('quickInputModal');
    if (quickModal) {
        quickModal.querySelector('.close-modal').addEventListener('click', () => {
            quickModal.classList.remove('active');
        });
    }

    // 音声入力
    const voiceBtn = document.getElementById('voiceInputBtn');
    if (voiceBtn) {
        voiceBtn.addEventListener('click', startVoiceInput);
    }

    // チャレンジタブ
    document.querySelectorAll('.challenge-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.challenge-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderChallenges(tab.dataset.challenge);
        });
    });
}

function renderGamification() {
    renderUserStatus();
    renderStreaks();
    renderChallenges('active');
    renderBadges();
    renderQuickInputs();
}

function renderUserStatus() {
    const level = gamificationData.level || 1;
    const exp = gamificationData.exp || 0;
    const expForNext = level * 100;
    const progress = (exp / expForNext) * 100;

    const levelEl = document.getElementById('userLevel');
    const titleEl = document.getElementById('levelTitle');
    const progressEl = document.getElementById('expProgress');
    const remainingEl = document.getElementById('expRemaining');

    if (levelEl) levelEl.textContent = `Lv.${level}`;
    if (titleEl) {
        const titles = Object.entries(LEVEL_TITLES).filter(([lvl]) => parseInt(lvl) <= level);
        titleEl.textContent = titles.length > 0 ? titles[titles.length - 1][1] : LEVEL_TITLES[1];
    }
    if (progressEl) progressEl.style.width = `${progress}%`;
    if (remainingEl) remainingEl.textContent = expForNext - exp;
}

function renderStreaks() {
    const currentEl = document.getElementById('currentStreak');
    const maxEl = document.getElementById('maxStreak');

    if (currentEl) currentEl.textContent = gamificationData.currentStreak || 0;
    if (maxEl) maxEl.textContent = gamificationData.maxStreak || 0;
}

function renderChallenges(filter) {
    const container = document.getElementById('challengeList');
    if (!container) return;

    const activeChallenges = gamificationData.challenges || [];
    let displayChallenges = [];

    if (filter === 'active') {
        displayChallenges = activeChallenges.filter(c => !c.completed);
    } else if (filter === 'available') {
        const activeIds = activeChallenges.map(c => c.id);
        displayChallenges = CHALLENGES.filter(c => !activeIds.includes(c.id));
    } else if (filter === 'completed') {
        displayChallenges = activeChallenges.filter(c => c.completed);
    }

    if (displayChallenges.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: #666; padding: 20px;">
            ${filter === 'active' ? '進行中のチャレンジはありません' :
              filter === 'available' ? '参加可能なチャレンジはありません' :
              '完了したチャレンジはありません'}
        </p>`;
        return;
    }

    container.innerHTML = displayChallenges.map(c => {
        const progress = c.progress || 0;
        const duration = c.duration || CHALLENGES.find(ch => ch.id === c.id)?.duration || 7;
        const reward = c.reward || CHALLENGES.find(ch => ch.id === c.id)?.reward || 30;

        return `
            <div class="challenge-item">
                <span class="challenge-icon">🏆</span>
                <div class="challenge-info">
                    <h4>${escapeHtml(c.name)}</h4>
                    <p>${escapeHtml(c.description)}</p>
                    ${filter !== 'available' ? `
                        <div class="challenge-progress-bar">
                            <div class="challenge-progress-fill" style="width: ${(progress / duration) * 100}%"></div>
                        </div>
                    ` : ''}
                </div>
                <div class="challenge-reward">
                    <span class="challenge-reward-value">${reward}</span>
                    <span class="challenge-reward-label">EXP</span>
                </div>
                ${filter === 'available' ? `
                    <button onclick="joinChallenge('${c.id}')" style="padding: 8px 15px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer;">参加</button>
                ` : ''}
            </div>
        `;
    }).join('');
}

function joinChallenge(id) {
    const challenge = CHALLENGES.find(c => c.id === id);
    if (!challenge) return;

    if (!gamificationData.challenges) gamificationData.challenges = [];

    gamificationData.challenges.push({
        ...challenge,
        startDate: new Date().toISOString(),
        progress: 0,
        completed: false
    });

    Storage.saveGamification(gamificationData);
    renderChallenges('active');
    alert(`「${challenge.name}」に参加しました！`);
}

function renderBadges() {
    const container = document.getElementById('badgeList');
    if (!container) return;

    const earnedBadges = gamificationData.badges || [];

    container.innerHTML = Object.entries(BADGES).map(([id, badge]) => {
        const earned = earnedBadges.includes(id);
        return `
            <div class="badge-item ${earned ? '' : 'locked'}" title="${badge.description}">
                <span class="badge-icon">${badge.icon}</span>
                <span class="badge-name">${badge.name}</span>
            </div>
        `;
    }).join('');
}

function renderQuickInputs() {
    const container = document.getElementById('quickInputList');
    if (!container) return;

    if (quickInputs.length === 0) {
        container.innerHTML = '<p style="color: #666; text-align: center;">クイック入力が登録されていません</p>';
        return;
    }

    container.innerHTML = quickInputs.map(q => `
        <div class="quick-input-item" onclick="useQuickInput(${q.id})">
            <span class="quick-input-icon">${q.icon}</span>
            <span class="quick-input-name">${escapeHtml(q.name)}</span>
            <span class="quick-input-amount">¥${q.amount.toLocaleString()}</span>
        </div>
    `).join('');
}

function addQuickInput() {
    const quick = {
        id: Date.now(),
        name: document.getElementById('quickName').value,
        amount: parseInt(document.getElementById('quickAmount').value),
        category: document.getElementById('quickCategory').value,
        icon: document.getElementById('quickIcon').value
    };

    quickInputs.push(quick);
    Storage.saveQuickInputs(quickInputs);

    document.getElementById('quickInputForm').reset();
    document.getElementById('quickInputModal').classList.remove('active');

    renderQuickInputs();
}

function useQuickInput(id) {
    const quick = quickInputs.find(q => q.id === id);
    if (!quick) return;

    const expense = {
        id: Date.now(),
        date: new Date().toISOString().split('T')[0],
        description: quick.name,
        amount: quick.amount,
        category: quick.category
    };

    expenses.push(expense);
    Storage.saveExpenses(expenses);

    addExp(5);
    checkStreak();
    alert(`${quick.name} ¥${quick.amount.toLocaleString()} を登録しました`);
}

function startVoiceInput() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert('お使いのブラウザは音声入力に対応していません');
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = 'ja-JP';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    const btn = document.getElementById('voiceInputBtn');
    const status = document.getElementById('voiceStatus');
    const result = document.getElementById('voiceResult');

    btn.classList.add('listening');
    status.textContent = '聞き取り中...';
    status.classList.add('listening');

    recognition.start();

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        btn.classList.remove('listening');
        status.textContent = '';
        status.classList.remove('listening');

        // テキストを解析
        const parsed = parseVoiceInput(transcript);

        result.classList.add('show');
        result.innerHTML = `
            <p class="voice-text">「${escapeHtml(transcript)}」</p>
            <p class="voice-parsed">→ ${escapeHtml(parsed.description)} ¥${parsed.amount.toLocaleString()} (${parsed.category})</p>
            <button onclick="confirmVoiceInput('${escapeHtml(parsed.description)}', ${parsed.amount}, '${parsed.category}')"
                    style="margin-top: 10px; padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer;">
                登録する
            </button>
        `;
    };

    recognition.onerror = (event) => {
        btn.classList.remove('listening');
        status.textContent = 'エラー: ' + event.error;
        status.classList.remove('listening');
    };

    recognition.onend = () => {
        btn.classList.remove('listening');
    };
}

function parseVoiceInput(text) {
    // 「〇〇で△△円」のパターンを解析
    const amountMatch = text.match(/(\d+)円/);
    const amount = amountMatch ? parseInt(amountMatch[1]) : 0;

    // 金額部分を除いた説明
    let description = text.replace(/(\d+)円/, '').replace(/で$/, '').trim();
    if (!description) description = '支出';

    // カテゴリを推測
    const category = guessCategory(description);

    return { description, amount, category };
}

function confirmVoiceInput(description, amount, category) {
    if (amount <= 0) {
        alert('金額を正しく認識できませんでした');
        return;
    }

    const expense = {
        id: Date.now(),
        date: new Date().toISOString().split('T')[0],
        description,
        amount,
        category
    };

    expenses.push(expense);
    Storage.saveExpenses(expenses);

    document.getElementById('voiceResult').classList.remove('show');

    addExp(10);
    checkStreak();
    alert('支出を登録しました');
}

function addExp(amount) {
    gamificationData.exp = (gamificationData.exp || 0) + amount;

    const expForNext = (gamificationData.level || 1) * 100;
    while (gamificationData.exp >= expForNext) {
        gamificationData.exp -= expForNext;
        gamificationData.level = (gamificationData.level || 1) + 1;
        alert(`レベルアップ！ Lv.${gamificationData.level} になりました！`);
    }

    Storage.saveGamification(gamificationData);
    renderUserStatus();
}

function addBadge(badgeId) {
    if (!gamificationData.badges) gamificationData.badges = [];
    if (!gamificationData.badges.includes(badgeId)) {
        gamificationData.badges.push(badgeId);
        Storage.saveGamification(gamificationData);
        const badge = BADGES[badgeId];
        if (badge) {
            alert(`バッジ獲得！ ${badge.icon} ${badge.name}`);
        }
        renderBadges();
    }
}

function checkStreak() {
    const today = new Date().toISOString().split('T')[0];
    const lastRecord = gamificationData.lastRecordDate;

    if (lastRecord === today) return; // 今日はすでに記録済み

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (lastRecord === yesterdayStr) {
        // 連続記録を継続
        gamificationData.currentStreak = (gamificationData.currentStreak || 0) + 1;
    } else if (!lastRecord || lastRecord < yesterdayStr) {
        // 連続記録がリセット
        gamificationData.currentStreak = 1;
    }

    gamificationData.lastRecordDate = today;

    // 最長記録を更新
    if (gamificationData.currentStreak > (gamificationData.maxStreak || 0)) {
        gamificationData.maxStreak = gamificationData.currentStreak;
    }

    // 連続記録バッジ
    if (gamificationData.currentStreak >= 7) addBadge('streak_7');
    if (gamificationData.currentStreak >= 30) addBadge('streak_30');

    // 記録件数バッジ
    if (expenses.length >= 100) addBadge('expense_100');
    if (expenses.length === 1) addBadge('first_expense');

    Storage.saveGamification(gamificationData);
    renderStreaks();
}

// グローバル関数として公開
window.openEditModal = openEditModal;
window.deleteExpense = deleteExpense;
window.openApiConfigModal = openApiConfigModal;
window.deleteCustomApi = deleteCustomApi;
window.deleteIncome = deleteIncome;
window.toggleSubscription = toggleSubscription;
window.deleteSubscription = deleteSubscription;
window.openDepositModal = openDepositModal;
window.deleteGoal = deleteGoal;
window.deleteFamilyMember = deleteFamilyMember;
window.useQuickInput = useQuickInput;
window.confirmVoiceInput = confirmVoiceInput;
window.joinChallenge = joinChallenge;
window.togglePasswordVisibility = togglePasswordVisibility;
