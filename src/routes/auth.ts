import { Router, Request, Response, NextFunction } from 'express';
import { google } from 'googleapis';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import admin from 'firebase-admin';

export const authRoutes = Router();
const prisma = new PrismaClient();

// Firebase Admin (preferred auth path)
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
if (!admin.apps.length && FIREBASE_PROJECT_ID) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: FIREBASE_PROJECT_ID,
  });
}
const firebaseAuth = admin.apps.length ? admin.auth() : null;

// JWT Config
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET is not set. Authentication will fail.');
}

interface TokenPayload {
  userId: string;
  email: string;
}

// Token utilities using jsonwebtoken
function createToken(payload: TokenPayload): string {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET not set');
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(token: string): TokenPayload | null {
  if (!JWT_SECRET) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

async function verifyFirebaseToken(token: string) {
  if (!firebaseAuth) return null;
  try {
    const decoded = await firebaseAuth.verifyIdToken(token);
    return decoded;
  } catch (err) {
    return null;
  }
}

// Cookie options
const COOKIE_NAME = 'origins_token';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // true in prod
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};







// Google OAuth2 client for authentication
const getAuthOAuth2Client = () => {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_AUTH_REDIRECT_URI || 'http://localhost:3001/api/auth/google/callback';

  if (!clientId || !clientSecret) {
    return null;
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
};

// GET /api/auth/google - Start Google OAuth flow for login
authRoutes.get('/google', (req: Request, res: Response) => {
  const oauth2Client = getAuthOAuth2Client();

  if (!oauth2Client) {
    return res.status(500).json({
      error: 'Google OAuth not configured',
      setup: 'Add GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET to .env'
    });
  }

  const scopes = ['openid', 'email', 'profile'];
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'select_account',
  });

  res.json({ authUrl });
});

// GET /api/auth/google/callback - OAuth callback for login
authRoutes.get('/google/callback', async (req: Request, res: Response) => {
  const { code } = req.query;

  if (!code || typeof code !== 'string') {
    return res.redirect('http://localhost:5173/login?error=missing_code');
  }

  const oauth2Client = getAuthOAuth2Client();
  if (!oauth2Client) {
    return res.redirect('http://localhost:5173/login?error=not_configured');
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    if (!userInfo.email || !userInfo.id) {
      return res.redirect('http://localhost:5173/login?error=no_email');
    }

    let user = await prisma.user.findUnique({
      where: { googleId: userInfo.id }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          googleId: userInfo.id,
          email: userInfo.email,
          name: userInfo.name || null,
          picture: userInfo.picture || null,
        }
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          email: userInfo.email,
          name: userInfo.name || user.name,
          picture: userInfo.picture || user.picture,
        }
      });
    }

    const token = createToken({ userId: user.id, email: user.email });

    // Set HttpOnly cookie
    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);

    // Redirect to frontend (token is in cookie now)
    res.redirect('http://localhost:5173/login/callback?success=true');
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.redirect('http://localhost:5173/login?error=oauth_failed');
  }
});

// GET /api/auth/me - Get current user
authRoutes.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const authUser = req.authUser;
  if (!authUser) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (authUser.provider === 'firebase') {
    return res.json({
      user: {
        uid: authUser.uid,
        email: authUser.email,
        provider: 'firebase',
        claims: authUser.claims,
      },
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: authUser.uid },
      select: { id: true, email: true, name: true, picture: true, createdAt: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// POST /api/auth/logout
authRoutes.post('/logout', (req: Request, res: Response) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ success: true });
});

// ============================================
// EMAIL/PASSWORD AUTHENTICATION
// ============================================

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

// POST /api/auth/signup
authRoutes.post('/signup', async (req: Request, res: Response) => {
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.errors
      });
    }

    const { email, password, name } = parsed.data;

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: name || null,
      }
    });

    const token = createToken({ userId: user.id, email: user.email });
    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);

    res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// POST /api/auth/login
authRoutes.post('/login', async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.errors
      });
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = createToken({ userId: user.id, email: user.email });
    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);

    res.json({
      user: { id: user.id, email: user.email, name: user.name, picture: user.picture },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// ============================================
// AUTH MIDDLEWARE
// ============================================

export interface AuthenticatedRequest extends Request {
  authUser?: {
    uid: string;
    email?: string;
    provider: 'firebase' | 'local';
    claims?: Record<string, unknown>;
    aiConsent?: boolean;
  };
}

export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // 1. Check for cookie (Primary)
  const cookieToken = req.cookies?.[COOKIE_NAME];
  if (cookieToken) {
    const payload = verifyToken(cookieToken);
    if (payload) {
      req.authUser = {
        uid: payload.userId,
        email: payload.email,
        provider: 'local',
      };
      return next();
    }
  }

  // 2. Check for Bearer header (Firebase or fallback)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);

    // Try Firebase
    const firebaseUser = await verifyFirebaseToken(token);
    if (firebaseUser) {
      req.authUser = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        provider: 'firebase',
        claims: firebaseUser,
      };
      return next();
    }

    // IMPORTANT: Removed legacy HMAC token verification from header.
    // If you need legacy support for API tokens, implement a dedicated API key system.
  }

  return res.status(401).json({ error: 'Authentication required' });
};

// Middleware to require AI consent
export const requireAiConsent = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.authUser || !req.authUser.uid) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.authUser.uid },
      select: { aiConsent: true }
    });

    if (user?.aiConsent) {
      req.authUser.aiConsent = true;
      return next();
    }

    return res.status(403).json({
      error: 'AI Consent Required',
      message: 'You must enable AI processing in your settings to use this feature.'
    });
  } catch (error) {
    console.error('AI Consent check error:', error);
    return res.status(500).json({ error: 'Failed to verify AI permissions' });
  }
};

// Optional auth
export const optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const cookieToken = req.cookies?.[COOKIE_NAME];
  if (cookieToken) {
    const payload = verifyToken(cookieToken);
    if (payload) {
      req.authUser = {
        uid: payload.userId,
        email: payload.email,
        provider: 'local',
      };
      return next();
    }
  }

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const firebaseUser = await verifyFirebaseToken(token);
    if (firebaseUser) {
      req.authUser = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        provider: 'firebase',
        claims: firebaseUser,
      };
      return next();
    }
  }

  next();
};
