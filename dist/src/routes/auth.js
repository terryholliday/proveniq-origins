"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.requireAuth = exports.authRoutes = void 0;
const express_1 = require("express");
const googleapis_1 = require("googleapis");
const client_1 = require("@prisma/client");
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const firebase_admin_1 = __importDefault(require("firebase-admin"));
exports.authRoutes = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Firebase Admin (preferred auth path)
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
if (!firebase_admin_1.default.apps.length && FIREBASE_PROJECT_ID) {
    firebase_admin_1.default.initializeApp({
        credential: firebase_admin_1.default.credential.applicationDefault(),
        projectId: FIREBASE_PROJECT_ID,
    });
}
const firebaseAuth = firebase_admin_1.default.apps.length ? firebase_admin_1.default.auth() : null;
// JWT Config
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.warn('WARNING: JWT_SECRET is not set. Authentication will fail.');
}
// Token utilities using jsonwebtoken
function createToken(payload) {
    if (!JWT_SECRET) {
        throw new Error('JWT_SECRET not set');
    }
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}
function verifyToken(token) {
    if (!JWT_SECRET)
        return null;
    try {
        return jsonwebtoken_1.default.verify(token, JWT_SECRET);
    }
    catch {
        return null;
    }
}
async function verifyFirebaseToken(token) {
    if (!firebaseAuth)
        return null;
    try {
        const decoded = await firebaseAuth.verifyIdToken(token);
        return decoded;
    }
    catch (err) {
        return null;
    }
}
// Cookie options
const COOKIE_NAME = 'origins_token';
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // true in prod
    sameSite: 'lax',
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
    return new googleapis_1.google.auth.OAuth2(clientId, clientSecret, redirectUri);
};
// GET /api/auth/google - Start Google OAuth flow for login
exports.authRoutes.get('/google', (req, res) => {
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
exports.authRoutes.get('/google/callback', async (req, res) => {
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
        const oauth2 = googleapis_1.google.oauth2({ version: 'v2', auth: oauth2Client });
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
        }
        else {
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
    }
    catch (error) {
        console.error('Google OAuth error:', error);
        res.redirect('http://localhost:5173/login?error=oauth_failed');
    }
});
// GET /api/auth/me - Get current user
exports.authRoutes.get('/me', exports.requireAuth, async (req, res) => {
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
    }
    catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});
// POST /api/auth/logout
exports.authRoutes.post('/logout', (req, res) => {
    res.clearCookie(COOKIE_NAME);
    res.json({ success: true });
});
// ============================================
// EMAIL/PASSWORD AUTHENTICATION
// ============================================
const signupSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
    name: zod_1.z.string().optional(),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
function hashPassword(password) {
    const salt = crypto_1.default.randomBytes(16).toString('hex');
    const hash = crypto_1.default.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
    const [salt, hash] = stored.split(':');
    const verifyHash = crypto_1.default.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
}
// POST /api/auth/signup
exports.authRoutes.post('/signup', async (req, res) => {
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
    }
    catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Failed to create account' });
    }
});
// POST /api/auth/login
exports.authRoutes.post('/login', async (req, res) => {
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
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});
const requireAuth = async (req, res, next) => {
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
exports.requireAuth = requireAuth;
// Optional auth
const optionalAuth = async (req, res, next) => {
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
exports.optionalAuth = optionalAuth;
//# sourceMappingURL=auth.js.map