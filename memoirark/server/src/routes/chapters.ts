import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const chapterRoutes = Router();

// GET /api/chapters - List all chapters
chapterRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const chapters = await prisma.chapter.findMany({
      orderBy: { number: 'asc' },
    });

    const chaptersWithParsedYears = chapters.map((chapter) => ({
      ...chapter,
      yearsCovered: JSON.parse(chapter.yearsCovered),
    }));

    res.json(chaptersWithParsedYears);
  } catch (error) {
    console.error('Error fetching chapters:', error);
    res.status(500).json({ error: 'Failed to fetch chapters' });
  }
});

// GET /api/chapters/:id - Get single chapter
chapterRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const chapter = await prisma.chapter.findUnique({
      where: { id },
      include: {
        events: true,
      },
    });

    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    res.json({
      ...chapter,
      yearsCovered: JSON.parse(chapter.yearsCovered),
    });
  } catch (error) {
    console.error('Error fetching chapter:', error);
    res.status(500).json({ error: 'Failed to fetch chapter' });
  }
});
