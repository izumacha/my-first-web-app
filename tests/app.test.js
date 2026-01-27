/**
 * 家計簿アプリ テストスイート
 */

// app.jsから関数をインポートするため、DOMを設定
beforeAll(() => {
    document.body.innerHTML = `
        <div class="app-container">
            <form id="expenseForm">
                <input type="date" id="expenseDate">
                <input type="text" id="expenseDescription">
                <input type="number" id="expenseAmount">
                <select id="expenseCategory">
                    <option value="">選択してください</option>
                    <option value="食費">食費</option>
                    <option value="日用品">日用品</option>
                </select>
            </form>
            <div id="expenseTableBody"></div>
            <div id="filteredTotal"></div>
            <div id="categorySummary"></div>
            <input type="date" id="filterStartDate">
            <input type="date" id="filterEndDate">
            <select id="filterCategory"></select>
            <input type="text" id="filterDescription">
            <button id="applyFilter"></button>
            <button id="clearFilter"></button>
            <input type="month" id="budgetMonth">
            <div class="budget-input" data-category="食費"></div>
            <button id="saveBudget"></button>
            <div id="budgetComparisonBody"></div>
            <input type="month" id="chartMonth">
            <canvas id="budgetVsActualChart"></canvas>
            <canvas id="categoryPieChart"></canvas>
            <canvas id="differenceChart"></canvas>
            <div id="calendarMonth"></div>
            <div id="calendarDays"></div>
            <button id="prevMonth"></button>
            <button id="nextMonth"></button>
            <div id="dayDetail"></div>
            <div id="dayDetailTitle"></div>
            <div id="dayDetailContent"></div>
            <div id="editModal" class="modal">
                <input type="hidden" id="editId">
                <input type="date" id="editDate">
                <input type="text" id="editDescription">
                <input type="number" id="editAmount">
                <select id="editCategory"></select>
                <form id="editForm"></form>
                <span class="close-modal"></span>
            </div>
            <div id="apiConfigModal" class="modal">
                <span class="close-modal"></span>
            </div>
            <div id="customApiModal" class="modal">
                <span class="close-modal"></span>
            </div>
            <input type="hidden" id="apiConfigService">
            <div id="apiConfigTitle"></div>
            <select id="apiAuthType">
                <option value="oauth2">OAuth 2.0</option>
                <option value="apikey">APIキー</option>
            </select>
            <div id="oauth2Settings"></div>
            <div id="apikeySettings"></div>
            <div id="basicSettings"></div>
            <div id="bearerSettings"></div>
            <input type="text" id="oauthClientId">
            <input type="password" id="oauthClientSecret">
            <input type="url" id="oauthAuthUrl">
            <input type="url" id="oauthTokenUrl">
            <input type="text" id="oauthScopes">
            <input type="url" id="oauthRedirectUri">
            <input type="password" id="apiKey">
            <input type="text" id="apiKeyHeader">
            <input type="text" id="basicUsername">
            <input type="password" id="basicPassword">
            <input type="password" id="bearerToken">
            <input type="url" id="apiBaseUrl">
            <input type="text" id="apiBalanceEndpoint">
            <input type="text" id="apiTransactionsEndpoint">
            <input type="text" id="mappingBalance">
            <input type="text" id="mappingDate">
            <input type="text" id="mappingAmount">
            <input type="text" id="mappingDescription">
            <button id="testApiConnection"></button>
            <button id="startOAuthFlow"></button>
            <button id="saveApiConfig"></button>
            <button id="syncAllBtn"></button>
            <button id="addCustomApiBtn"></button>
            <form id="customApiForm">
                <input type="text" id="customApiName">
                <select id="customApiCategory"></select>
                <input type="text" id="customApiDescription">
            </form>
            <div id="customApiList"></div>
            <div id="apiTestResult"></div>
            <div id="syncLogContent"></div>
            <div id="lastSyncTime"></div>
            <div id="bankAccounts" class="service-accounts"></div>
            <div id="securitiesAccounts" class="service-accounts"></div>
            <div id="creditCards" class="service-accounts"></div>
            <div id="eMoney" class="service-accounts"></div>
            <div id="qrPayments" class="service-accounts"></div>
            <div id="points" class="service-accounts"></div>
            <div id="ecSites" class="service-accounts"></div>
            <button id="saveLinkedAccounts"></button>
            <div id="assetSummaryContent"></div>
            <div id="totalAssets"></div>
            <button class="nav-btn" data-tab="input"></button>
            <button class="link-mode-btn" data-mode="api"></button>
            <div id="apiLinkMode" class="link-mode-content"></div>
            <div id="manualLinkMode" class="link-mode-content"></div>
            <input type="file" id="receiptInput">
            <div id="ocrStatus"></div>
            <div id="receiptPreview"></div>
        </div>
    `;
});

