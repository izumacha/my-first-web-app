// 家計簿アプリ - メインJavaScript

// データストレージ
const Storage = {
    KEYS: {
        EXPENSES: 'household_expenses',
        BUDGETS: 'household_budgets',
        LINKED_ACCOUNTS: 'household_linked_accounts',
        API_CONFIGS: 'household_api_configs',
        SYNC_LOGS: 'household_sync_logs',
        CUSTOM_APIS: 'household_custom_apis'
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

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    // データ読み込み
    expenses = Storage.getExpenses();
    budgets = Storage.getBudgets();
    linkedAccounts = Storage.getLinkedAccounts();

    // 各機能の初期化
    initTabs();
    initExpenseForm();
    initReceiptOCR();
    initFilter();
    initBudget();
    initCalendar();
    initLinkedAccounts();
    initEditModal();

    // 今日の日付をデフォルトに設定
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('expenseDate').value = today;

    // 今月をデフォルトに設定
    const thisMonth = new Date().toISOString().slice(0, 7);
    document.getElementById('budgetMonth').value = thisMonth;
    document.getElementById('chartMonth').value = thisMonth;

    // 初期表示
    renderExpenseTable();
    updateBudgetComparison();
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

// グローバル関数として公開
window.openEditModal = openEditModal;
window.deleteExpense = deleteExpense;
window.openApiConfigModal = openApiConfigModal;
window.deleteCustomApi = deleteCustomApi;
