import express from 'express';
import cors from 'cors';
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
import { noahRoutes } from './routes/noah';
import { cloudStorageRoutes } from './routes/cloudStorage';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
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
app.use('/api/ai', noahRoutes);
app.use('/api/cloud', cloudStorageRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 MemoirArk server running at http://localhost:${PORT}`);
});
