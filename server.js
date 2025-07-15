const express = require('express');
const { Pool } = require('pg'); // وارد کردن درایور PostgreSQL
const path = require('path');

const app = express();
const PORT = 3500;

// --- تنظیمات اتصال به PostgreSQL ---
// اطلاعات اتصال به پایگاه داده خود را اینجا وارد کنید
// برای سادگی، اطلاعات به صورت مستقیم نوشته شده‌اند.
// در یک پروژه واقعی بهتر است از متغیرهای محیطی (Environment Variables) استفاده کنید.
const pool = new Pool({
    user: 'postgres',       // نام کاربری دیتابیس شما
    host: 'localhost',
    database: 'notesdb',    // نام دیتابیسی که ساختید
    password: 'postgres', // رمز عبور کاربر postgres (اگر تنظیم کرده‌اید)
    port: 5432,
});

// Middleware برای خواندن JSON از درخواست‌ها و ارائه فایل‌های استاتیک
app.use(express.json());
app.use(express.static('public'));

// --- تعریف API ها با استفاده از PostgreSQL ---

// GET /api/notes - دریافت لیست تمام یادداشت‌ها
app.get('/api/notes', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM notes ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// POST /api/notes - افزودن یک یادداشت جدید
app.post('/api/notes', async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).send('Text is required');
        }
        const newNote = await pool.query(
            'INSERT INTO notes (text) VALUES ($1) RETURNING *',
            [text]
        );
        res.status(201).json(newNote.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// PUT /api/notes/:id - ویرایش یک یادداشت
app.put('/api/notes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { text } = req.body;
        const result = await pool.query(
            'UPDATE notes SET text = $1 WHERE id = $2 RETURNING *',
            [text, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).send('Note not found');
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// DELETE /api/notes/:id - حذف یک یادداشت
app.delete('/api/notes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM notes WHERE id = $1 RETURNING *', [id]);

        if (result.rowCount === 0) {
            return res.status(404).send('Note not found');
        }
        res.status(204).send(); // پاسخ موفقیت بدون محتوا
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// اجرای سرور
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT} and connected to PostgreSQL`);
});