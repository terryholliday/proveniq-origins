import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

export const eventRoutes = Router();

const eventCreateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  date: z.string().datetime().nullable().optional(),
  time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).nullable().optional(), // HH:MM format
  timeApproximate: z.boolean().optional().default(false),
  location: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  emotionTags: z.array(z.string()).optional().default([]),
  notes: z.string().nullable().optional(),
  chapterId: z.string().nullable().optional(),
  traumaCycleId: z.string().nullable().optional(),
});

const eventUpdateSchema = eventCreateSchema.partial();

// GET /api/events - List events with optional filtering
eventRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const { chapterId, traumaCycleId, startDate, endDate } = req.query;

    const where: any = {};

    if (chapterId && typeof chapterId === 'string') {
      where.chapterId = chapterId;
    }

    if (traumaCycleId && typeof traumaCycleId === 'string') {
      where.traumaCycleId = traumaCycleId;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate && typeof startDate === 'string') {
        where.date.gte = new Date(startDate);
      }
      if (endDate && typeof endDate === 'string') {
        where.date.lte = new Date(endDate);
      }
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        chapter: true,
        traumaCycle: true,
        _count: {
          select: {
            personLinks: true,
            songLinks: true,
            artifactLinks: true,
            synchronicityLinks: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Parse emotionTags from JSON string
    const eventsWithParsedTags = events.map((event) => ({
      ...event,
      emotionTags: JSON.parse(event.emotionTags),
    }));

    res.json(eventsWithParsedTags);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// GET /api/events/:id - Get single event with all linked entities
eventRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        chapter: true,
        traumaCycle: true,
        personLinks: {
          include: { person: true },
        },
        songLinks: {
          include: { song: true },
        },
        artifactLinks: {
          include: { artifact: true },
        },
        synchronicityLinks: {
          include: { synchronicity: true },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Transform to flatten linked entities for easier frontend consumption
    const transformedEvent = {
      ...event,
      emotionTags: JSON.parse(event.emotionTags),
      persons: event.personLinks.map((link) => link.person),
      songs: event.songLinks.map((link) => link.song),
      artifacts: event.artifactLinks.map((link) => link.artifact),
      synchronicities: event.synchronicityLinks.map((link) => link.synchronicity),
    };

    res.json(transformedEvent);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// POST /api/events - Create event
eventRoutes.post('/', async (req: Request, res: Response) => {
  try {
    const validationResult = eventCreateSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.flatten(),
      });
    }

    const data = validationResult.data;

    const event = await prisma.event.create({
      data: {
        title: data.title,
        date: data.date ? new Date(data.date) : null,
        time: data.time ?? null,
        timeApproximate: data.timeApproximate ?? false,
        location: data.location ?? null,
        summary: data.summary ?? null,
        emotionTags: JSON.stringify(data.emotionTags),
        notes: data.notes ?? null,
        chapterId: data.chapterId ?? null,
        traumaCycleId: data.traumaCycleId ?? null,
      },
      include: {
        chapter: true,
        traumaCycle: true,
      },
    });

    res.status(201).json({
      ...event,
      emotionTags: JSON.parse(event.emotionTags),
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// PUT /api/events/:id - Update event
eventRoutes.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingEvent = await prisma.event.findUnique({ where: { id } });
    if (!existingEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const validationResult = eventUpdateSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.flatten(),
      });
    }

    const data = validationResult.data;

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.date !== undefined) updateData.date = data.date ? new Date(data.date) : null;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.summary !== undefined) updateData.summary = data.summary;
    if (data.emotionTags !== undefined) updateData.emotionTags = JSON.stringify(data.emotionTags);
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.chapterId !== undefined) updateData.chapterId = data.chapterId;
    if (data.traumaCycleId !== undefined) updateData.traumaCycleId = data.traumaCycleId;

    const event = await prisma.event.update({
      where: { id },
      data: updateData,
      include: {
        chapter: true,
        traumaCycle: true,
      },
    });

    res.json({
      ...event,
      emotionTags: JSON.parse(event.emotionTags),
    });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// DELETE /api/events/:id - Delete event (hard delete)
eventRoutes.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingEvent = await prisma.event.findUnique({ where: { id } });
    if (!existingEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    await prisma.event.delete({ where: { id } });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});
