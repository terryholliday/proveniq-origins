import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

export const tagRoutes = Router();

const tagSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

// GET /api/tags - List all tags
tagRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const tags = await prisma.tag.findMany({
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
tagRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tag = await prisma.tag.findUnique({
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
tagRoutes.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = tagSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors });
    }

    const tag = await prisma.tag.create({
      data: {
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
tagRoutes.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
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
tagRoutes.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
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
tagRoutes.post('/:tagId/events/:eventId', async (req: Request, res: Response) => {
  try {
    const { tagId, eventId } = req.params;
    
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
tagRoutes.delete('/:tagId/events/:eventId', async (req: Request, res: Response) => {
  try {
    const { tagId, eventId } = req.params;
    
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
