import { Router, Request, Response, NextFunction } from 'express';
import { google } from 'googleapis';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
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

// Legacy JWT-like token using HMAC (fallback only)
const JWT_SECRET = process.env.JWT_SECRET;

interface TokenPayload {
  userId: string;
  email: string;
  exp: number;
}

// Token utilities
function createToken(payload: Omit<TokenPayload, 'exp'>): string {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET not set; legacy token generation disabled.');
  }
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const data = JSON.stringify({ ...payload, exp });
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64url');
  return Buffer.from(data).toString('base64url') + '.' + signature;
}

function verifyLegacyToken(token: string): TokenPayload | null {
  if (!JWT_SECRET) return null;
  try {
    const [dataB64, signature] = token.split('.');
    if (!dataB64 || !signature) return null;
    
    const data = Buffer.from(dataB64, 'base64url').toString();
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64url');
    
    if (signature !== expectedSig) return null;
    
    const payload = JSON.parse(data) as TokenPayload;
    if (payload.exp < Date.now()) return null;
    
    return payload;
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

// Google OAuth2 client for authentication (separate from Drive)
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

  // Minimal scopes for authentication only
  const scopes = [
    'openid',
    'email',
    'profile',
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'select_account', // Allow user to choose account
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

    // Get user info from Google
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    if (!userInfo.email || !userInfo.id) {
      return res.redirect('http://localhost:5173/login?error=no_email');
    }

    // Find or create user
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
      // Update user info on each login
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          email: userInfo.email,
          name: userInfo.name || user.name,
          picture: userInfo.picture || user.picture,
        }
      });
    }

    // Create session token
    const token = createToken({ userId: user.id, email: user.email });

    // Redirect with token (frontend will store it)
    res.redirect(`http://localhost:5173/login/callback?token=${token}`);
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

  // If authenticated via Firebase, return decoded claims/email
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

  // Legacy fallback: look up user in DB
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

// POST /api/auth/logout - Logout (client-side token removal, but we can track it)
authRoutes.post('/logout', (req: Request, res: Response) => {
  // For a simple implementation, logout is handled client-side by removing the token
  // In production, you might want to maintain a token blacklist
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

// Hash password using PBKDF2
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

// POST /api/auth/signup - Email/password signup
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

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Create user with hashed password
    const passwordHash = hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: name || null,
      }
    });

    // Create session token
    const token = createToken({ userId: user.id, email: user.email });

    res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name },
      token,
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// POST /api/auth/login - Email/password login
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

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    if (!verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Create session token
    const token = createToken({ userId: user.id, email: user.email });

    res.json({
      user: { id: user.id, email: user.email, name: user.name, picture: user.picture },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// ============================================
// AUTH MIDDLEWARE (exported for use in other routes)
// ============================================

export interface AuthenticatedRequest extends Request {
  authUser?: {
    uid: string;
    email?: string;
    provider: 'firebase' | 'legacy';
    claims?: Record<string, unknown>;
  };
}

export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.slice(7);

  // Preferred: Firebase ID token
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

  // Fallback: legacy HMAC token
  const legacy = verifyLegacyToken(token);
  if (legacy) {
    req.authUser = {
      uid: legacy.userId,
      email: legacy.email,
      provider: 'legacy',
    };
    return next();
  }

  return res.status(401).json({ error: 'Invalid or expired token' });
};

// Optional auth - doesn't fail if no token, just doesn't set user
export const optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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
    const legacy = verifyLegacyToken(token);
    if (legacy) {
      req.authUser = {
        uid: legacy.userId,
        email: legacy.email,
        provider: 'legacy',
      };
      return next();
    }
  }
  
  next();
};