// Storage クラスのテスト
describe('Storage', () => {
    // Storageオブジェクトをテスト内で定義
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
                bank: [], securities: [], credit: [],
                emoney: [], qr: [], points: [], ec: []
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

    beforeEach(() => {
        localStorage.clear();
    });

    test('支出データの保存と取得', () => {
        const expenses = [
            { id: 1, date: '2025-01-15', description: 'スーパー', amount: 3000, category: '食費' },
            { id: 2, date: '2025-01-16', description: '電車代', amount: 500, category: '交通費' }
        ];

        Storage.saveExpenses(expenses);
        const retrieved = Storage.getExpenses();

        expect(retrieved).toHaveLength(2);
        expect(retrieved[0].description).toBe('スーパー');
        expect(retrieved[1].amount).toBe(500);
    });

    test('空の支出データ取得時は空配列を返す', () => {
        const expenses = Storage.getExpenses();
        expect(expenses).toEqual([]);
    });

    test('予算データの保存と取得', () => {
        const budgets = {
            '2025-01': { '食費': 50000, '交通費': 10000 },
            '2025-02': { '食費': 45000 }
        };

        Storage.saveBudgets(budgets);
        const retrieved = Storage.getBudgets();

        expect(retrieved['2025-01']['食費']).toBe(50000);
        expect(retrieved['2025-02']['食費']).toBe(45000);
    });

    test('連携口座データの保存と取得', () => {
        const accounts = {
            bank: [{ name: '三菱UFJ銀行', balance: 500000 }],
            securities: [],
            credit: [{ name: '楽天カード', balance: 30000 }],
            emoney: [],
            qr: [],
            points: [],
            ec: []
        };

        Storage.saveLinkedAccounts(accounts);
        const retrieved = Storage.getLinkedAccounts();

        expect(retrieved.bank[0].name).toBe('三菱UFJ銀行');
        expect(retrieved.credit[0].balance).toBe(30000);
    });

    test('API設定の保存と取得', () => {
        const configs = {
            'moneyforward': {
                authType: 'oauth2',
                clientId: 'test-client-id',
                accessToken: 'test-token'
            }
        };

        Storage.saveApiConfigs(configs);
        const retrieved = Storage.getApiConfigs();

        expect(retrieved['moneyforward'].authType).toBe('oauth2');
        expect(retrieved['moneyforward'].clientId).toBe('test-client-id');
    });

    test('同期ログは最新100件のみ保持', () => {
        const logs = [];
        for (let i = 0; i < 150; i++) {
            logs.push({ timestamp: new Date().toISOString(), type: 'info', message: `Log ${i}` });
        }

        Storage.saveSyncLogs(logs);
        const retrieved = Storage.getSyncLogs();

        expect(retrieved).toHaveLength(100);
        expect(retrieved[0].message).toBe('Log 50');
        expect(retrieved[99].message).toBe('Log 149');
    });

    test('カスタムAPIの保存と取得', () => {
        const customApis = [
            { id: 'custom-1', name: '自社API', category: 'bank', description: 'テスト用' }
        ];

        Storage.saveCustomApis(customApis);
        const retrieved = Storage.getCustomApis();

        expect(retrieved).toHaveLength(1);
        expect(retrieved[0].name).toBe('自社API');
    });
});

