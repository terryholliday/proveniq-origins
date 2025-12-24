import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from './auth';

export const personRoutes = Router();

const personCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  role: z.string().optional().default(''),
  relationshipType: z.string().optional().default(''),
  notes: z.string().optional().default(''),
  isPrimary: z.boolean().optional().default(false),
  tags: z.array(z.string()).optional().default([]),
});

const personUpdateSchema = personCreateSchema.partial();

// GET /api/persons - List all persons with optional search
personRoutes.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.authUser!.uid;
    const { search } = req.query;

    const where: any = { userId };

    if (search && typeof search === 'string') {
      where.name = {
        contains: search,
      };
    }

    const persons = await prisma.person.findMany({
      where,
      include: {
        _count: {
          select: { eventLinks: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json(persons);
  } catch (error) {
    console.error('Error fetching persons:', error);
    res.status(500).json({ error: 'Failed to fetch persons' });
  }
});

// GET /api/persons/:id - Get single person with linked events
personRoutes.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.authUser!.uid;
    const { id } = req.params;

    const person = await prisma.person.findUnique({
      where: { id, userId },
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
        artifactLinks: {
          include: {
            artifact: true,
          },
        },
      },
    });

    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }

    res.json(person);
  } catch (error) {
    console.error('Error fetching person:', error);
    res.status(500).json({ error: 'Failed to fetch person' });
  }
});

// POST /api/persons - Create person
personRoutes.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.authUser!.uid;
    const validationResult = personCreateSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.flatten(),
      });
    }

    const data = validationResult.data;

    const person = await prisma.person.create({
      data: {
        userId,
        name: data.name,
        role: data.role,
        relationshipType: data.relationshipType,
        notes: data.notes,
        isPrimary: data.isPrimary,
        tags: JSON.stringify(data.tags || []),
      },
    });

    res.status(201).json(person);
  } catch (error) {
    console.error('Error creating person:', error);
    res.status(500).json({ error: 'Failed to create person' });
  }
});

// PUT /api/persons/:id - Update person
personRoutes.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.authUser!.uid;
    const { id } = req.params;

    const existingPerson = await prisma.person.findUnique({ where: { id, userId } });
    if (!existingPerson) {
      return res.status(404).json({ error: 'Person not found' });
    }

    const validationResult = personUpdateSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.flatten(),
      });
    }

    const data = validationResult.data;

    // Convert tags array to JSON string if present
    const updateData: any = { ...data };
    if (data.tags !== undefined) {
      updateData.tags = JSON.stringify(data.tags);
    }

    const person = await prisma.person.update({
      where: { id },
      data: updateData,
    });

    res.json(person);
  } catch (error) {
    console.error('Error updating person:', error);
    res.status(500).json({ error: 'Failed to update person' });
  }
});

// DELETE /api/persons/:id - Delete person (hard delete)
personRoutes.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.authUser!.uid;
    const { id } = req.params;

    const existingPerson = await prisma.person.findUnique({ where: { id, userId } });
    if (!existingPerson) {
      return res.status(404).json({ error: 'Person not found' });
    }

    await prisma.person.delete({ where: { id } });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting person:', error);
    res.status(500).json({ error: 'Failed to delete person' });
  }
});
