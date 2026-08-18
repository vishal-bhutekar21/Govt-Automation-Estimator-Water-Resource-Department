import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/db';
import { signToken, AuthRequest } from '../middleware/auth';
import { User, UserRole } from '../models/types';

// Ensure Super Admin user exists in memory database
const SUPER_ADMIN_EMAIL = 'vishal.bhutekar1@gmail.com';
const SUPER_ADMIN_PASSWORD = 'vishal@123';

const ensureSuperAdmin = async () => {
  const existing = db.users.find((u) => u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase());
  if (!existing) {
    const hash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);
    db.users.push({
      id: 'usr-superadmin-vishal',
      email: SUPER_ADMIN_EMAIL,
      name: 'Er. Vishal Bhutekar (Super Admin)',
      role: 'ADMIN',
      department: 'Water Resources Department, Maharashtra',
      designation: 'Super Administrator / Chief System Architect',
      passwordHash: hash,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    db.save();
  }
};

ensureSuperAdmin();

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Please provide both email and password.',
      });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();

    // ─── Super Admin Hardcoded Bypass (works on Vercel serverless) ───────────
    // This ensures the Super Admin can always log in regardless of db.json state
    if (cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase() && password === SUPER_ADMIN_PASSWORD) {
      const token = signToken({
        id: 'usr-superadmin-vishal',
        email: SUPER_ADMIN_EMAIL,
        role: 'ADMIN',
      });

      res.status(200).json({
        message: 'Authentication successful',
        token,
        user: {
          id: 'usr-superadmin-vishal',
          email: SUPER_ADMIN_EMAIL,
          name: 'Er. Vishal Bhutekar (Super Admin)',
          role: 'ADMIN',
          department: 'Water Resources Department, Maharashtra',
          designation: 'Super Administrator / Chief System Architect',
        },
      });
      return;
    }
    // ─────────────────────────────────────────────────────────────────────────

    await ensureSuperAdmin();

    const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email address or password.',
      });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email address or password.',
      });
      return;
    }

    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    res.status(200).json({
      message: 'Authentication successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
        designation: user.designation,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: err.message || 'Authentication failed due to server error.',
    });
  }
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role, designation, department } = req.body;

    if (!name || !email || !password || !role) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Name, email, password, and role are required.',
      });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      res.status(409).json({
        error: 'USER_EXISTS',
        message: `An officer account with email ${cleanEmail} already exists.`,
      });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser: User = {
      id: `usr-${uuidv4().slice(0, 8)}`,
      email: cleanEmail,
      name: name.trim(),
      passwordHash,
      role: role as UserRole,
      department: department || 'Water Resources Department, Maharashtra',
      designation: designation || (role === 'ADMIN' ? 'Executive Engineer' : 'Assistant Engineer'),
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.users.push(newUser);

    // Audit log
    db.auditLogs.push({
      id: `log-${uuidv4().slice(0, 8)}`,
      userId: newUser.id,
      userName: newUser.name,
      userRole: newUser.role,
      action: 'OFFICER_ACCOUNT_CREATED',
      entityType: 'User',
      entityId: newUser.id,
      newValue: `New ${newUser.role} account created for ${newUser.name} (${newUser.designation})`,
      timestamp: new Date().toISOString(),
    });

    db.save();

    const token = signToken({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });

    res.status(201).json({
      message: 'Officer account created successfully',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        department: newUser.department,
        designation: newUser.designation,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: err.message || 'Failed to create officer account.',
    });
  }
};

export const listUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureSuperAdmin();
    const safeUsers = db.users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      department: u.department,
      designation: u.designation,
      createdAt: u.createdAt,
    }));

    res.status(200).json({ users: safeUsers });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to list users.' });
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const index = db.users.findIndex((u) => u.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'User not found.' });
      return;
    }

    const removed = db.users.splice(index, 1)[0];
    db.save();

    res.status(200).json({ message: `User ${removed.name} removed successfully.` });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to delete user.' });
  }
};

export const getMe = (req: AuthRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Not authenticated' });
    return;
  }

  // Super Admin hardcoded bypass for Vercel serverless
  if (req.user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
    res.status(200).json({
      user: {
        id: 'usr-superadmin-vishal',
        email: SUPER_ADMIN_EMAIL,
        name: 'Er. Vishal Bhutekar (Super Admin)',
        role: 'ADMIN',
        department: 'Water Resources Department, Maharashtra',
        designation: 'Super Administrator / Chief System Architect',
      },
    });
    return;
  }

  const user = db.users.find((u) => u.id === req.user?.id);
  if (!user) {
    res.status(404).json({ error: 'USER_NOT_FOUND', message: 'User not found' });
    return;
  }

  res.status(200).json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
      designation: user.designation,
    },
  });
};