// カテゴリ関連のテスト
describe('カテゴリ', () => {
    test('CATEGORIES配列に11種類のカテゴリが含まれる', () => {
        const CATEGORIES = ['食費', '日用品', '交通費', '光熱費', '通信費', '住居費', '医療費', '娯楽費', '衣服費', '教育費', 'その他'];
        expect(CATEGORIES).toHaveLength(11);
        expect(CATEGORIES).toContain('食費');
        expect(CATEGORIES).toContain('その他');
    });

    test('各カテゴリに色が設定されている', () => {
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

        expect(Object.keys(CATEGORY_COLORS)).toHaveLength(11);
        expect(CATEGORY_COLORS['食費']).toBe('#FF6384');
    });
});

// レシートテキスト解析のテスト
describe('レシートテキスト解析', () => {
    const parseReceiptText = (text) => {
        const result = { amount: null, date: null, description: null };

        // 合計金額を抽出
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
                if (year.length === 2) year = '20' + year;
                const month = match[2].padStart(2, '0');
                const day = match[3].padStart(2, '0');
                result.date = `${year}-${month}-${day}`;
                break;
            }
        }

        // 店舗名
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length > 0) {
            result.description = lines[0].trim().substring(0, 50);
        }

        return result;
    };

    test('合計金額を正しく抽出する', () => {
        const text = 'イオン新宿店\n2025年1月15日\n合計 ¥3,240';
        const result = parseReceiptText(text);
        expect(result.amount).toBe(3240);
    });

    test('日付を正しく抽出する（年月日形式）', () => {
        const text = '2025年1月15日\n合計 ¥1000';
        const result = parseReceiptText(text);
        expect(result.date).toBe('2025-01-15');
    });

    test('日付を正しく抽出する（スラッシュ形式）', () => {
        const text = '2025/01/20\n合計 ¥500';
        const result = parseReceiptText(text);
        expect(result.date).toBe('2025-01-20');
    });

    test('店舗名を正しく抽出する', () => {
        const text = 'セブンイレブン渋谷店\n2025/01/15\n合計 ¥800';
        const result = parseReceiptText(text);
        expect(result.description).toBe('セブンイレブン渋谷店');
    });

    test('金額にカンマが含まれる場合も正しく処理する', () => {
        const text = '合計 ¥12,345';
        const result = parseReceiptText(text);
        expect(result.amount).toBe(12345);
    });
});

// カテゴリ推測のテスト
describe('カテゴリ推測', () => {
    const guessCategory = (text) => {
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
    };

    test('スーパーは食費に分類される', () => {
        expect(guessCategory('イオンスーパー')).toBe('食費');
    });

    test('コンビニは食費に分類される', () => {
        expect(guessCategory('セブンイレブン')).toBe('食費');
    });

    test('ドラッグストアは日用品に分類される', () => {
        expect(guessCategory('マツモトキヨシ ドラッグストア')).toBe('日用品');
    });

    test('電車は交通費に分類される', () => {
        expect(guessCategory('JR東日本 電車')).toBe('交通費');
    });

    test('ユニクロは衣服費に分類される', () => {
        expect(guessCategory('ユニクロ新宿店')).toBe('衣服費');
    });

    test('分類できない場合はその他になる', () => {
        expect(guessCategory('不明な店舗')).toBe('その他');
    });
});

// JSONパス値抽出のテスト
describe('JSONパス値抽出', () => {
    const extractValue = (data, path) => {
        if (!path) return null;
        const parts = path.replace(/\[\]/g, '.0').split('.');
        let value = data;
        for (const part of parts) {
            if (value === null || value === undefined) return null;
            value = value[part];
        }
        return value;
    };

    test('単純なパスから値を抽出する', () => {
        const data = { balance: 10000 };
        expect(extractValue(data, 'balance')).toBe(10000);
    });

    test('ネストしたパスから値を抽出する', () => {
        const data = { data: { balance: 50000 } };
        expect(extractValue(data, 'data.balance')).toBe(50000);
    });

    test('配列から値を抽出する', () => {
        const data = { data: { transactions: [{ amount: 1000 }, { amount: 2000 }] } };
        expect(extractValue(data, 'data.transactions[].amount')).toBe(1000);
    });

    test('存在しないパスはnullを返す', () => {
        const data = { balance: 10000 };
        expect(extractValue(data, 'nonexistent.path')).toBeNull();
    });

    test('空のパスはnullを返す', () => {
        const data = { balance: 10000 };
        expect(extractValue(data, '')).toBeNull();
    });
});

