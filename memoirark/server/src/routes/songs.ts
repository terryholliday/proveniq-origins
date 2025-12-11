import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const songRoutes = Router();

// GET /api/songs - List all songs
songRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const songs = await prisma.song.findMany({
      orderBy: { title: 'asc' },
    });

    res.json(songs);
  } catch (error) {
    console.error('Error fetching songs:', error);
    res.status(500).json({ error: 'Failed to fetch songs' });
  }
});

// GET /api/songs/:id - Get single song
songRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const song = await prisma.song.findUnique({
      where: { id },
      include: {
        events: true,
      },
    });

    if (!song) {
      return res.status(404).json({ error: 'Song not found' });
    }

    res.json(song);
  } catch (error) {
    console.error('Error fetching song:', error);
    res.status(500).json({ error: 'Failed to fetch song' });
  }
});
