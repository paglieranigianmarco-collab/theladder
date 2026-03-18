const express = require('express');
const cors = require('cors');
const path = require('path');
const { init } = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize database
init();

// API routes
app.use('/api/income', require('./routes/income'));
app.use('/api/taxes', require('./routes/taxes'));
app.use('/api/loans', require('./routes/loans'));
app.use('/api/investments', require('./routes/investments'));
app.use('/api/dashboard', require('./routes/dashboard'));

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`\n🪜  theladder server running on http://localhost:${PORT}\n`);
});
