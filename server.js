// 家計簿アプリ - バックエンドサーバー
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// ミドルウェア
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

// データベース初期化
db.initializeDatabase();

// ========================================
// 支出 API
// ========================================
app.get('/api/expenses', (req, res) => {
    try {
        res.json(db.expenses.getAll());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/expenses', (req, res) => {
    try {
        const expense = db.expenses.create(req.body);
        res.status(201).json(expense);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/expenses/:id', (req, res) => {
    try {
        const updated = db.expenses.update(parseInt(req.params.id), req.body);
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/expenses', (req, res) => {
    try {
        db.expenses.deleteAll();
        if (Array.isArray(req.body) && req.body.length > 0) {
            db.expenses.bulkInsert(req.body);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/expenses/:id', (req, res) => {
    try {
        db.expenses.delete(parseInt(req.params.id));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/expenses', (req, res) => {
    try {
        db.expenses.deleteAll();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/expenses/bulk', (req, res) => {
    try {
        db.expenses.bulkInsert(req.body);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========================================
// 収入 API
// ========================================
app.get('/api/incomes', (req, res) => {
    try {
        res.json(db.incomes.getAll());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/incomes', (req, res) => {
    try {
        const income = db.incomes.create(req.body);
        res.status(201).json(income);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/incomes', (req, res) => {
    try {
        db.incomes.deleteAll();
        if (Array.isArray(req.body) && req.body.length > 0) {
            db.incomes.bulkInsert(req.body);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/incomes/:id', (req, res) => {
    try {
        db.incomes.delete(parseInt(req.params.id));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/incomes', (req, res) => {
    try {
        db.incomes.deleteAll();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/incomes/bulk', (req, res) => {
    try {
        db.incomes.bulkInsert(req.body);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========================================
// 予算 API
// ========================================
app.get('/api/budgets', (req, res) => {
    try {
        res.json(db.budgets.getAll());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/budgets', (req, res) => {
    try {
        db.budgets.save(req.body);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/budgets', (req, res) => {
    try {
        db.budgets.deleteAll();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========================================
// 定期支出 API
// ========================================
app.get('/api/subscriptions', (req, res) => {
    try {
        res.json(db.subscriptions.getAll());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/subscriptions', (req, res) => {
    try {
        const sub = db.subscriptions.create(req.body);
        res.status(201).json(sub);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/subscriptions', (req, res) => {
    try {
        db.subscriptions.deleteAll();
        if (Array.isArray(req.body) && req.body.length > 0) {
            db.subscriptions.bulkInsert(req.body);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/subscriptions/:id', (req, res) => {
    try {
        db.subscriptions.update(parseInt(req.params.id), req.body);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/subscriptions/:id', (req, res) => {
    try {
        db.subscriptions.delete(parseInt(req.params.id));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/subscriptions', (req, res) => {
    try {
        db.subscriptions.deleteAll();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/subscriptions/bulk', (req, res) => {
    try {
        db.subscriptions.bulkInsert(req.body);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========================================
// 目標 API
// ========================================
app.get('/api/goals', (req, res) => {
    try {
        res.json(db.goals.getAll());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/goals', (req, res) => {
    try {
        const goal = db.goals.create(req.body);
        res.status(201).json(goal);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/goals', (req, res) => {
    try {
        db.goals.deleteAll();
        if (Array.isArray(req.body) && req.body.length > 0) {
            db.goals.bulkInsert(req.body);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/goals/:id', (req, res) => {
    try {
        db.goals.update(parseInt(req.params.id), req.body);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/goals/:id', (req, res) => {
    try {
        db.goals.delete(parseInt(req.params.id));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/goals', (req, res) => {
    try {
        db.goals.deleteAll();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/goals/bulk', (req, res) => {
    try {
        db.goals.bulkInsert(req.body);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========================================
// 家族メンバー API
// ========================================
app.get('/api/family', (req, res) => {
    try {
        res.json(db.family.getAll());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/family', (req, res) => {
    try {
        const member = db.family.create(req.body);
        res.status(201).json(member);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/family', (req, res) => {
    try {
        db.family.deleteAll();
        if (Array.isArray(req.body) && req.body.length > 0) {
            db.family.bulkInsert(req.body);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/family/:id', (req, res) => {
    try {
        db.family.delete(parseInt(req.params.id));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/family', (req, res) => {
    try {
        db.family.deleteAll();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/family/bulk', (req, res) => {
    try {
        db.family.bulkInsert(req.body);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========================================
// ゲーミフィケーション API
// ========================================
app.get('/api/gamification', (req, res) => {
    try {
        res.json(db.gamification.get());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/gamification', (req, res) => {
    try {
        db.gamification.save(req.body);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========================================
// 連携口座 API
// ========================================
app.get('/api/linked-accounts', (req, res) => {
    try {
        res.json(db.linkedAccounts.getAll());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/linked-accounts', (req, res) => {
    try {
        db.linkedAccounts.save(req.body);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========================================
// アカウント連携 API
// ========================================
app.get('/api/connected-accounts', (req, res) => {
    try {
        res.json(db.connectedAccounts.getAll());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/connected-accounts', (req, res) => {
    try {
        db.connectedAccounts.save(req.body);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========================================
// 同期ログ API
// ========================================
app.get('/api/sync-logs', (req, res) => {
    try {
        res.json(db.syncLogs.getAll());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/sync-logs', (req, res) => {
    try {
        db.syncLogs.save(req.body);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========================================
// クイック入力 API
// ========================================
app.get('/api/quick-inputs', (req, res) => {
    try {
        res.json(db.quickInputs.getAll());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/quick-inputs', (req, res) => {
    try {
        const input = db.quickInputs.create(req.body);
        res.status(201).json(input);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/quick-inputs', (req, res) => {
    try {
        db.quickInputs.deleteAll();
        if (Array.isArray(req.body) && req.body.length > 0) {
            db.quickInputs.bulkInsert(req.body);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/quick-inputs/:id', (req, res) => {
    try {
        db.quickInputs.delete(parseInt(req.params.id));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/quick-inputs', (req, res) => {
    try {
        db.quickInputs.deleteAll();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/quick-inputs/bulk', (req, res) => {
    try {
        db.quickInputs.bulkInsert(req.body);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========================================
// 全データ一括操作
// ========================================

// 全データ取得
app.get('/api/all-data', (req, res) => {
    try {
        res.json({
            expenses: db.expenses.getAll(),
            incomes: db.incomes.getAll(),
            budgets: db.budgets.getAll(),
            subscriptions: db.subscriptions.getAll(),
            goals: db.goals.getAll(),
            familyMembers: db.family.getAll(),
            gamification: db.gamification.get(),
            linkedAccounts: db.linkedAccounts.getAll(),
            connectedAccounts: db.connectedAccounts.getAll(),
            syncLogs: db.syncLogs.getAll(),
            quickInputs: db.quickInputs.getAll()
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 全データ削除
app.delete('/api/all-data', (req, res) => {
    try {
        db.expenses.deleteAll();
        db.incomes.deleteAll();
        db.budgets.deleteAll();
        db.subscriptions.deleteAll();
        db.goals.deleteAll();
        db.family.deleteAll();
        db.gamification.save({ level: 1, exp: 0, currentStreak: 0, maxStreak: 0, lastRecordDate: null, badges: [], challenges: [] });
        db.linkedAccounts.save({ bank: [], securities: [], credit: [], emoney: [], qr: [], points: [], ec: [] });
        db.connectedAccounts.save({});
        db.syncLogs.save([]);
        db.quickInputs.deleteAll();
        res.json({ success: true, message: '全データを削除しました' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// HTMLフォールバック（SPA対応）
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// サーバー起動
const server = app.listen(PORT, () => {
    console.log(`家計簿アプリサーバーが起動しました: http://localhost:${PORT}`);
});

// 終了処理
process.on('SIGINT', () => {
    console.log('\nサーバーを終了します...');
    db.closeDatabase();
    server.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    db.closeDatabase();
    server.close();
    process.exit(0);
});

module.exports = app;
