import jwt from "jsonwebtoken"
import crypto from "crypto"

interface TokenPayload {
    userId: string;
    email: string;
}

class TokenService {
    generateAccessToken(payload: TokenPayload): string{
        return jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, {
            expiresIn: '15m'
        })
    }

    generateRefreshToken(payload: TokenPayload): string {
        return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!,{
            expiresIn: '30d'
        })
    }

    verifyAccessToken(token: string): TokenPayload | null {
        try {
            return jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as TokenPayload;
        } catch (error) {
            console.error('[TOKEN} Access token verification failed:', error)
            return null
        }
    }

    verifyRefreshToken(token: string): TokenPayload | null {
        try {
            return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as TokenPayload;
        } catch (error) {
            console.error('[TOKEN] Refresh token verification failed:', error)
            return null
        }
    }

    generateVerificationToken(): string {
        return crypto.randomBytes(32).toString('hex')
    }

    generateResetToken(): string {
        return crypto.randomBytes(32).toString('hex')
    }

    getTokenExpiry(expiryHours: number = 24): Date {
        return new Date(Date.now() + expiryHours * 60 * 60 * 1000)
    }
}

export default new TokenService();