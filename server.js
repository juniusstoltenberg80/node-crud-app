require('dotenv').config();
const express = require('express');
const {Pool} = require('pg');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'notesdb',
    password: process.env.DB_PASSWORD || 'postgres',
    port: Number(process.env.DB_PORT) || 5432,
});

pool.on('error', (err) => {
    console.error('PG Pool error:', err);
});

async function initDb() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1) اگر جدول نبود بساز
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.notes
            (
                id
                BIGSERIAL
                PRIMARY
                KEY,
                text
                TEXT
                NOT
                NULL
                -- توجه: عمداً created_at/updated_at رو اینجا تضمین نمی‌کنیم
                -- چون اگر جدول قبلاً بدونشون ساخته شده باشه، این بلوک تغییری نمی‌دهد.
            );
        `);

        // 2) ستون‌های زمانی را اگر نبودن اضافه کن
        await client.query(`
            ALTER TABLE public.notes
                ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
        `);

        // 3) ایندکس بعد از تضمین ستون‌ها
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_notes_created_at
                ON public.notes (created_at DESC);
        `);

        await client.query('COMMIT');
        console.log('✅ Database bootstrapped (columns/index ensured).');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ initDb failed:', e);
        throw e;
    } finally {
        client.release();
    }
}

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// API ها
app.get('/api/notes', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, text, created_at, updated_at FROM public.notes ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        console.error('GET /api/notes error:', err);
        res.status(500).send('Server Error');
    }
});

app.post('/api/notes', async (req, res) => {
    try {
        const {text} = req.body;
        if (!text || typeof text !== 'string' || text.trim() === '') {
            return res.status(400).send('Text is required');
        }
        const {rows} = await pool.query('INSERT INTO public.notes (text) VALUES ($1) RETURNING id, text, created_at, updated_at', [text]);
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('POST /api/notes error:', err);
        res.status(500).send('Server Error');
    }
});

app.put('/api/notes/:id', async (req, res) => {
    try {
        const {id} = req.params;
        const {text} = req.body;
        if (!text || typeof text !== 'string' || text.trim() === '') {
            return res.status(400).send('Text is required');
        }
        const {rows} = await pool.query('UPDATE public.notes SET text = $1, updated_at = NOW() WHERE id = $2 RETURNING id, text, created_at, updated_at', [text, id]);
        if (rows.length === 0) return res.status(404).send('Note not found');
        res.json(rows[0]);
    } catch (err) {
        console.error('PUT /api/notes/:id error:', err);
        res.status(500).send('Server Error');
    }
});

app.delete('/api/notes/:id', async (req, res) => {
    try {
        const {id} = req.params;
        const result = await pool.query('DELETE FROM public.notes WHERE id = $1 RETURNING id', [id]);
        if (result.rowCount === 0) return res.status(404).send('Note not found');
        res.status(204).send();
    } catch (err) {
        console.error('DELETE /api/notes/:id error:', err);
        res.status(500).send('Server Error');
    }
});


(async () => {
    try {
        await initDb();
        app.listen(PORT, () => {
            console.log(`🚀 Server is running on http://localhost:${PORT} and connected to PostgreSQL`);
        });
    } catch (e) {
        console.error('Fatal: could not initialize DB. Exiting.');
        process.exit(1);
    }
})();
