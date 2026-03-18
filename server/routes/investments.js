const express = require('express');
const router = express.Router();
const { db } = require('../database');

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM investments ORDER BY type, symbol').all());
});

router.post('/', (req, res) => {
  const { type, symbol, name, quantity = 0, avg_buy_price = 0, current_price = 0, platform, wallet_address, notes } = req.body;
  if (!type || !symbol || !name) return res.status(400).json({ error: 'type, symbol, name required' });
  const result = db.prepare(
    'INSERT INTO investments (type, symbol, name, quantity, avg_buy_price, current_price, platform, wallet_address, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(type, symbol, name, quantity, avg_buy_price, current_price, platform || null, wallet_address || null, notes || null);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const { type, symbol, name, quantity, avg_buy_price, current_price, platform, wallet_address, notes } = req.body;
  db.prepare(
    'UPDATE investments SET type=?, symbol=?, name=?, quantity=?, avg_buy_price=?, current_price=?, platform=?, wallet_address=?, notes=?, updated_at=datetime(\'now\') WHERE id=?'
  ).run(type, symbol, name, quantity, avg_buy_price, current_price, platform, wallet_address, notes, req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM investments WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

router.get('/summary', (req, res) => {
  const all = db.prepare('SELECT * FROM investments').all();
  let totalValue = 0;
  let totalCost = 0;
  for (const inv of all) {
    totalValue += inv.quantity * inv.current_price;
    totalCost += inv.quantity * inv.avg_buy_price;
  }
  res.json({
    total_value: Math.round(totalValue * 100) / 100,
    total_cost: Math.round(totalCost * 100) / 100,
    total_pnl: Math.round((totalValue - totalCost) * 100) / 100,
    total_pnl_pct: totalCost > 0 ? Math.round(((totalValue - totalCost) / totalCost) * 10000) / 100 : 0,
  });
});

module.exports = router;
