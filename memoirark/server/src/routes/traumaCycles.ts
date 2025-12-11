import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const traumaCycleRoutes = Router();

// GET /api/trauma-cycles - List all trauma cycles
traumaCycleRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const traumaCycles = await prisma.traumaCycle.findMany({
      orderBy: { startYear: 'asc' },
    });

    res.json(traumaCycles);
  } catch (error) {
    console.error('Error fetching trauma cycles:', error);
    res.status(500).json({ error: 'Failed to fetch trauma cycles' });
  }
});

// GET /api/trauma-cycles/:id - Get single trauma cycle
traumaCycleRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const traumaCycle = await prisma.traumaCycle.findUnique({
      where: { id },
      include: {
        events: true,
      },
    });

    if (!traumaCycle) {
      return res.status(404).json({ error: 'Trauma cycle not found' });
    }

    res.json(traumaCycle);
  } catch (error) {
    console.error('Error fetching trauma cycle:', error);
    res.status(500).json({ error: 'Failed to fetch trauma cycle' });
  }
});
