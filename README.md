# theladder

A premium personal finance OS — local, private, SQLite-powered.

## Stack

- **Frontend**: React + Vite + Tailwind CSS + Recharts + Lucide
- **Backend**: Node.js + Express
- **Database**: SQLite (local, `theladder.db`)

## Features

- **Overview Dashboard** — Net worth (Cash + Investments - Loans - Tax), cash flow chart, deadline calendar
- **Tax Engine** — 4 quarterly prepayments + annual settlement tracker with buffer calculator
- **Loan Extinguisher** — Attack mode: enter extra monthly payment → see accelerated payoff date and interest saved
- **Portfolio** — Crypto, stocks, ETF tracking with P&L
- **Settings** — Cash accounts, tax rate configuration

## Setup

```bash
# Install root dependencies
npm install

# Install client dependencies
cd client && npm install && cd ..

# Start (runs both server on :3001 and client on :5173)
npm run dev
```

Open http://localhost:5173
