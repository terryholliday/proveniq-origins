import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const statsRoutes = Router();

// GET /api/stats - Get counts for dashboard
statsRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const [eventsCount, chaptersCount, traumaCyclesCount, songsCount] = await Promise.all([
      prisma.event.count(),
      prisma.chapter.count(),
      prisma.traumaCycle.count(),
      prisma.song.count(),
    ]);

    res.json({
      events: eventsCount,
      chapters: chaptersCount,
      traumaCycles: traumaCyclesCount,
      songs: songsCount,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});