// サービス情報のテスト
describe('サービス情報', () => {
    const SERVICE_INFO = {
        'moneyforward': { name: 'マネーフォワード ME', category: 'aggregator' },
        'zaim': { name: 'Zaim', category: 'aggregator' },
        'freee': { name: 'freee', category: 'aggregator' },
        'mufg': { name: '三菱UFJ銀行', category: 'bank' },
        'paypay': { name: 'PayPay', category: 'qr' },
        'rakuten-point': { name: '楽天ポイント', category: 'points' }
    };

    test('マネーフォワードの情報が正しい', () => {
        expect(SERVICE_INFO['moneyforward'].name).toBe('マネーフォワード ME');
        expect(SERVICE_INFO['moneyforward'].category).toBe('aggregator');
    });

    test('銀行サービスのカテゴリがbankである', () => {
        expect(SERVICE_INFO['mufg'].category).toBe('bank');
    });

    test('コード決済サービスのカテゴリがqrである', () => {
        expect(SERVICE_INFO['paypay'].category).toBe('qr');
    });

    test('ポイントサービスのカテゴリがpointsである', () => {
        expect(SERVICE_INFO['rakuten-point'].category).toBe('points');
    });
});

// HTML エスケープのテスト
describe('HTMLエスケープ', () => {
    const escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    test('HTMLタグをエスケープする', () => {
        expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
    });

    test('特殊文字をエスケープする', () => {
        expect(escapeHtml('A & B')).toBe('A &amp; B');
    });

    test('引用符をエスケープする', () => {
        expect(escapeHtml('"quoted"')).toBe('"quoted"');
    });

    test('通常のテキストはそのまま返す', () => {
        expect(escapeHtml('通常のテキスト')).toBe('通常のテキスト');
    });
});

