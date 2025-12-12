import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

export const synchronicityRoutes = Router();

const synchronicityCreateSchema = z.object({
  date: z.string().datetime().nullable().optional(),
  type: z.string().min(1, 'Type is required'),
  description: z.string().min(1, 'Description is required'),
  symbolicTag: z.string().nullable().optional(),
});

const synchronicityUpdateSchema = synchronicityCreateSchema.partial();

// GET /api/synchronicities - List all synchronicities
synchronicityRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const { type } = req.query;

    const where: any = {};

    if (type && typeof type === 'string') {
      where.type = type;
    }

    const synchronicities = await prisma.synchronicity.findMany({
      where,
      include: {
        _count: {
          select: { eventLinks: true },
        },
      },
      orderBy: { date: 'desc' },
    });

    res.json(synchronicities);
  } catch (error) {
    console.error('Error fetching synchronicities:', error);
    res.status(500).json({ error: 'Failed to fetch synchronicities' });
  }
});

// GET /api/synchronicities/:id - Get single synchronicity with linked events
synchronicityRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const synchronicity = await prisma.synchronicity.findUnique({
      where: { id },
      include: {
        eventLinks: {
          include: {
            event: {
              include: {
                chapter: true,
                traumaCycle: true,
              },
            },
          },
        },
      },
    });

    if (!synchronicity) {
      return res.status(404).json({ error: 'Synchronicity not found' });
    }

    res.json(synchronicity);
  } catch (error) {
    console.error('Error fetching synchronicity:', error);
    res.status(500).json({ error: 'Failed to fetch synchronicity' });
  }
});

// POST /api/synchronicities - Create synchronicity
synchronicityRoutes.post('/', async (req: Request, res: Response) => {
  try {
    const validationResult = synchronicityCreateSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.flatten(),
      });
    }

    const data = validationResult.data;

    const synchronicity = await prisma.synchronicity.create({
      data: {
        date: data.date ? new Date(data.date) : null,
        type: data.type,
        description: data.description,
        symbolicTag: data.symbolicTag ?? null,
      },
    });

    res.status(201).json(synchronicity);
  } catch (error) {
    console.error('Error creating synchronicity:', error);
    res.status(500).json({ error: 'Failed to create synchronicity' });
  }
});

// PUT /api/synchronicities/:id - Update synchronicity
synchronicityRoutes.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingSynchronicity = await prisma.synchronicity.findUnique({ where: { id } });
    if (!existingSynchronicity) {
      return res.status(404).json({ error: 'Synchronicity not found' });
    }

    const validationResult = synchronicityUpdateSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.flatten(),
      });
    }

    const data = validationResult.data;

    const updateData: any = { ...data };
    if (data.date !== undefined) {
      updateData.date = data.date ? new Date(data.date) : null;
    }

    const synchronicity = await prisma.synchronicity.update({
      where: { id },
      data: updateData,
    });

    res.json(synchronicity);
  } catch (error) {
    console.error('Error updating synchronicity:', error);
    res.status(500).json({ error: 'Failed to update synchronicity' });
  }
});

// DELETE /api/synchronicities/:id - Delete synchronicity (hard delete)
synchronicityRoutes.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingSynchronicity = await prisma.synchronicity.findUnique({ where: { id } });
    if (!existingSynchronicity) {
      return res.status(404).json({ error: 'Synchronicity not found' });
    }

    await prisma.synchronicity.delete({ where: { id } });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting synchronicity:', error);
    res.status(500).json({ error: 'Failed to delete synchronicity' });
  }
});
