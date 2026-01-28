// 家計簿アプリ - メインJavaScript

// データストレージ
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

    get(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    },

    set(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    },

    getExpenses() {
        return this.get(this.KEYS.EXPENSES) || [];
    },

    saveExpenses(expenses) {
        this.set(this.KEYS.EXPENSES, expenses);
    },

    getBudgets() {
        return this.get(this.KEYS.BUDGETS) || {};
    },

    saveBudgets(budgets) {
        this.set(this.KEYS.BUDGETS, budgets);
    },

    getLinkedAccounts() {
        return this.get(this.KEYS.LINKED_ACCOUNTS) || {
            bank: [],
            securities: [],
            credit: [],
            emoney: [],
            qr: [],
            points: [],
            ec: []
        };
    },

    saveLinkedAccounts(accounts) {
        this.set(this.KEYS.LINKED_ACCOUNTS, accounts);
    },

    getApiConfigs() {
        return this.get(this.KEYS.API_CONFIGS) || {};
    },

    saveApiConfigs(configs) {
        this.set(this.KEYS.API_CONFIGS, configs);
    },

    getSyncLogs() {
        return this.get(this.KEYS.SYNC_LOGS) || [];
    },

    saveSyncLogs(logs) {
        // 最新100件のみ保持
        const trimmedLogs = logs.slice(-100);
        this.set(this.KEYS.SYNC_LOGS, trimmedLogs);
    },

    getCustomApis() {
        return this.get(this.KEYS.CUSTOM_APIS) || [];
    },

    saveCustomApis(apis) {
        this.set(this.KEYS.CUSTOM_APIS, apis);
    },

    getIncomes() {
        return this.get(this.KEYS.INCOMES) || [];
    },

    saveIncomes(incomes) {
        this.set(this.KEYS.INCOMES, incomes);
    },

    getSubscriptions() {
        return this.get(this.KEYS.SUBSCRIPTIONS) || [];
    },

    saveSubscriptions(subscriptions) {
        this.set(this.KEYS.SUBSCRIPTIONS, subscriptions);
    },

    getGoals() {
        return this.get(this.KEYS.GOALS) || [];
    },

    saveGoals(goals) {
        this.set(this.KEYS.GOALS, goals);
    },

    getFamilyMembers() {
        return this.get(this.KEYS.FAMILY_MEMBERS) || [];
    },

    saveFamilyMembers(members) {
        this.set(this.KEYS.FAMILY_MEMBERS, members);
    },

    getGamification() {
        return this.get(this.KEYS.GAMIFICATION) || {
            level: 1,
            exp: 0,
            currentStreak: 0,
            maxStreak: 0,
            lastRecordDate: null,
            badges: [],
            challenges: []
        };
    },

    saveGamification(data) {
        this.set(this.KEYS.GAMIFICATION, data);
    },

    getQuickInputs() {
        return this.get(this.KEYS.QUICK_INPUTS) || [];
    },

    saveQuickInputs(inputs) {
        this.set(this.KEYS.QUICK_INPUTS, inputs);
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

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    // データ読み込み
    expenses = Storage.getExpenses();
    budgets = Storage.getBudgets();
    linkedAccounts = Storage.getLinkedAccounts();
    incomes = Storage.getIncomes();
    subscriptions = Storage.getSubscriptions();
    goals = Storage.getGoals();
    familyMembers = Storage.getFamilyMembers();
    gamificationData = Storage.getGamification();
    quickInputs = Storage.getQuickInputs();

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
    renderExpenseTable();
    updateBudgetComparison();
    checkStreak();
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
// API連携機能
// ========================================

// API設定
let apiConfigs = {};
let syncLogs = [];
let customApis = [];

// サービス情報マスタ
const SERVICE_INFO = {
    // 家計簿・資産管理サービス
    'moneyforward': {
        name: 'マネーフォワード ME',
        category: 'aggregator',
        defaultConfig: {
            authType: 'oauth2',
            authUrl: 'https://api.moneyforward.com/oauth/authorize',
            tokenUrl: 'https://api.moneyforward.com/oauth/token',
            baseUrl: 'https://api.moneyforward.com/v1',
            balanceEndpoint: '/accounts',
            transactionsEndpoint: '/transactions'
        }
    },
    'zaim': {
        name: 'Zaim',
        category: 'aggregator',
        defaultConfig: {
            authType: 'oauth2',
            authUrl: 'https://api.zaim.net/oauth/authorize',
            tokenUrl: 'https://api.zaim.net/oauth/token',
            baseUrl: 'https://api.zaim.net/v2',
            balanceEndpoint: '/home/money',
            transactionsEndpoint: '/home/money'
        }
    },
    'freee': {
        name: 'freee',
        category: 'aggregator',
        defaultConfig: {
            authType: 'oauth2',
            authUrl: 'https://accounts.secure.freee.co.jp/public_api/authorize',
            tokenUrl: 'https://accounts.secure.freee.co.jp/public_api/token',
            baseUrl: 'https://api.freee.co.jp/api/1',
            balanceEndpoint: '/walletables',
            transactionsEndpoint: '/deals'
        }
    },
    // 銀行
    'mufg': {
        name: '三菱UFJ銀行',
        category: 'bank',
        defaultConfig: {
            authType: 'oauth2',
            baseUrl: 'https://api.bk.mufg.jp/v1'
        }
    },
    'smbc': {
        name: '三井住友銀行',
        category: 'bank',
        defaultConfig: {
            authType: 'oauth2',
            baseUrl: 'https://api.smbc.co.jp/v1'
        }
    },
    'mizuho': {
        name: 'みずほ銀行',
        category: 'bank',
        defaultConfig: {
            authType: 'oauth2',
            baseUrl: 'https://api.mizuhobank.co.jp/v1'
        }
    },
    'rakuten-bank': {
        name: '楽天銀行',
        category: 'bank',
        defaultConfig: {
            authType: 'oauth2',
            baseUrl: 'https://api.rakuten-bank.co.jp/v1'
        }
    },
    // 証券
    'sbi': {
        name: 'SBI証券',
        category: 'securities',
        defaultConfig: {
            authType: 'oauth2',
            baseUrl: 'https://api.sbisec.co.jp/v1'
        }
    },
    'rakuten-sec': {
        name: '楽天証券',
        category: 'securities',
        defaultConfig: {
            authType: 'oauth2',
            baseUrl: 'https://api.rakuten-sec.co.jp/v1'
        }
    },
    'monex': {
        name: 'マネックス証券',
        category: 'securities',
        defaultConfig: {
            authType: 'oauth2',
            baseUrl: 'https://api.monex.co.jp/v1'
        }
    },
    // クレジットカード
    'rakuten-card': {
        name: '楽天カード',
        category: 'credit',
        defaultConfig: {
            authType: 'oauth2',
            baseUrl: 'https://api.rakuten-card.co.jp/v1'
        }
    },
    'aeon-card': {
        name: 'イオンカード',
        category: 'credit',
        defaultConfig: {
            authType: 'oauth2',
            baseUrl: 'https://api.aeon.co.jp/v1'
        }
    },
    // コード決済
    'paypay': {
        name: 'PayPay',
        category: 'qr',
        defaultConfig: {
            authType: 'oauth2',
            authUrl: 'https://api.paypay.ne.jp/oauth/authorize',
            tokenUrl: 'https://api.paypay.ne.jp/oauth/token',
            baseUrl: 'https://api.paypay.ne.jp/v1',
            balanceEndpoint: '/wallet/balance'
        }
    },
    'linepay': {
        name: 'LINE Pay',
        category: 'qr',
        defaultConfig: {
            authType: 'apikey',
            baseUrl: 'https://api-pay.line.me/v3'
        }
    },
    'merpay': {
        name: 'メルペイ',
        category: 'qr',
        defaultConfig: {
            authType: 'oauth2',
            baseUrl: 'https://api.merpay.com/v1'
        }
    },
    'suica': {
        name: 'モバイルSuica',
        category: 'emoney',
        defaultConfig: {
            authType: 'oauth2',
            baseUrl: 'https://api.mobilesuica.com/v1'
        }
    },
    // ポイント
    'rakuten-point': {
        name: '楽天ポイント',
        category: 'points',
        defaultConfig: {
            authType: 'oauth2',
            baseUrl: 'https://api.rakuten.co.jp/point/v1'
        }
    },
    'tpoint': {
        name: 'Tポイント',
        category: 'points',
        defaultConfig: {
            authType: 'oauth2',
            baseUrl: 'https://api.tsite.jp/v1'
        }
    },
    'dpoint': {
        name: 'dポイント',
        category: 'points',
        defaultConfig: {
            authType: 'oauth2',
            baseUrl: 'https://api.d-point.jp/v1'
        }
    },
    // ECサイト
    'amazon': {
        name: 'Amazon',
        category: 'ec',
        defaultConfig: {
            authType: 'oauth2',
            baseUrl: 'https://api.amazon.co.jp/v1'
        }
    },
    'rakuten-ichiba': {
        name: '楽天市場',
        category: 'ec',
        defaultConfig: {
            authType: 'apikey',
            baseUrl: 'https://api.rakuten.co.jp/rms/v1'
        }
    }
};

// API連携モード切替
function initApiLinkMode() {
    const modeBtns = document.querySelectorAll('.link-mode-btn');
    const modeContents = document.querySelectorAll('.link-mode-content');

    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;

            modeBtns.forEach(b => b.classList.remove('active'));
            modeContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(mode === 'api' ? 'apiLinkMode' : 'manualLinkMode').classList.add('active');
        });
    });
}

