import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from './auth';

export const tagRoutes = Router();

const tagSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

// GET /api/tags - List all tags
tagRoutes.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.authUser!.uid;
    const tags = await prisma.tag.findMany({
      where: { userId },
      include: {
        _count: {
          select: { eventLinks: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    res.json(tags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// GET /api/tags/:id - Get single tag with linked events
tagRoutes.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.authUser!.uid;
    const { id } = req.params;
    const tag = await prisma.tag.findUnique({
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
      },
    });

    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    res.json({
      ...tag,
      events: tag.eventLinks.map((l) => ({
        ...l.event,
        emotionTags: JSON.parse(l.event.emotionTags),
      })),
    });
  } catch (error) {
    console.error('Error fetching tag:', error);
    res.status(500).json({ error: 'Failed to fetch tag' });
  }
});

// POST /api/tags - Create new tag
tagRoutes.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.authUser!.uid;
    const parsed = tagSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors });
    }

    const tag = await prisma.tag.create({
      data: {
        userId,
        name: parsed.data.name,
        description: parsed.data.description || '',
      },
    });

    res.status(201).json(tag);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Tag with this name already exists' });
    }
    console.error('Error creating tag:', error);
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

// PUT /api/tags/:id - Update tag
tagRoutes.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.authUser!.uid;
    const { id } = req.params;

    // Verify ownership
    const existing = await prisma.tag.findUnique({ where: { id, userId } });
    if (!existing) return res.status(404).json({ error: 'Tag not found' });

    const parsed = tagSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors });
    }

    const tag = await prisma.tag.update({
      where: { id },
      data: parsed.data,
    });

    res.json(tag);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Tag with this name already exists' });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Tag not found' });
    }
    console.error('Error updating tag:', error);
    res.status(500).json({ error: 'Failed to update tag' });
  }
});

// DELETE /api/tags/:id - Delete tag
tagRoutes.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.authUser!.uid;
    const { id } = req.params;

    const existing = await prisma.tag.findUnique({ where: { id, userId } });
    if (!existing) return res.status(404).json({ error: 'Tag not found' });

    await prisma.tag.delete({ where: { id } });
    res.status(204).send();
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Tag not found' });
    }
    console.error('Error deleting tag:', error);
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});

// POST /api/tags/:tagId/events/:eventId - Link tag to event
tagRoutes.post('/:tagId/events/:eventId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.authUser!.uid;
    const { tagId, eventId } = req.params;

    // Verify both items belong to user
    const [tag, event] = await Promise.all([
      prisma.tag.findUnique({ where: { id: tagId, userId } }),
      prisma.event.findUnique({ where: { id: eventId, userId } }),
    ]);

    if (!tag || !event) {
      return res.status(404).json({ error: 'Tag or event not found' });
    }

    const link = await prisma.eventTag.create({
      data: { tagId, eventId },
      include: { tag: true, event: true },
    });

    res.status(201).json(link);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Tag already linked to event' });
    }
    if (error.code === 'P2003') {
      return res.status(404).json({ error: 'Tag or event not found' });
    }
    console.error('Error linking tag to event:', error);
    res.status(500).json({ error: 'Failed to link tag to event' });
  }
});

// DELETE /api/tags/:tagId/events/:eventId - Unlink tag from event
tagRoutes.delete('/:tagId/events/:eventId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.authUser!.uid;
    const { tagId, eventId } = req.params;

    // Check ownership of at least one (or relying on join table existence implies relationship, but strictly we should check ownership of tag/event to prevent unlinking others' stuff if IDs guessed)
    // Safest: Check ownership of tag and event.
    const [tag, event] = await Promise.all([
      prisma.tag.findUnique({ where: { id: tagId, userId } }),
      prisma.event.findUnique({ where: { id: eventId, userId } }),
    ]);

    if (!tag || !event) {
      return res.status(404).json({ error: 'Tag or event not found' });
    }

    await prisma.eventTag.delete({
      where: {
        eventId_tagId: { eventId, tagId },
      },
    });

    res.status(204).send();
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Link not found' });
    }
    console.error('Error unlinking tag from event:', error);
    res.status(500).json({ error: 'Failed to unlink tag from event' });
  }
});
