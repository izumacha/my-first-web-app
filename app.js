// 家計簿アプリ - メインJavaScript

// データストレージ
const Storage = {
    KEYS: {
        EXPENSES: 'household_expenses',
        BUDGETS: 'household_budgets',
        LINKED_ACCOUNTS: 'household_linked_accounts'
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

// グローバル関数として公開
window.openEditModal = openEditModal;
window.deleteExpense = deleteExpense;