// API接続設定の初期化
function initApiConnection() {
    // 設定を読み込み
    apiConfigs = Storage.getApiConfigs();
    syncLogs = Storage.getSyncLogs();
    customApis = Storage.getCustomApis();

    // 接続ボタン
    document.querySelectorAll('.api-connect-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const service = btn.dataset.service;
            openApiConfigModal(service);
        });
    });

    // 認証方式切替
    const authTypeSelect = document.getElementById('apiAuthType');
    if (authTypeSelect) {
        authTypeSelect.addEventListener('change', () => {
            updateAuthSettingsVisibility();
        });
    }

    // 接続テストボタン
    const testBtn = document.getElementById('testApiConnection');
    if (testBtn) {
        testBtn.addEventListener('click', testApiConnection);
    }

    // OAuth開始ボタン
    const oauthBtn = document.getElementById('startOAuthFlow');
    if (oauthBtn) {
        oauthBtn.addEventListener('click', startOAuthFlow);
    }

    // 設定保存ボタン
    const saveBtn = document.getElementById('saveApiConfig');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveApiConfig);
    }

    // すべて同期ボタン
    const syncAllBtn = document.getElementById('syncAllBtn');
    if (syncAllBtn) {
        syncAllBtn.addEventListener('click', syncAllServices);
    }

    // カスタムAPI追加ボタン
    const addCustomApiBtn = document.getElementById('addCustomApiBtn');
    if (addCustomApiBtn) {
        addCustomApiBtn.addEventListener('click', () => {
            document.getElementById('customApiModal').classList.add('active');
        });
    }

    // カスタムAPIフォーム
    const customApiForm = document.getElementById('customApiForm');
    if (customApiForm) {
        customApiForm.addEventListener('submit', (e) => {
            e.preventDefault();
            addCustomApi();
        });
    }

    // モーダル閉じるボタン
    document.querySelectorAll('.modal .close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').classList.remove('active');
        });
    });

    // モーダル背景クリック
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });

    // 接続状態を更新
    updateConnectionStatus();
    renderSyncLogs();
    renderCustomApis();

    // リダイレクトURI設定
    const redirectUriInput = document.getElementById('oauthRedirectUri');
    if (redirectUriInput) {
        redirectUriInput.value = window.location.origin + '/callback';
    }
}

