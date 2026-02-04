const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Supabase
const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_ANON_KEY || ''
);

// 支出一覧取得
app.get('/api/expenses', async (req, res) => {
    const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// 支出追加
app.post('/api/expenses', async (req, res) => {
    const { date, description, amount } = req.body;
    const { data, error } = await supabase
        .from('expenses')
        .insert({ date, description, amount })
        .select();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
});

// 支出削除
app.delete('/api/expenses/:id', async (req, res) => {
    const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// ページ
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
