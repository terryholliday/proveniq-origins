import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from './auth';

export const traumaCycleRoutes = Router();

// GET /api/trauma-cycles - List all trauma cycles
traumaCycleRoutes.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.authUser!.uid;
    const traumaCycles = await prisma.traumaCycle.findMany({
      where: { userId },
      orderBy: { startYear: 'asc' },
    });

    res.json(traumaCycles);
  } catch (error) {
    console.error('Error fetching trauma cycles:', error);
    res.status(500).json({ error: 'Failed to fetch trauma cycles' });
  }
});

// GET /api/trauma-cycles/:id - Get single trauma cycle
traumaCycleRoutes.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.authUser!.uid;
    const { id } = req.params;

    const traumaCycle = await prisma.traumaCycle.findUnique({
      where: { id, userId },
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

// POST /api/trauma-cycles - Create trauma cycle
traumaCycleRoutes.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.authUser!.uid;
    const { label, startYear, endYear, description } = req.body;

    if (!label) {
      return res.status(400).json({ error: 'Label is required' });
    }

    const traumaCycle = await prisma.traumaCycle.create({
      data: {
        userId,
        label,
        startYear: startYear || null,
        endYear: endYear || null,
        description: description || '',
      },
    });

    res.status(201).json(traumaCycle);
  } catch (error) {
    console.error('Error creating trauma cycle:', error);
    res.status(500).json({ error: 'Failed to create trauma cycle' });
  }
});

// PUT /api/trauma-cycles/:id - Update trauma cycle
traumaCycleRoutes.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.authUser!.uid;
    const { id } = req.params;
    const { label, startYear, endYear, description } = req.body;

    const existing = await prisma.traumaCycle.findUnique({ where: { id, userId } });
    if (!existing) return res.status(404).json({ error: 'Trauma cycle not found' });

    const updateData: any = {};
    if (label !== undefined) updateData.label = label;
    if (startYear !== undefined) updateData.startYear = startYear;
    if (endYear !== undefined) updateData.endYear = endYear;
    if (description !== undefined) updateData.description = description;

    const traumaCycle = await prisma.traumaCycle.update({
      where: { id },
      data: updateData,
    });

    res.json(traumaCycle);
  } catch (error) {
    console.error('Error updating trauma cycle:', error);
    res.status(500).json({ error: 'Failed to update trauma cycle' });
  }
});

// DELETE /api/trauma-cycles/:id - Delete trauma cycle
traumaCycleRoutes.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.authUser!.uid;
    const { id } = req.params;

    const existing = await prisma.traumaCycle.findUnique({ where: { id, userId } });
    if (!existing) return res.status(404).json({ error: 'Trauma cycle not found' });

    await prisma.traumaCycle.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting trauma cycle:', error);
    res.status(500).json({ error: 'Failed to delete trauma cycle' });
  }
});