// API設定モーダルを開く
function openApiConfigModal(service) {
    const modal = document.getElementById('apiConfigModal');
    const serviceInfo = SERVICE_INFO[service] || { name: service, defaultConfig: {} };
    const existingConfig = apiConfigs[service] || {};

    document.getElementById('apiConfigTitle').textContent = `${serviceInfo.name} - API接続設定`;
    document.getElementById('apiConfigService').value = service;

    // デフォルト設定または既存設定を適用
    const config = { ...serviceInfo.defaultConfig, ...existingConfig };

    document.getElementById('apiAuthType').value = config.authType || 'oauth2';

    // OAuth設定
    document.getElementById('oauthClientId').value = config.clientId || '';
    document.getElementById('oauthClientSecret').value = config.clientSecret || '';
    document.getElementById('oauthAuthUrl').value = config.authUrl || '';
    document.getElementById('oauthTokenUrl').value = config.tokenUrl || '';
    document.getElementById('oauthScopes').value = config.scopes || '';

    // APIキー設定
    document.getElementById('apiKey').value = config.apiKey || '';
    document.getElementById('apiKeyHeader').value = config.apiKeyHeader || 'X-API-Key';

    // Basic認証設定
    document.getElementById('basicUsername').value = config.username || '';
    document.getElementById('basicPassword').value = config.password || '';

    // Bearerトークン設定
    document.getElementById('bearerToken').value = config.accessToken || '';

    // エンドポイント設定
    document.getElementById('apiBaseUrl').value = config.baseUrl || '';
    document.getElementById('apiBalanceEndpoint').value = config.balanceEndpoint || '';
    document.getElementById('apiTransactionsEndpoint').value = config.transactionsEndpoint || '';

    // データマッピング設定
    document.getElementById('mappingBalance').value = config.mappingBalance || 'data.balance';
    document.getElementById('mappingDate').value = config.mappingDate || 'data.transactions[].date';
    document.getElementById('mappingAmount').value = config.mappingAmount || 'data.transactions[].amount';
    document.getElementById('mappingDescription').value = config.mappingDescription || 'data.transactions[].description';

    updateAuthSettingsVisibility();
    modal.classList.add('active');
}

