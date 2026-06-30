/**
 * Multi-Workspace Document Assistant — Express Server Entry Point
 *
 * Sets up the Express app with CORS, JSON parsing, route mounting,
 * and global error handling. All route groups are mounted under /api.
 */

// Load environment variables from project root (monorepo: .env is at root)
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');

const app = express();

// ─── CORS Configuration ──────────────────────────────────────────────────────
// Allow requests from the client dev server or configured CLIENT_URL
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// ─── Body Parsers ─────────────────────────────────────────────────────────────
// JSON body parser with 50MB limit (large document payloads)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ─── Mount Routes ─────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/workspaces', require('./routes/workspaces'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/tool-calls', require('./routes/toolCalls'));
app.use('/api/tasks', require('./routes/tasks'));

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

// ─── Global Error Handling Middleware ─────────────────────────────────────────
// Express error handler — must have 4 parameters to be recognized as error middleware
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);

  // Never expose internal error details in production
  const isDev = process.env.NODE_ENV !== 'production';

  res.status(err.status || 500).json({
    error: isDev ? err.message : 'Internal server error.',
    ...(isDev && { stack: err.stack }),
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`\n🚀 Multi-Workspace Document Assistant API`);
  console.log(`   Server running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;
