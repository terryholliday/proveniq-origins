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

// POST /api/trauma-cycles - Create trauma cycle
traumaCycleRoutes.post('/', async (req: Request, res: Response) => {
  try {
    const { label, startYear, endYear, description } = req.body;

    if (!label) {
      return res.status(400).json({ error: 'Label is required' });
    }

    const traumaCycle = await prisma.traumaCycle.create({
      data: {
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
traumaCycleRoutes.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { label, startYear, endYear, description } = req.body;

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
traumaCycleRoutes.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.traumaCycle.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting trauma cycle:', error);
    res.status(500).json({ error: 'Failed to delete trauma cycle' });
  }
});