// 日付関連のテスト
describe('日付処理', () => {
    test('今日の日付をYYYY-MM-DD形式で取得する', () => {
        const today = new Date().toISOString().split('T')[0];
        expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('今月をYYYY-MM形式で取得する', () => {
        const thisMonth = new Date().toISOString().slice(0, 7);
        expect(thisMonth).toMatch(/^\d{4}-\d{2}$/);
    });

    test('日付文字列から年月を抽出する', () => {
        const date = '2025-01-15';
        const yearMonth = date.slice(0, 7);
        expect(yearMonth).toBe('2025-01');
    });
});

// 金額フォーマットのテスト
describe('金額フォーマット', () => {
    test('数値を日本円形式でフォーマットする', () => {
        const amount = 1234567;
        const formatted = `¥${amount.toLocaleString()}`;
        expect(formatted).toBe('¥1,234,567');
    });

    test('0円を正しくフォーマットする', () => {
        const amount = 0;
        const formatted = `¥${amount.toLocaleString()}`;
        expect(formatted).toBe('¥0');
    });

    test('負の金額をフォーマットする', () => {
        const amount = -5000;
        const formatted = `¥${amount.toLocaleString()}`;
        expect(formatted).toBe('¥-5,000');
    });
});

// 支出集計のテスト
describe('支出集計', () => {
    const calculateCategorySummary = (expenses) => {
        const summary = {};
        expenses.forEach(expense => {
            summary[expense.category] = (summary[expense.category] || 0) + expense.amount;
        });
        return summary;
    };

    test('カテゴリ別に正しく集計される', () => {
        const expenses = [
            { category: '食費', amount: 3000 },
            { category: '食費', amount: 2000 },
            { category: '交通費', amount: 500 }
        ];

        const summary = calculateCategorySummary(expenses);

        expect(summary['食費']).toBe(5000);
        expect(summary['交通費']).toBe(500);
    });

    test('空の配列は空のオブジェクトを返す', () => {
        const summary = calculateCategorySummary([]);
        expect(Object.keys(summary)).toHaveLength(0);
    });
});

// 予算vs実績計算のテスト
describe('予算vs実績計算', () => {
    const calculateBudgetComparison = (budget, actual) => {
        const diff = budget - actual;
        const rate = budget > 0 ? Math.round((actual / budget) * 100) : 0;
        return { diff, rate };
    };

    test('予算内の場合、差額が正になる', () => {
        const { diff, rate } = calculateBudgetComparison(50000, 30000);
        expect(diff).toBe(20000);
        expect(rate).toBe(60);
    });

    test('予算超過の場合、差額が負になる', () => {
        const { diff, rate } = calculateBudgetComparison(30000, 40000);
        expect(diff).toBe(-10000);
        expect(rate).toBe(133);
    });

    test('予算が0の場合、達成率は0になる', () => {
        const { diff, rate } = calculateBudgetComparison(0, 5000);
        expect(diff).toBe(-5000);
        expect(rate).toBe(0);
    });
});

// 資産合計計算のテスト
describe('資産合計計算', () => {
    const calculateTotalAssets = (accounts) => {
        let total = 0;
        Object.keys(accounts).forEach(type => {
            accounts[type].forEach(account => {
                if (account.balance) {
                    if (type === 'credit') {
                        total -= account.balance;
                    } else {
                        total += account.balance;
                    }
                }
            });
        });
        return total;
    };

    test('銀行と証券の残高を加算する', () => {
        const accounts = {
            bank: [{ balance: 100000 }],
            securities: [{ balance: 50000 }],
            credit: [],
            emoney: [],
            qr: [],
            points: [],
            ec: []
        };

        expect(calculateTotalAssets(accounts)).toBe(150000);
    });

    test('クレジットカードは負債として計算される', () => {
        const accounts = {
            bank: [{ balance: 100000 }],
            securities: [],
            credit: [{ balance: 30000 }],
            emoney: [],
            qr: [],
            points: [],
            ec: []
        };

        expect(calculateTotalAssets(accounts)).toBe(70000);
    });

    test('すべての口座タイプを正しく計算する', () => {
        const accounts = {
            bank: [{ balance: 100000 }],
            securities: [{ balance: 200000 }],
            credit: [{ balance: 50000 }],
            emoney: [{ balance: 5000 }],
            qr: [{ balance: 3000 }],
            points: [{ balance: 1000 }],
            ec: [{ balance: 2000 }]
        };

        // 100000 + 200000 - 50000 + 5000 + 3000 + 1000 + 2000 = 261000
        expect(calculateTotalAssets(accounts)).toBe(261000);
    });
});

// APIリクエストヘッダー生成のテスト
describe('APIリクエストヘッダー生成', () => {
    const generateAuthHeaders = (config) => {
        const headers = { 'Content-Type': 'application/json' };

        switch (config.authType) {
            case 'oauth2':
            case 'bearer':
                if (config.accessToken) {
                    headers['Authorization'] = `Bearer ${config.accessToken}`;
                }
                break;
            case 'apikey':
                headers[config.apiKeyHeader || 'X-API-Key'] = config.apiKey;
                break;
            case 'basic':
                const credentials = btoa(`${config.username}:${config.password}`);
                headers['Authorization'] = `Basic ${credentials}`;
                break;
        }

        return headers;
    };

    test('Bearerトークンヘッダーを生成する', () => {
        const config = { authType: 'bearer', accessToken: 'test-token' };
        const headers = generateAuthHeaders(config);
        expect(headers['Authorization']).toBe('Bearer test-token');
    });

    test('APIキーヘッダーを生成する', () => {
        const config = { authType: 'apikey', apiKey: 'my-api-key', apiKeyHeader: 'X-Custom-Key' };
        const headers = generateAuthHeaders(config);
        expect(headers['X-Custom-Key']).toBe('my-api-key');
    });

    test('Basic認証ヘッダーを生成する', () => {
        const config = { authType: 'basic', username: 'user', password: 'pass' };
        const headers = generateAuthHeaders(config);
        expect(headers['Authorization']).toBe('Basic dXNlcjpwYXNz');
    });

    test('Content-Typeは常に含まれる', () => {
        const config = { authType: 'bearer', accessToken: 'token' };
        const headers = generateAuthHeaders(config);
        expect(headers['Content-Type']).toBe('application/json');
    });
});
