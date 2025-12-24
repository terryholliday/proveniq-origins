import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { eventRoutes } from './routes/events';
import { chapterRoutes } from './routes/chapters';
import { traumaCycleRoutes } from './routes/traumaCycles';
import { songRoutes } from './routes/songs';
import { statsRoutes } from './routes/stats';
import { personRoutes } from './routes/persons';
import { artifactRoutes } from './routes/artifacts';
import { synchronicityRoutes } from './routes/synchronicities';
import { linkRoutes } from './routes/links';
import { timelineRoutes } from './routes/timeline';
import { searchRoutes } from './routes/search';
import { narrativeRoutes } from './routes/narrative';
import { exportRoutes } from './routes/export';
import { tagRoutes } from './routes/tags';
import { collectionRoutes } from './routes/collections';
import { uploadRoutes } from './routes/uploads';
import { messengerImportRoutes } from './routes/messengerImport';
import { smsImportRoutes } from './routes/smsImport';
import { chatgptImportRoutes } from './routes/chatgptImport';
import { chapterOrganizerRoutes } from './routes/chapterOrganizer';
import { memoirExportRoutes } from './routes/memoirExport';
import { OriRoutes } from './routes/ori';
import { cloudStorageRoutes } from './routes/cloudStorage';
import { authRoutes, requireAuth } from './routes/auth';
import { spotifyRoutes } from './routes/spotify';
import { insightsRoutes } from './routes/insights';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map(o => o.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Middleware
import { authLimiter, apiLimiter } from './middleware/rateLimit';

// ... (previous middleware)

// Routes
// Apply auth rate limiting
app.use('/api/auth', authLimiter, authRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Apply global API rate limiting to all other routes
app.use('/api', apiLimiter);

// Require auth for all remaining API routes
app.use('/api', requireAuth);

app.use('/api/events', eventRoutes);
app.use('/api/chapters', chapterRoutes);
app.use('/api/trauma-cycles', traumaCycleRoutes);
app.use('/api/songs', songRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/persons', personRoutes);
app.use('/api/artifacts', artifactRoutes);
app.use('/api/synchronicities', synchronicityRoutes);
app.use('/api', linkRoutes);
app.use('/api/timeline', timelineRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/narrative', narrativeRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/messenger-import', messengerImportRoutes);
app.use('/api/sms-import', smsImportRoutes);
app.use('/api/chatgpt-import', chatgptImportRoutes);
app.use('/api/chapters', chapterOrganizerRoutes);
app.use('/api/memoir', memoirExportRoutes);
app.use('/api/ai', OriRoutes);
app.use('/api/cloud', cloudStorageRoutes);
app.use('/api/spotify', spotifyRoutes);
app.use('/api/insights', insightsRoutes);

// Favicon handler (no favicon, return 204)
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// Chrome DevTools request - return 204 to silence errors
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => res.status(204).end());

app.listen(PORT, () => {
  console.log(`🚀 Origins server running at http://localhost:${PORT}`);
});
