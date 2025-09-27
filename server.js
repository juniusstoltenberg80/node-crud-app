require('dotenv').config();
const express = require('express');
const { Pool } = require('pg'); 
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3500;

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'notesdb',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 543
});

app.use(express.json());
app.use(express.static('public'));

app.get('/api/notes', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM notes ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

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

app.delete('/api/notes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM notes WHERE id = $1 RETURNING *', [id]);

        if (result.rowCount === 0) {
            return res.status(404).send('Note not found');
        }
        res.status(204).send();
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT} and connected to PostgreSQL`);
});