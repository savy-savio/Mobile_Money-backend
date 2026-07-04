// import dotenv from 'dotenv';
// dotenv.config(); 
// import express, { Express, Request, Response } from 'express';
// import cors from 'cors';
// // import dotenv from 'dotenv';
// import { connectDB } from './config/database';
// import authRoutes from './routes/authRoutes';
// import settingsRoutes from './routes/settingsRoutes';
// import dns from 'dns';
// dns.setDefaultResultOrder('ipv4first');

// // Load environment variables
// dotenv.config();

// const app: Express = express();
// const PORT = process.env.PORT || 5000;

// // Middleware
// app.use(cors({
//   origin: process.env.FRONTEND_URL || 'http://localhost:3000',
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
// }));

// app.use(express.json({ limit: '50mb' }));
// app.use(express.urlencoded({ limit: '50mb', extended: true }));

// // Health check
// app.get('/health', (req: Request, res: Response) => {
//   res.status(200).json({ success: true, message: 'Server is running' });
// });

// // Routes
// app.use('/api/auth', authRoutes);
// app.use('/api/settings', settingsRoutes);

// // 404 handler
// app.use((req: Request, res: Response) => {
//   res.status(404).json({ success: false, message: 'Route not found' });
// });

// // Start server
// const startServer = async () => {
//   try {
//     // Connect to MongoDB
//     await connectDB();

//     app.listen(PORT, () => {
//       console.log(`[SERVER] Server is running on port ${PORT}`);
//       console.log(`[SERVER] Frontend URL: ${process.env.FRONTEND_URL}`);
//       console.log(`[SERVER] Environment: ${process.env.NODE_ENV}`);
//     });
//   } catch (error) {
//     console.error('[SERVER] Failed to start server:', error);
//     process.exit(1);
//   }
// };

// startServer();

// export default app;


import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
// Load environment variables
dotenv.config();
import { connectDB } from './config/database';
// import { errorHandler } from './middleware/errorHandler';
import investmentRoutes from './routes/investmentRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import notificationRoutes from './routes/notificationRoutes';
import authRoutes from './routes/authRoutes';
import settingsRoutes from './routes/settingsRoutes';
import investmentService from './services/investmentService';
// import stripeWebhookController from './controllers/stripeWebhookController';
import paymentRoutes from './routes/paymentRoutes';


const app: Express = express();
const PORT = process.env.BACKEND_PORT || 5000;

// Stripe webhook route - must be BEFORE express.json() middleware
// app.post(
//   '/api/webhooks/stripe',
//   express.raw({ type: 'application/json' }),
//   (req: Request, res: Response) =>
//     stripeWebhookController.handleWebhook(req, res)
// );

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to database
connectDB();

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Investment Backend is running',
    timestamp: new Date(),
  });
});

// Seed initial data endpoint
app.post('/api/seed', async (req: Request, res: Response) => {
  try {
    await investmentService.seedInvestmentPlans();
    res.status(200).json({
      success: true,
      message: 'Investment plans seeded successfully',
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// Auth routes (uncomment when auth controller is connected)
app.use('/api/auth', authRoutes);

// Settings routes (uncomment when settings controller is connected)
app.use('/api/settings', settingsRoutes);

// Notification routes
app.use('/api/notifications', notificationRoutes);

// Investment routes
app.use('/api/investments', investmentRoutes);

// Dashboard routes
app.use('/api/dashboard', dashboardRoutes);

app.use('/api/payments', paymentRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handling middleware
// app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Investment Backend running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
