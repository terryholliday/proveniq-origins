import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const searchRoutes = Router();

// GET /api/search - Full-text search across all entities
searchRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const { q, type } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const query = q.trim();
    const searchType = type as string | undefined;

    const results: {
      events: any[];
      persons: any[];
      artifacts: any[];
      synchronicities: any[];
      chapters: any[];
      songs: any[];
    } = {
      events: [],
      persons: [],
      artifacts: [],
      synchronicities: [],
      chapters: [],
      songs: [],
    };

    // Search Events
    if (!searchType || searchType === 'events') {
      const events = await prisma.event.findMany({
        where: {
          OR: [
            { title: { contains: query } },
            { summary: { contains: query } },
            { notes: { contains: query } },
            { location: { contains: query } },
          ],
        },
        include: {
          chapter: true,
          traumaCycle: true,
        },
        take: 20,
      });
      results.events = events.map((e) => ({
        ...e,
        emotionTags: JSON.parse(e.emotionTags),
      }));
    }

    // Search Persons
    if (!searchType || searchType === 'persons') {
      const persons = await prisma.person.findMany({
        where: {
          OR: [
            { name: { contains: query } },
            { role: { contains: query } },
            { relationshipType: { contains: query } },
            { notes: { contains: query } },
          ],
        },
        include: {
          _count: { select: { eventLinks: true } },
        },
        take: 20,
      });
      results.persons = persons;
    }

    // Search Artifacts
    if (!searchType || searchType === 'artifacts') {
      const artifacts = await prisma.artifact.findMany({
        where: {
          OR: [
            { type: { contains: query } },
            { shortDescription: { contains: query } },
            { transcribedText: { contains: query } },
            { sourceSystem: { contains: query } },
            { sourcePathOrUrl: { contains: query } },
          ],
        },
        include: {
          _count: { select: { eventLinks: true } },
        },
        take: 20,
      });
      results.artifacts = artifacts;
    }

    // Search Synchronicities
    if (!searchType || searchType === 'synchronicities') {
      const synchronicities = await prisma.synchronicity.findMany({
        where: {
          OR: [
            { type: { contains: query } },
            { description: { contains: query } },
            { symbolicTag: { contains: query } },
          ],
        },
        include: {
          _count: { select: { eventLinks: true } },
        },
        take: 20,
      });
      results.synchronicities = synchronicities;
    }

    // Search Chapters
    if (!searchType || searchType === 'chapters') {
      const chapters = await prisma.chapter.findMany({
        where: {
          OR: [
            { title: { contains: query } },
            { summary: { contains: query } },
          ],
        },
        take: 20,
      });
      results.chapters = chapters;
    }

    // Search Songs
    if (!searchType || searchType === 'songs') {
      const songs = await prisma.song.findMany({
        where: {
          OR: [
            { title: { contains: query } },
            { artist: { contains: query } },
            { keyLyric: { contains: query } },
            { notes: { contains: query } },
          ],
        },
        take: 20,
      });
      results.songs = songs;
    }

    const totalResults =
      results.events.length +
      results.persons.length +
      results.artifacts.length +
      results.synchronicities.length +
      results.chapters.length +
      results.songs.length;

    res.json({
      query,
      totalResults,
      results,
    });
  } catch (error) {
    console.error('Error searching:', error);
    res.status(500).json({ error: 'Failed to search' });
  }
});
