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

// POST /api/chapters - Create chapter
chapterRoutes.post('/', async (req: Request, res: Response) => {
  try {
    const { number, title, yearsCovered, summary } = req.body;

    if (!number || !title) {
      return res.status(400).json({ error: 'Number and title are required' });
    }

    const chapter = await prisma.chapter.create({
      data: {
        number,
        title,
        yearsCovered: JSON.stringify(yearsCovered || []),
        summary: summary || '',
      },
    });

    res.status(201).json({
      ...chapter,
      yearsCovered: JSON.parse(chapter.yearsCovered),
    });
  } catch (error) {
    console.error('Error creating chapter:', error);
    res.status(500).json({ error: 'Failed to create chapter' });
  }
});

// PUT /api/chapters/:id - Update chapter
chapterRoutes.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { number, title, yearsCovered, summary } = req.body;

    const updateData: any = {};
    if (number !== undefined) updateData.number = number;
    if (title !== undefined) updateData.title = title;
    if (yearsCovered !== undefined) updateData.yearsCovered = JSON.stringify(yearsCovered);
    if (summary !== undefined) updateData.summary = summary;

    const chapter = await prisma.chapter.update({
      where: { id },
      data: updateData,
    });

    res.json({
      ...chapter,
      yearsCovered: JSON.parse(chapter.yearsCovered),
    });
  } catch (error) {
    console.error('Error updating chapter:', error);
    res.status(500).json({ error: 'Failed to update chapter' });
  }
});

// DELETE /api/chapters/:id - Delete chapter
chapterRoutes.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.chapter.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting chapter:', error);
    res.status(500).json({ error: 'Failed to delete chapter' });
  }
});