// 認証方式に応じた設定表示切替
function updateAuthSettingsVisibility() {
    const authType = document.getElementById('apiAuthType').value;

    document.getElementById('oauth2Settings').style.display = authType === 'oauth2' ? 'block' : 'none';
    document.getElementById('apikeySettings').style.display = authType === 'apikey' ? 'block' : 'none';
    document.getElementById('basicSettings').style.display = authType === 'basic' ? 'block' : 'none';
    document.getElementById('bearerSettings').style.display = authType === 'bearer' ? 'block' : 'none';

    // OAuthボタンの表示
    const oauthBtn = document.getElementById('startOAuthFlow');
    oauthBtn.style.display = authType === 'oauth2' ? 'inline-block' : 'none';
}

// API設定を保存
function saveApiConfig() {
    const service = document.getElementById('apiConfigService').value;
    const authType = document.getElementById('apiAuthType').value;

    const config = {
        authType,
        baseUrl: document.getElementById('apiBaseUrl').value,
        balanceEndpoint: document.getElementById('apiBalanceEndpoint').value,
        transactionsEndpoint: document.getElementById('apiTransactionsEndpoint').value,
        mappingBalance: document.getElementById('mappingBalance').value,
        mappingDate: document.getElementById('mappingDate').value,
        mappingAmount: document.getElementById('mappingAmount').value,
        mappingDescription: document.getElementById('mappingDescription').value,
        lastUpdated: new Date().toISOString()
    };

    // 認証方式別の設定
    switch (authType) {
        case 'oauth2':
            config.clientId = document.getElementById('oauthClientId').value;
            config.clientSecret = document.getElementById('oauthClientSecret').value;
            config.authUrl = document.getElementById('oauthAuthUrl').value;
            config.tokenUrl = document.getElementById('oauthTokenUrl').value;
            config.scopes = document.getElementById('oauthScopes').value;
            config.redirectUri = document.getElementById('oauthRedirectUri').value;
            break;
        case 'apikey':
            config.apiKey = document.getElementById('apiKey').value;
            config.apiKeyHeader = document.getElementById('apiKeyHeader').value;
            break;
        case 'basic':
            config.username = document.getElementById('basicUsername').value;
            config.password = document.getElementById('basicPassword').value;
            break;
        case 'bearer':
            config.accessToken = document.getElementById('bearerToken').value;
            break;
    }

    apiConfigs[service] = config;
    Storage.saveApiConfigs(apiConfigs);

    addSyncLog('info', `${getServiceName(service)}の設定を保存しました`);
    updateConnectionStatus();

    document.getElementById('apiConfigModal').classList.remove('active');
    alert('API設定を保存しました');
}

