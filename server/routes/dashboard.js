const express = require('express');
const router = express.Router();
const { db } = require('../database');

router.get('/networth', (req, res) => {
  // Cash accounts
  const cash = db.prepare('SELECT COALESCE(SUM(balance), 0) as total FROM cash_accounts').get();

  // Investments
  const investments = db.prepare('SELECT * FROM investments').all();
  let investmentValue = 0;
  for (const inv of investments) {
    investmentValue += inv.quantity * inv.current_price;
  }

  // Loans
  const loans = db.prepare('SELECT COALESCE(SUM(current_balance), 0) as total FROM loans').get();

  // Tax liability (unpaid)
  const taxLiability = db.prepare(
    'SELECT COALESCE(SUM(estimated_amount - paid_amount), 0) as total FROM tax_payments WHERE status != \'paid\''
  ).get();

  const assets = cash.total + investmentValue;
  const liabilities = loans.total + Math.max(0, taxLiability.total);
  const netWorth = assets - liabilities;

  res.json({
    assets: { cash: cash.total, investments: Math.round(investmentValue * 100) / 100, total: Math.round(assets * 100) / 100 },
    liabilities: { loans: loans.total, tax_accrued: Math.max(0, Math.round(taxLiability.total * 100) / 100), total: Math.round(liabilities * 100) / 100 },
    net_worth: Math.round(netWorth * 100) / 100,
  });
});

router.get('/deadlines', (req, res) => {
  const now = new Date().toISOString().slice(0, 10);
  const taxes = db.prepare(
    'SELECT \'tax\' as type, period_label as label, due_date, status, estimated_amount as amount FROM tax_payments WHERE status != \'paid\' AND due_date >= ? ORDER BY due_date LIMIT 6'
  ).all(now);

  // Next loan payments (1st of every month)
  const loans = db.prepare('SELECT * FROM loans').all();
  const loanDeadlines = [];
  for (const loan of loans) {
    const today = new Date();
    const nextPayment = new Date(today.getFullYear(), today.getMonth() + (today.getDate() > 1 ? 1 : 0), 1);
    loanDeadlines.push({
      type: 'loan',
      label: `${loan.name} Payment`,
      due_date: nextPayment.toISOString().slice(0, 10),
      status: 'pending',
      amount: loan.monthly_payment,
    });
  }

  const all = [...taxes, ...loanDeadlines].sort((a, b) => a.due_date.localeCompare(b.due_date));
  res.json(all.slice(0, 8));
});

router.get('/cashflow', (req, res) => {
  const year = req.query.year || new Date().getFullYear();
  const incomeByMonth = db.prepare(
    'SELECT strftime(\'%m\', date) as month, SUM(amount) as income FROM income WHERE strftime(\'%Y\', date)=? GROUP BY month'
  ).all(String(year));

  const expensesByMonth = db.prepare(
    'SELECT strftime(\'%m\', date) as month, SUM(amount) as expenses FROM expenses WHERE strftime(\'%Y\', date)=? GROUP BY month'
  ).all(String(year));

  const months = ['01','02','03','04','05','06','07','08','09','10','11','12'];
  const labels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const result = months.map((m, i) => {
    const inc = incomeByMonth.find(r => r.month === m);
    const exp = expensesByMonth.find(r => r.month === m);
    return {
      month: labels[i],
      income: inc?.income || 0,
      expenses: exp?.expenses || 0,
      net: (inc?.income || 0) - (exp?.expenses || 0),
    };
  });
  res.json(result);
});

// Cash accounts CRUD
router.get('/cash', (req, res) => {
  res.json(db.prepare('SELECT * FROM cash_accounts ORDER BY name').all());
});

router.post('/cash', (req, res) => {
  const { name, balance, currency = 'EUR', notes } = req.body;
  const result = db.prepare('INSERT INTO cash_accounts (name, balance, currency, notes) VALUES (?, ?, ?, ?)').run(name, balance, currency, notes || null);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/cash/:id', (req, res) => {
  const { name, balance, currency, notes } = req.body;
  db.prepare('UPDATE cash_accounts SET name=?, balance=?, currency=?, notes=?, updated_at=datetime(\'now\') WHERE id=?').run(name, balance, currency, notes, req.params.id);
  res.json({ ok: true });
});

router.delete('/cash/:id', (req, res) => {
  db.prepare('DELETE FROM cash_accounts WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// Settings
router.get('/settings', (req, res) => {
  const rows = db.prepare('SELECT * FROM settings').all();
  const result = {};
  for (const row of rows) result[row.key] = row.value;
  res.json(result);
});

router.put('/settings', (req, res) => {
  const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime(\'now\'))');
  for (const [key, value] of Object.entries(req.body)) {
    upsert.run(key, String(value));
  }
  res.json({ ok: true });
});

module.exports = router;
