import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { initSocket } from './config/socket.js';
import { errorHandler } from './middlewares/errorMiddleware.js';

// Load routes
import authRoutes from './routes/authRoutes.js';
import groupRoutes from './routes/groupRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import settlementRoutes from './routes/settlementRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';

// Load dotenv
dotenv.config();

// Connect to Database
connectDB();

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Middlewares
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  })
);
app.use(express.json());

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/settlements', settlementRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is healthy' });
});

// Global Error Handler
app.use(errorHandler);

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // Self-ping to prevent Render free-tier sleep
  const selfPingUrl = process.env.BACKEND_URL || process.env.RENDER_EXTERNAL_URL;
  if (selfPingUrl) {
    console.log(`Self-ping active targeting: ${selfPingUrl}`);
    setInterval(async () => {
      try {
        const res = await fetch(`${selfPingUrl}/health`);
        console.log(`Self-ping status: ${res.status}`);
      } catch (err) {
        console.error('Self-ping failed:', err.message);
      }
    }, 10 * 60 * 1000); // Ping every 10 minutes
  }
});
