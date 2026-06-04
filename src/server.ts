import dotenv from 'dotenv';
dotenv.config(); 
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
// import dotenv from 'dotenv';
import { connectDB } from './config/database';
import authRoutes from './routes/authRoutes';
import settingsRoutes from './routes/settingsRoutes';
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ success: true, message: 'Server is running' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/settings', settingsRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    app.listen(PORT, () => {
      console.log(`[SERVER] Server is running on port ${PORT}`);
      console.log(`[SERVER] Frontend URL: ${process.env.FRONTEND_URL}`);
      console.log(`[SERVER] Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('[SERVER] Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
