import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../database/db';
import { UserRole } from '../models/types';

const JWT_SECRET = process.env.JWT_SECRET || 'gov_house_valuation_secret_jwt_key_2026';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    department: string;
  };
}

export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Access denied. No authentication token provided.',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      role: UserRole;
    };

    const user = db.users.find((u) => u.id === decoded.id);
    if (!user) {
      res.status(401).json({
        error: 'INVALID_TOKEN',
        message: 'The user associated with this token no longer exists.',
      });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
    };

    next();
  } catch (err) {
    res.status(401).json({
      error: 'TOKEN_EXPIRED_OR_INVALID',
      message: 'Your session has expired or is invalid. Please log in again.',
    });
  }
};

export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: 'FORBIDDEN',
        message: 'You do not have sufficient government clearance/permissions to perform this action.',
      });
      return;
    }
    next();
  };
};

export const signToken = (payload: { id: string; email: string; role: UserRole }): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
};
