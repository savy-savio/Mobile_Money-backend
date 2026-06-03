import { Request, Response, NextFunction } from 'express';
import tokenService from '../services/tokenService';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
  email?: string;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ success: false, message: 'Access token is required' });
    return;
  }

  try {
    const decoded = tokenService.verifyAccessToken(token);
    
    if (!decoded) {
      res.status(403).json({ success: false, message: 'Invalid or expired access token' });
      return;
    }

    req.userId = decoded.userId;
    req.email = decoded.email;
    next();
  } catch (error: any) {
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

export const optionalAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (token) {
    try {
      const decoded = tokenService.verifyAccessToken(token);

      if (decoded) {
        req.userId = decoded.userId;
        req.email = decoded.email;
      }
    } catch (error) {
      // Ignore invalid tokens for optional auth
    }
  }

  next();
};

const authMiddleware = {
  verifyToken: authenticateToken,
  optional: optionalAuth,
};

export default authMiddleware;