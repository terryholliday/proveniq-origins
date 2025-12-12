import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

export const collectionRoutes = Router();

const collectionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

// GET /api/collections - List all collections
collectionRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const collections = await prisma.collection.findMany({
      include: {
        _count: {
          select: {
            eventLinks: true,
            artifactLinks: true,
            personLinks: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(collections);
  } catch (error) {
    console.error('Error fetching collections:', error);
    res.status(500).json({ error: 'Failed to fetch collections' });
  }
});

// GET /api/collections/:id - Get single collection with all linked items
collectionRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const collection = await prisma.collection.findUnique({
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
        artifactLinks: {
          include: { artifact: true },
        },
        personLinks: {
          include: { person: true },
        },
      },
    });

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    res.json({
      ...collection,
      events: collection.eventLinks.map((l) => ({
        ...l.event,
        emotionTags: JSON.parse(l.event.emotionTags),
      })),
      artifacts: collection.artifactLinks.map((l) => l.artifact),
      persons: collection.personLinks.map((l) => l.person),
    });
  } catch (error) {
    console.error('Error fetching collection:', error);
    res.status(500).json({ error: 'Failed to fetch collection' });
  }
});

// POST /api/collections - Create new collection
collectionRoutes.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = collectionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors });
    }

    const collection = await prisma.collection.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description || '',
      },
    });

    res.status(201).json(collection);
  } catch (error) {
    console.error('Error creating collection:', error);
    res.status(500).json({ error: 'Failed to create collection' });
  }
});

// PUT /api/collections/:id - Update collection
collectionRoutes.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = collectionSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors });
    }

    const collection = await prisma.collection.update({
      where: { id },
      data: parsed.data,
    });

    res.json(collection);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Collection not found' });
    }
    console.error('Error updating collection:', error);
    res.status(500).json({ error: 'Failed to update collection' });
  }
});

// DELETE /api/collections/:id - Delete collection
collectionRoutes.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.collection.delete({ where: { id } });
    res.status(204).send();
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Collection not found' });
    }
    console.error('Error deleting collection:', error);
    res.status(500).json({ error: 'Failed to delete collection' });
  }
});

// ============================================
// Collection Item Linking Endpoints
// ============================================

// POST /api/collections/:id/events/:eventId
collectionRoutes.post('/:id/events/:eventId', async (req: Request, res: Response) => {
  try {
    const { id, eventId } = req.params;
    const link = await prisma.collectionEvent.create({
      data: { collectionId: id, eventId },
    });
    res.status(201).json(link);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Event already in collection' });
    }
    if (error.code === 'P2003') {
      return res.status(404).json({ error: 'Collection or event not found' });
    }
    console.error('Error adding event to collection:', error);
    res.status(500).json({ error: 'Failed to add event to collection' });
  }
});

// DELETE /api/collections/:id/events/:eventId
collectionRoutes.delete('/:id/events/:eventId', async (req: Request, res: Response) => {
  try {
    const { id, eventId } = req.params;
    await prisma.collectionEvent.delete({
      where: { collectionId_eventId: { collectionId: id, eventId } },
    });
    res.status(204).send();
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Link not found' });
    }
    console.error('Error removing event from collection:', error);
    res.status(500).json({ error: 'Failed to remove event from collection' });
  }
});

// POST /api/collections/:id/artifacts/:artifactId
collectionRoutes.post('/:id/artifacts/:artifactId', async (req: Request, res: Response) => {
  try {
    const { id, artifactId } = req.params;
    const link = await prisma.collectionArtifact.create({
      data: { collectionId: id, artifactId },
    });
    res.status(201).json(link);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Artifact already in collection' });
    }
    if (error.code === 'P2003') {
      return res.status(404).json({ error: 'Collection or artifact not found' });
    }
    console.error('Error adding artifact to collection:', error);
    res.status(500).json({ error: 'Failed to add artifact to collection' });
  }
});

// DELETE /api/collections/:id/artifacts/:artifactId
collectionRoutes.delete('/:id/artifacts/:artifactId', async (req: Request, res: Response) => {
  try {
    const { id, artifactId } = req.params;
    await prisma.collectionArtifact.delete({
      where: { collectionId_artifactId: { collectionId: id, artifactId } },
    });
    res.status(204).send();
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Link not found' });
    }
    console.error('Error removing artifact from collection:', error);
    res.status(500).json({ error: 'Failed to remove artifact from collection' });
  }
});

// POST /api/collections/:id/persons/:personId
collectionRoutes.post('/:id/persons/:personId', async (req: Request, res: Response) => {
  try {
    const { id, personId } = req.params;
    const link = await prisma.collectionPerson.create({
      data: { collectionId: id, personId },
    });
    res.status(201).json(link);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Person already in collection' });
    }
    if (error.code === 'P2003') {
      return res.status(404).json({ error: 'Collection or person not found' });
    }
    console.error('Error adding person to collection:', error);
    res.status(500).json({ error: 'Failed to add person to collection' });
  }
});

// DELETE /api/collections/:id/persons/:personId
collectionRoutes.delete('/:id/persons/:personId', async (req: Request, res: Response) => {
  try {
    const { id, personId } = req.params;
    await prisma.collectionPerson.delete({
      where: { collectionId_personId: { collectionId: id, personId } },
    });
    res.status(204).send();
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Link not found' });
    }
    console.error('Error removing person from collection:', error);
    res.status(500).json({ error: 'Failed to remove person from collection' });
  }
});
