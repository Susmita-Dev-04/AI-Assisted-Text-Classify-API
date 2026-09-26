import express from 'express';
import cors from 'cors';
import classifyRoutes from './routes/classify.routes.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // parses incoming JSON request bodies

// Routes
app.use('/api', classifyRoutes);

// 404 handler — catches any route not matched above
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler — catches errors passed via next(err)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;