// 接続テスト
async function testApiConnection() {
    const service = document.getElementById('apiConfigService').value;
    const resultDiv = document.getElementById('apiTestResult');

    resultDiv.className = 'api-test-result show loading';
    resultDiv.textContent = '接続テスト中...';

    try {
        const config = getConfigFromForm();
        const response = await makeApiRequest(config, config.balanceEndpoint);

        if (response.ok) {
            resultDiv.className = 'api-test-result show success';
            resultDiv.textContent = '接続成功！APIからデータを取得できました。';
            addSyncLog('success', `${getServiceName(service)}への接続テストが成功しました`);
        } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
    } catch (error) {
        resultDiv.className = 'api-test-result show error';
        resultDiv.textContent = `接続失敗: ${error.message}`;
        addSyncLog('error', `${getServiceName(service)}への接続テストが失敗しました: ${error.message}`);
    }
}

// フォームから設定を取得
function getConfigFromForm() {
    const authType = document.getElementById('apiAuthType').value;
    const config = {
        authType,
        baseUrl: document.getElementById('apiBaseUrl').value,
        balanceEndpoint: document.getElementById('apiBalanceEndpoint').value,
        transactionsEndpoint: document.getElementById('apiTransactionsEndpoint').value
    };

    switch (authType) {
        case 'oauth2':
            config.accessToken = apiConfigs[document.getElementById('apiConfigService').value]?.accessToken;
            break;
        case 'apikey':
            config.apiKey = document.getElementById('apiKey').value;
            config.apiKeyHeader = document.getElementById('apiKeyHeader').value;
            break;
        case 'basic':
            config.username = document.getElementById('basicUsername').value;
            config.password = document.getElementById('basicPassword').value;
            break;
        case 'bearer':
            config.accessToken = document.getElementById('bearerToken').value;
            break;
    }

    return config;
}

// APIリクエストを実行
async function makeApiRequest(config, endpoint) {
    const url = config.baseUrl + endpoint;
    const headers = {
        'Content-Type': 'application/json'
    };

    switch (config.authType) {
        case 'oauth2':
        case 'bearer':
            if (config.accessToken) {
                headers['Authorization'] = `Bearer ${config.accessToken}`;
            }
            break;
        case 'apikey':
            headers[config.apiKeyHeader] = config.apiKey;
            break;
        case 'basic':
            const credentials = btoa(`${config.username}:${config.password}`);
            headers['Authorization'] = `Basic ${credentials}`;
            break;
    }

    return fetch(url, {
        method: 'GET',
        headers,
        mode: 'cors'
    });
}

// OAuth認証フローを開始
function startOAuthFlow() {
    const service = document.getElementById('apiConfigService').value;
    const clientId = document.getElementById('oauthClientId').value;
    const authUrl = document.getElementById('oauthAuthUrl').value;
    const redirectUri = document.getElementById('oauthRedirectUri').value;
    const scopes = document.getElementById('oauthScopes').value;

    if (!clientId || !authUrl) {
        alert('クライアントIDと認可エンドポイントを入力してください');
        return;
    }

    // OAuth認可URLを構築
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: scopes,
        state: service
    });

    const fullAuthUrl = `${authUrl}?${params.toString()}`;

    // 新しいウィンドウで認証を開始
    const authWindow = window.open(fullAuthUrl, 'oauth', 'width=600,height=700');

    addSyncLog('info', `${getServiceName(service)}のOAuth認証を開始しました`);

    // 注意: 実際のOAuth実装では、コールバックを受け取るサーバーサイド処理が必要
    alert('OAuth認証ウィンドウが開きました。認証完了後、アクセストークンを「Bearerトークン」欄に入力してください。\n\n※実際の運用では、コールバックを処理するバックエンドサーバーが必要です。');
}

