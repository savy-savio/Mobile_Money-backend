"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.authenticateToken = void 0;
const tokenService_1 = __importDefault(require("../services/tokenService"));
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    if (!token) {
        res.status(401).json({ success: false, message: 'Access token is required' });
        return;
    }
    try {
        const decoded = tokenService_1.default.verifyAccessToken(token);
        if (!decoded) {
            res.status(403).json({ success: false, message: 'Invalid or expired access token' });
            return;
        }
        req.userId = decoded.userId;
        req.email = decoded.email;
        next();
    }
    catch (error) {
        // Check if token is expired specifically
        if (error.name === 'TokenExpiredError') {
            res.status(401).json({
                success: false,
                message: 'Access token expired',
                code: 'TOKEN_EXPIRED',
                expiredAt: error.expiredAt
            });
            return;
        }
        // For any other JWT error
        res.status(403).json({ success: false, message: 'Invalid access token' });
        return;
    }
};
exports.authenticateToken = authenticateToken;
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    if (token) {
        try {
            const decoded = tokenService_1.default.verifyAccessToken(token);
            if (decoded) {
                req.userId = decoded.userId;
                req.email = decoded.email;
            }
        }
        catch (error) {
            // Ignore invalid tokens for optional auth
        }
    }
    next();
};
exports.optionalAuth = optionalAuth;
const authMiddleware = {
    verifyToken: exports.authenticateToken,
    optional: exports.optionalAuth,
};
exports.default = authMiddleware;
