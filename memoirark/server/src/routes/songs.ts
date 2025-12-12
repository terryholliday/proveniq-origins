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
        eventLinks: {
          include: { event: true },
        },
      },
    });

    if (!song) {
      return res.status(404).json({ error: 'Song not found' });
    }

    res.json({
      ...song,
      events: song.eventLinks.map((link) => link.event),
    });
  } catch (error) {
    console.error('Error fetching song:', error);
    res.status(500).json({ error: 'Failed to fetch song' });
  }
});

// POST /api/songs - Create song
songRoutes.post('/', async (req: Request, res: Response) => {
  try {
    const { title, artist, era, keyLyric, notes } = req.body;

    if (!title || !artist) {
      return res.status(400).json({ error: 'Title and artist are required' });
    }

    const song = await prisma.song.create({
      data: {
        title,
        artist,
        era: era || '',
        keyLyric: keyLyric || '',
        notes: notes || '',
      },
    });

    res.status(201).json(song);
  } catch (error) {
    console.error('Error creating song:', error);
    res.status(500).json({ error: 'Failed to create song' });
  }
});

// PUT /api/songs/:id - Update song
songRoutes.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, artist, era, keyLyric, notes } = req.body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (artist !== undefined) updateData.artist = artist;
    if (era !== undefined) updateData.era = era;
    if (keyLyric !== undefined) updateData.keyLyric = keyLyric;
    if (notes !== undefined) updateData.notes = notes;

    const song = await prisma.song.update({
      where: { id },
      data: updateData,
    });

    res.json(song);
  } catch (error) {
    console.error('Error updating song:', error);
    res.status(500).json({ error: 'Failed to update song' });
  }
});

// DELETE /api/songs/:id - Delete song
songRoutes.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.song.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting song:', error);
    res.status(500).json({ error: 'Failed to delete song' });
  }
});
