const express = require('express');
const router = express.Router();
const { db } = require('../database');

router.get('/', (req, res) => {
  const { year, month } = req.query;
  let query = 'SELECT * FROM income';
  const params = [];
  if (year && month) {
    query += ' WHERE strftime(\'%Y-%m\', date) = ?';
    params.push(`${year}-${String(month).padStart(2, '0')}`);
  } else if (year) {
    query += ' WHERE strftime(\'%Y\', date) = ?';
    params.push(year);
  }
  query += ' ORDER BY date DESC';
  res.json(db.prepare(query).all(...params));
});

router.post('/', (req, res) => {
  const { date, amount, gross_amount, source = 'freelance', description } = req.body;
  if (!date || !amount) return res.status(400).json({ error: 'date and amount required' });
  const result = db.prepare(
    'INSERT INTO income (date, amount, gross_amount, source, description) VALUES (?, ?, ?, ?, ?)'
  ).run(date, amount, gross_amount || null, source, description || null);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const { date, amount, gross_amount, source, description } = req.body;
  db.prepare(
    'UPDATE income SET date=?, amount=?, gross_amount=?, source=?, description=? WHERE id=?'
  ).run(date, amount, gross_amount || null, source, description || null, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM income WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

router.get('/summary', (req, res) => {
  const year = req.query.year || new Date().getFullYear();
  const rows = db.prepare(
    'SELECT strftime(\'%Y-%m\', date) as month, SUM(amount) as total FROM income WHERE strftime(\'%Y\', date)=? GROUP BY month ORDER BY month'
  ).all(String(year));
  const total = db.prepare('SELECT SUM(amount) as total FROM income WHERE strftime(\'%Y\', date)=?').get(String(year));
  res.json({ monthly: rows, yearly_total: total?.total || 0 });
});

module.exports = router;
