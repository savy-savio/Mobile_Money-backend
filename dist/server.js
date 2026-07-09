"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
const database_1 = require("./config/database");
// import { errorHandler } from './middleware/errorHandler';
const investmentRoutes_1 = __importDefault(require("./routes/investmentRoutes"));
const dashboardRoutes_1 = __importDefault(require("./routes/dashboardRoutes"));
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const settingsRoutes_1 = __importDefault(require("./routes/settingsRoutes"));
const investmentService_1 = __importDefault(require("./services/investmentService"));
// import stripeWebhookController from './controllers/stripeWebhookController';
const paymentRoutes_1 = __importDefault(require("./routes/paymentRoutes"));
const savingsRoute_1 = __importDefault(require("./routes/savingsRoute"));
const dailyGrowthJobs_1 = __importDefault(require("./jobs/dailyGrowthJobs"));
const app = (0, express_1.default)();
const PORT = process.env.BACKEND_PORT || 5000;
// Stripe webhook route - must be BEFORE express.json() middleware
// app.post(
//   '/api/webhooks/stripe',
//   express.raw({ type: 'application/json' }),
//   (req: Request, res: Response) =>
//     stripeWebhookController.handleWebhook(req, res)
// );
// Middleware
const allowedOrigins = [
    "http://localhost:5173", // Local Vite
    "http://localhost:3000", // Optional
    "https://crownledger360.com", // Production
];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests without an Origin header (Postman, mobile apps, etc.)
        if (!origin) {
            return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Connect to database
(0, database_1.connectDB)();
// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Investment Backend is running',
        timestamp: new Date(),
    });
});
// Seed initial data endpoint
app.post('/api/seed', async (req, res) => {
    try {
        await investmentService_1.default.seedInvestmentPlans();
        res.status(200).json({
            success: true,
            message: 'Investment plans seeded successfully',
        });
    }
    catch (error) {
        const err = error;
        res.status(500).json({
            success: false,
            message: err.message,
        });
    }
});
// Auth routes (uncomment when auth controller is connected)
app.use('/api/auth', authRoutes_1.default);
// Settings routes (uncomment when settings controller is connected)
app.use('/api/settings', settingsRoutes_1.default);
// Notification routes
app.use('/api/notifications', notificationRoutes_1.default);
// Investment routes
app.use('/api/investments', investmentRoutes_1.default);
// Dashboard routes
app.use('/api/dashboard', dashboardRoutes_1.default);
app.use('/api/payments', paymentRoutes_1.default);
app.use('/api/savings', savingsRoute_1.default);
// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
    });
});
// Error handling middleware
// app.use(errorHandler);
dailyGrowthJobs_1.default.start();
// Start server
app.listen(PORT, () => {
    console.log(`Investment Backend running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
exports.default = app;
