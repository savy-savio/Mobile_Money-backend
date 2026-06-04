"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
// import dotenv from 'dotenv';
const database_1 = require("./config/database");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const settingsRoutes_1 = __importDefault(require("./routes/settingsRoutes"));
const dns_1 = __importDefault(require("dns"));
dns_1.default.setDefaultResultOrder('ipv4first');
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Middleware
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ limit: '50mb', extended: true }));
// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ success: true, message: 'Server is running' });
});
// Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/settings', settingsRoutes_1.default);
// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});
// Start server
const startServer = async () => {
    try {
        // Connect to MongoDB
        await (0, database_1.connectDB)();
        app.listen(PORT, () => {
            console.log(`[SERVER] Server is running on port ${PORT}`);
            console.log(`[SERVER] Frontend URL: ${process.env.FRONTEND_URL}`);
            console.log(`[SERVER] Environment: ${process.env.NODE_ENV}`);
        });
    }
    catch (error) {
        console.error('[SERVER] Failed to start server:', error);
        process.exit(1);
    }
};
startServer();
exports.default = app;
