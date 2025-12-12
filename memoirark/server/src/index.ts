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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 MemoirArk server running at http://localhost:${PORT}`);
});
