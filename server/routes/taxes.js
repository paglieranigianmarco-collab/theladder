const express = require('express');
const router = express.Router();
const { db } = require('../database');

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM tax_payments ORDER BY due_date').all());
});

router.put('/:id', (req, res) => {
  const { estimated_amount, billed_amount, paid_amount, status, notes, due_date } = req.body;
  db.prepare(
    'UPDATE tax_payments SET estimated_amount=?, billed_amount=?, paid_amount=?, status=?, notes=?, due_date=? WHERE id=?'
  ).run(estimated_amount, billed_amount, paid_amount, status, notes, due_date, req.params.id);
  res.json({ ok: true });
});

router.get('/buffer', (req, res) => {
  const year = req.query.year || new Date().getFullYear();
  const totalIncome = db.prepare(
    'SELECT COALESCE(SUM(amount), 0) as total FROM income WHERE strftime(\'%Y\', date)=?'
  ).get(String(year));
  const setting = db.prepare('SELECT value FROM settings WHERE key=?').get('tax_buffer_percent');
  const bufferPct = parseFloat(setting?.value || '30');
  const taxRate = parseFloat(db.prepare('SELECT value FROM settings WHERE key=?').get('tax_rate')?.value || '23');
  const totalPaid = db.prepare(
    'SELECT COALESCE(SUM(paid_amount), 0) as total FROM tax_payments'
  ).get();

  const grossIncome = totalIncome.total;
  const estimatedTax = grossIncome * (taxRate / 100);
  const bufferNeeded = grossIncome * (bufferPct / 100);
  const alreadyPaid = totalPaid.total;
  const remaining = Math.max(0, estimatedTax - alreadyPaid);

  res.json({
    gross_income: grossIncome,
    tax_rate: taxRate,
    buffer_percent: bufferPct,
    estimated_tax: estimatedTax,
    buffer_needed: bufferNeeded,
    already_paid: alreadyPaid,
    remaining_liability: remaining,
  });
});

module.exports = router;
