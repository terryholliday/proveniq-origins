import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const linkRoutes = Router();

// ============================================
// Event ↔ Person Links
// ============================================

// POST /api/events/:eventId/persons/:personId - Link person to event
linkRoutes.post('/events/:eventId/persons/:personId', async (req: Request, res: Response) => {
  try {
    const { eventId, personId } = req.params;

    // Verify both entities exist
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const person = await prisma.person.findUnique({ where: { id: personId } });
    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }

    // Check if link already exists
    const existingLink = await prisma.eventPerson.findUnique({
      where: { eventId_personId: { eventId, personId } },
    });

    if (existingLink) {
      return res.status(409).json({ error: 'Link already exists' });
    }

    const link = await prisma.eventPerson.create({
      data: { eventId, personId },
      include: { event: true, person: true },
    });

    res.status(201).json(link);
  } catch (error) {
    console.error('Error linking person to event:', error);
    res.status(500).json({ error: 'Failed to link person to event' });
  }
});

// DELETE /api/events/:eventId/persons/:personId - Unlink person from event
linkRoutes.delete('/events/:eventId/persons/:personId', async (req: Request, res: Response) => {
  try {
    const { eventId, personId } = req.params;

    const existingLink = await prisma.eventPerson.findUnique({
      where: { eventId_personId: { eventId, personId } },
    });

    if (!existingLink) {
      return res.status(404).json({ error: 'Link not found' });
    }

    await prisma.eventPerson.delete({
      where: { eventId_personId: { eventId, personId } },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error unlinking person from event:', error);
    res.status(500).json({ error: 'Failed to unlink person from event' });
  }
});

// ============================================
// Event ↔ Song Links
// ============================================

// POST /api/events/:eventId/songs/:songId - Link song to event
linkRoutes.post('/events/:eventId/songs/:songId', async (req: Request, res: Response) => {
  try {
    const { eventId, songId } = req.params;

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const song = await prisma.song.findUnique({ where: { id: songId } });
    if (!song) {
      return res.status(404).json({ error: 'Song not found' });
    }

    const existingLink = await prisma.eventSong.findUnique({
      where: { eventId_songId: { eventId, songId } },
    });

    if (existingLink) {
      return res.status(409).json({ error: 'Link already exists' });
    }

    const link = await prisma.eventSong.create({
      data: { eventId, songId },
      include: { event: true, song: true },
    });

    res.status(201).json(link);
  } catch (error) {
    console.error('Error linking song to event:', error);
    res.status(500).json({ error: 'Failed to link song to event' });
  }
});

// DELETE /api/events/:eventId/songs/:songId - Unlink song from event
linkRoutes.delete('/events/:eventId/songs/:songId', async (req: Request, res: Response) => {
  try {
    const { eventId, songId } = req.params;

    const existingLink = await prisma.eventSong.findUnique({
      where: { eventId_songId: { eventId, songId } },
    });

    if (!existingLink) {
      return res.status(404).json({ error: 'Link not found' });
    }

    await prisma.eventSong.delete({
      where: { eventId_songId: { eventId, songId } },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error unlinking song from event:', error);
    res.status(500).json({ error: 'Failed to unlink song from event' });
  }
});

// ============================================
// Event ↔ Artifact Links
// ============================================

// POST /api/events/:eventId/artifacts/:artifactId - Link artifact to event
linkRoutes.post('/events/:eventId/artifacts/:artifactId', async (req: Request, res: Response) => {
  try {
    const { eventId, artifactId } = req.params;

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const artifact = await prisma.artifact.findUnique({ where: { id: artifactId } });
    if (!artifact) {
      return res.status(404).json({ error: 'Artifact not found' });
    }

    const existingLink = await prisma.eventArtifact.findUnique({
      where: { eventId_artifactId: { eventId, artifactId } },
    });

    if (existingLink) {
      return res.status(409).json({ error: 'Link already exists' });
    }

    const link = await prisma.eventArtifact.create({
      data: { eventId, artifactId },
      include: { event: true, artifact: true },
    });

    res.status(201).json(link);
  } catch (error) {
    console.error('Error linking artifact to event:', error);
    res.status(500).json({ error: 'Failed to link artifact to event' });
  }
});

// DELETE /api/events/:eventId/artifacts/:artifactId - Unlink artifact from event
linkRoutes.delete('/events/:eventId/artifacts/:artifactId', async (req: Request, res: Response) => {
  try {
    const { eventId, artifactId } = req.params;

    const existingLink = await prisma.eventArtifact.findUnique({
      where: { eventId_artifactId: { eventId, artifactId } },
    });

    if (!existingLink) {
      return res.status(404).json({ error: 'Link not found' });
    }

    await prisma.eventArtifact.delete({
      where: { eventId_artifactId: { eventId, artifactId } },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error unlinking artifact from event:', error);
    res.status(500).json({ error: 'Failed to unlink artifact from event' });
  }
});

// ============================================
// Event ↔ Synchronicity Links
// ============================================

// POST /api/events/:eventId/synchronicities/:synchronicityId - Link synchronicity to event
linkRoutes.post('/events/:eventId/synchronicities/:synchronicityId', async (req: Request, res: Response) => {
  try {
    const { eventId, synchronicityId } = req.params;

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const synchronicity = await prisma.synchronicity.findUnique({ where: { id: synchronicityId } });
    if (!synchronicity) {
      return res.status(404).json({ error: 'Synchronicity not found' });
    }

    const existingLink = await prisma.eventSynchronicity.findUnique({
      where: { eventId_synchronicityId: { eventId, synchronicityId } },
    });

    if (existingLink) {
      return res.status(409).json({ error: 'Link already exists' });
    }

    const link = await prisma.eventSynchronicity.create({
      data: { eventId, synchronicityId },
      include: { event: true, synchronicity: true },
    });

    res.status(201).json(link);
  } catch (error) {
    console.error('Error linking synchronicity to event:', error);
    res.status(500).json({ error: 'Failed to link synchronicity to event' });
  }
});

// DELETE /api/events/:eventId/synchronicities/:synchronicityId - Unlink synchronicity from event
linkRoutes.delete('/events/:eventId/synchronicities/:synchronicityId', async (req: Request, res: Response) => {
  try {
    const { eventId, synchronicityId } = req.params;

    const existingLink = await prisma.eventSynchronicity.findUnique({
      where: { eventId_synchronicityId: { eventId, synchronicityId } },
    });

    if (!existingLink) {
      return res.status(404).json({ error: 'Link not found' });
    }

    await prisma.eventSynchronicity.delete({
      where: { eventId_synchronicityId: { eventId, synchronicityId } },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error unlinking synchronicity from event:', error);
    res.status(500).json({ error: 'Failed to unlink synchronicity from event' });
  }
});

// ============================================
// Artifact ↔ Person Links
// ============================================

// POST /api/artifacts/:artifactId/persons/:personId - Link person to artifact
linkRoutes.post('/artifacts/:artifactId/persons/:personId', async (req: Request, res: Response) => {
  try {
    const { artifactId, personId } = req.params;

    const artifact = await prisma.artifact.findUnique({ where: { id: artifactId } });
    if (!artifact) {
      return res.status(404).json({ error: 'Artifact not found' });
    }

    const person = await prisma.person.findUnique({ where: { id: personId } });
    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }

    const existingLink = await prisma.artifactPerson.findUnique({
      where: { artifactId_personId: { artifactId, personId } },
    });

    if (existingLink) {
      return res.status(409).json({ error: 'Link already exists' });
    }

    const link = await prisma.artifactPerson.create({
      data: { artifactId, personId },
      include: { artifact: true, person: true },
    });

    res.status(201).json(link);
  } catch (error) {
    console.error('Error linking person to artifact:', error);
    res.status(500).json({ error: 'Failed to link person to artifact' });
  }
});

// DELETE /api/artifacts/:artifactId/persons/:personId - Unlink person from artifact
linkRoutes.delete('/artifacts/:artifactId/persons/:personId', async (req: Request, res: Response) => {
  try {
    const { artifactId, personId } = req.params;

    const existingLink = await prisma.artifactPerson.findUnique({
      where: { artifactId_personId: { artifactId, personId } },
    });

    if (!existingLink) {
      return res.status(404).json({ error: 'Link not found' });
    }

    await prisma.artifactPerson.delete({
      where: { artifactId_personId: { artifactId, personId } },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error unlinking person from artifact:', error);
    res.status(500).json({ error: 'Failed to unlink person from artifact' });
  }
});
