"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
class TokenService {
    generateAccessToken(payload) {
        return jsonwebtoken_1.default.sign(payload, process.env.JWT_ACCESS_SECRET, {
            expiresIn: '15m'
        });
    }
    generateRefreshToken(payload) {
        return jsonwebtoken_1.default.sign(payload, process.env.JWT_REFRESH_SECRET, {
            expiresIn: '30d'
        });
    }
    verifyAccessToken(token) {
        try {
            return jsonwebtoken_1.default.verify(token, process.env.JWT_ACCESS_SECRET);
        }
        catch (error) {
            console.error('[TOKEN} Access token verification failed:', error);
            return null;
        }
    }
    verifyRefreshToken(token) {
        try {
            return jsonwebtoken_1.default.verify(token, process.env.JWT_REFRESH_SECRET);
        }
        catch (error) {
            console.error('[TOKEN] Refresh token verification failed:', error);
            return null;
        }
    }
    generateVerificationToken() {
        return crypto_1.default.randomBytes(32).toString('hex');
    }
    generateResetToken() {
        return crypto_1.default.randomBytes(32).toString('hex');
    }
    getTokenExpiry(expiryHours = 24) {
        return new Date(Date.now() + expiryHours * 60 * 60 * 1000);
    }
}
exports.default = new TokenService();