// すべてのサービスを同期
async function syncAllServices() {
    const syncBtn = document.getElementById('syncAllBtn');
    syncBtn.disabled = true;
    syncBtn.classList.add('syncing');
    syncBtn.innerHTML = '<span class="sync-icon">🔄</span> 同期中...';

    const connectedServices = Object.keys(apiConfigs).filter(service =>
        apiConfigs[service].accessToken || apiConfigs[service].apiKey
    );

    if (connectedServices.length === 0) {
        alert('接続されているサービスがありません。先にAPI設定を行ってください。');
        syncBtn.disabled = false;
        syncBtn.classList.remove('syncing');
        syncBtn.innerHTML = '<span class="sync-icon">🔄</span> すべて同期';
        return;
    }

    addSyncLog('info', `${connectedServices.length}件のサービスの同期を開始します`);

    for (const service of connectedServices) {
        await syncService(service);
    }

    // 最終同期時刻を更新
    const now = new Date();
    document.getElementById('lastSyncTime').textContent = now.toLocaleString('ja-JP');

    syncBtn.disabled = false;
    syncBtn.classList.remove('syncing');
    syncBtn.innerHTML = '<span class="sync-icon">🔄</span> すべて同期';

    updateAssetSummary();
    addSyncLog('info', '全サービスの同期が完了しました');
}

// 個別サービスを同期
async function syncService(service) {
    const config = apiConfigs[service];
    const statusEl = document.getElementById(`status-${service}`);

    if (statusEl) {
        statusEl.textContent = '同期中...';
        statusEl.className = 'api-service-status syncing';
    }

    try {
        // 残高を取得
        const balanceResponse = await makeApiRequest(config, config.balanceEndpoint);

        if (balanceResponse.ok) {
            const data = await balanceResponse.json();
            const balance = extractValue(data, config.mappingBalance);

            // 連携口座を更新
            updateLinkedAccountFromApi(service, balance);

            if (statusEl) {
                statusEl.textContent = '接続済';
                statusEl.className = 'api-service-status connected';
            }

            addSyncLog('success', `${getServiceName(service)}の同期が完了しました`);
        } else {
            throw new Error(`HTTP ${balanceResponse.status}`);
        }
    } catch (error) {
        if (statusEl) {
            statusEl.textContent = 'エラー';
            statusEl.className = 'api-service-status error';
        }

        addSyncLog('error', `${getServiceName(service)}の同期に失敗しました: ${error.message}`);
    }
}

// JSONパスから値を抽出
function extractValue(data, path) {
    if (!path) return null;

    const parts = path.replace(/\[\]/g, '.0').split('.');
    let value = data;

    for (const part of parts) {
        if (value === null || value === undefined) return null;
        value = value[part];
    }

    return value;
}

// APIからの残高で連携口座を更新
function updateLinkedAccountFromApi(service, balance) {
    const serviceInfo = SERVICE_INFO[service];
    if (!serviceInfo) return;

    const categoryMap = {
        'bank': 'bank',
        'securities': 'securities',
        'credit': 'credit',
        'qr': 'qr',
        'emoney': 'emoney',
        'points': 'points',
        'ec': 'ec',
        'aggregator': 'bank' // 集約サービスは銀行として扱う
    };

    const accountType = categoryMap[serviceInfo.category] || 'bank';
    const accounts = Storage.getLinkedAccounts();

    // 既存のアカウントを探す
    const existingIndex = accounts[accountType].findIndex(a => a.apiService === service);

    const accountData = {
        name: serviceInfo.name,
        balance: balance || 0,
        apiService: service,
        lastSync: new Date().toISOString()
    };

    if (existingIndex >= 0) {
        accounts[accountType][existingIndex] = accountData;
    } else {
        accounts[accountType].push(accountData);
    }

    Storage.saveLinkedAccounts(accounts);
}

// 接続状態を更新
function updateConnectionStatus() {
    Object.keys(SERVICE_INFO).forEach(service => {
        const statusEl = document.getElementById(`status-${service}`);
        const cardEl = document.querySelector(`.api-service-card[data-service="${service}"]`);
        const config = apiConfigs[service];

        if (statusEl) {
            if (config && (config.accessToken || config.apiKey)) {
                statusEl.textContent = '接続済';
                statusEl.className = 'api-service-status connected';
                if (cardEl) cardEl.classList.add('connected');
            } else if (config) {
                statusEl.textContent = '設定済';
                statusEl.className = 'api-service-status';
            } else {
                statusEl.textContent = '未接続';
                statusEl.className = 'api-service-status';
                if (cardEl) cardEl.classList.remove('connected');
            }
        }
    });
}

