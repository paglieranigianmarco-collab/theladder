const express = require('express');
const router = express.Router();
const { db } = require('../database');

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM loans ORDER BY created_at').all());
});

router.post('/', (req, res) => {
  const { name, bank, original_amount, current_balance, interest_rate = 0, monthly_payment, start_date, notes } = req.body;
  if (!name || !bank || !original_amount || !current_balance || !monthly_payment) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const result = db.prepare(
    'INSERT INTO loans (name, bank, original_amount, current_balance, interest_rate, monthly_payment, start_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(name, bank, original_amount, current_balance, interest_rate, monthly_payment, start_date || null, notes || null);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const { name, bank, original_amount, current_balance, interest_rate, monthly_payment, start_date, notes } = req.body;
  db.prepare(
    'UPDATE loans SET name=?, bank=?, original_amount=?, current_balance=?, interest_rate=?, monthly_payment=?, start_date=?, notes=? WHERE id=?'
  ).run(name, bank, original_amount, current_balance, interest_rate, monthly_payment, start_date, notes, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM loans WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// Attack Mode: calculate accelerated payoff projection
router.post('/:id/projection', (req, res) => {
  const loan = db.prepare('SELECT * FROM loans WHERE id=?').get(req.params.id);
  if (!loan) return res.status(404).json({ error: 'Loan not found' });

  const extraPayment = parseFloat(req.body.extra_payment || 0);
  const monthlyRate = loan.interest_rate / 100 / 12;

  function calcSchedule(balance, monthlyPmt, extra) {
    const schedule = [];
    let bal = balance;
    let month = 0;
    const maxMonths = 600;

    while (bal > 0.01 && month < maxMonths) {
      const interest = bal * monthlyRate;
      const principal = Math.min(bal, monthlyPmt + extra - interest);
      bal = Math.max(0, bal - principal);
      month++;
      schedule.push({
        month,
        balance: Math.round(bal * 100) / 100,
        interest: Math.round(interest * 100) / 100,
        principal: Math.round(principal * 100) / 100,
      });
    }
    return schedule;
  }

  const baseSchedule = calcSchedule(loan.current_balance, loan.monthly_payment, 0);
  const attackSchedule = calcSchedule(loan.current_balance, loan.monthly_payment, extraPayment);

  const now = new Date();
  function monthsToDate(months) {
    const d = new Date(now);
    d.setMonth(d.getMonth() + months);
    return d.toISOString().slice(0, 7);
  }

  const baseTotalInterest = baseSchedule.reduce((s, r) => s + r.interest, 0);
  const attackTotalInterest = attackSchedule.reduce((s, r) => s + r.interest, 0);

  res.json({
    loan_id: loan.id,
    loan_name: loan.name,
    current_balance: loan.current_balance,
    monthly_payment: loan.monthly_payment,
    interest_rate: loan.interest_rate,
    extra_payment: extraPayment,
    base: {
      months: baseSchedule.length,
      payoff_date: monthsToDate(baseSchedule.length),
      total_interest: Math.round(baseTotalInterest * 100) / 100,
      schedule: baseSchedule.slice(0, 120), // cap at 10 years for chart
    },
    attack: {
      months: attackSchedule.length,
      payoff_date: monthsToDate(attackSchedule.length),
      total_interest: Math.round(attackTotalInterest * 100) / 100,
      schedule: attackSchedule.slice(0, 120),
    },
    months_saved: Math.max(0, baseSchedule.length - attackSchedule.length),
    interest_saved: Math.round((baseTotalInterest - attackTotalInterest) * 100) / 100,
  });
});

// Log a manual payment
router.post('/:id/payments', (req, res) => {
  const { date, amount, extra_amount = 0, note } = req.body;
  const loan = db.prepare('SELECT * FROM loans WHERE id=?').get(req.params.id);
  if (!loan) return res.status(404).json({ error: 'Loan not found' });

  db.prepare(
    'INSERT INTO loan_payments (loan_id, date, amount, extra_amount, note) VALUES (?, ?, ?, ?, ?)'
  ).run(req.params.id, date, amount, extra_amount, note || null);

  // Reduce balance
  db.prepare('UPDATE loans SET current_balance = MAX(0, current_balance - ?) WHERE id=?')
    .run(parseFloat(amount) + parseFloat(extra_amount), req.params.id);

  res.status(201).json({ ok: true });
});

router.get('/:id/payments', (req, res) => {
  res.json(db.prepare('SELECT * FROM loan_payments WHERE loan_id=? ORDER BY date DESC').all(req.params.id));
});

module.exports = router;