// 同期ログを追加
function addSyncLog(type, message) {
    const log = {
        timestamp: new Date().toISOString(),
        type,
        message
    };

    syncLogs.push(log);
    Storage.saveSyncLogs(syncLogs);
    renderSyncLogs();
}

// 同期ログを表示
function renderSyncLogs() {
    const container = document.getElementById('syncLogContent');
    if (!container) return;

    if (syncLogs.length === 0) {
        container.innerHTML = '<p class="no-log">同期履歴はありません</p>';
        return;
    }

    // 最新20件を表示
    const recentLogs = syncLogs.slice(-20).reverse();

    container.innerHTML = recentLogs.map(log => {
        const time = new Date(log.timestamp).toLocaleString('ja-JP');
        return `
            <div class="sync-log-item">
                <span class="sync-log-time">${time}</span>
                <span class="sync-log-message ${log.type}">${escapeHtml(log.message)}</span>
            </div>
        `;
    }).join('');
}

// カスタムAPIを追加
function addCustomApi() {
    const name = document.getElementById('customApiName').value.trim();
    const category = document.getElementById('customApiCategory').value;
    const description = document.getElementById('customApiDescription').value.trim();

    if (!name) {
        alert('サービス名を入力してください');
        return;
    }

    const id = 'custom-' + Date.now();

    const customApi = {
        id,
        name,
        category,
        description,
        createdAt: new Date().toISOString()
    };

    customApis.push(customApi);
    Storage.saveCustomApis(customApis);

    // SERVICE_INFOに追加
    SERVICE_INFO[id] = {
        name,
        category,
        defaultConfig: {
            authType: 'apikey'
        }
    };

    document.getElementById('customApiForm').reset();
    document.getElementById('customApiModal').classList.remove('active');

    renderCustomApis();
    addSyncLog('info', `カスタムAPI「${name}」を追加しました`);
}

// カスタムAPIを表示
function renderCustomApis() {
    const container = document.getElementById('customApiList');
    if (!container) return;

    if (customApis.length === 0) {
        container.innerHTML = '';
        return;
    }

    const categoryLabels = {
        bank: '銀行口座',
        securities: '証券口座',
        credit: 'クレジットカード',
        emoney: '電子マネー',
        qr: 'コード決済',
        points: 'ポイント',
        ec: 'ECサイト',
        other: 'その他'
    };

    container.innerHTML = customApis.map(api => `
        <div class="custom-api-item">
            <span class="api-name">${escapeHtml(api.name)}</span>
            <span class="api-category-badge">${categoryLabels[api.category]}</span>
            <button class="api-connect-btn" data-service="${api.id}" onclick="openApiConfigModal('${api.id}')">設定</button>
            <button class="btn-delete" onclick="deleteCustomApi('${api.id}')">削除</button>
        </div>
    `).join('');

    // SERVICE_INFOにカスタムAPIを追加
    customApis.forEach(api => {
        if (!SERVICE_INFO[api.id]) {
            SERVICE_INFO[api.id] = {
                name: api.name,
                category: api.category,
                defaultConfig: { authType: 'apikey' }
            };
        }
    });
}

// カスタムAPIを削除
function deleteCustomApi(id) {
    if (!confirm('このカスタムAPIを削除しますか？')) return;

    customApis = customApis.filter(api => api.id !== id);
    Storage.saveCustomApis(customApis);

    delete SERVICE_INFO[id];
    delete apiConfigs[id];
    Storage.saveApiConfigs(apiConfigs);

    renderCustomApis();
    addSyncLog('info', 'カスタムAPIを削除しました');
}

// サービス名を取得
function getServiceName(service) {
    return SERVICE_INFO[service]?.name || service;
}

// DOMContentLoadedで初期化
document.addEventListener('DOMContentLoaded', () => {
    initApiLinkMode();
    initApiConnection();
});

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
