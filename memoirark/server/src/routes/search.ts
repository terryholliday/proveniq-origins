import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const searchRoutes = Router();

// Helper to parse date range (YYYY-MM-DD..YYYY-MM-DD)
function parseDateRange(dateRange: string): { start: Date; end: Date } | null {
  const parts = dateRange.split('..');
  if (parts.length !== 2) return null;
  const start = new Date(parts[0]);
  const end = new Date(parts[1]);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  return { start, end };
}

// GET /api/search - Full-text search across all entities with advanced filters
searchRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const { q, type, chapterId, traumaCycleId, personId, tagId, dateRange } = req.query;
    const searchIn = req.query.in as string | undefined;

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

    // Search Events with advanced filters
    if (!searchType || searchType === 'events') {
      // Build text search conditions based on 'in' parameter
      const textConditions: any[] = [];
      if (!searchIn || searchIn === 'all' || searchIn === 'title') {
        textConditions.push({ title: { contains: query } });
      }
      if (!searchIn || searchIn === 'all' || searchIn === 'summary') {
        textConditions.push({ summary: { contains: query } });
      }
      if (!searchIn || searchIn === 'all' || searchIn === 'notes') {
        textConditions.push({ notes: { contains: query } });
      }

      // Build filter conditions
      const filterConditions: any = {};
      if (chapterId && typeof chapterId === 'string') {
        filterConditions.chapterId = chapterId;
      }
      if (traumaCycleId && typeof traumaCycleId === 'string') {
        filterConditions.traumaCycleId = traumaCycleId;
      }
      if (personId && typeof personId === 'string') {
        filterConditions.personLinks = { some: { personId } };
      }
      if (tagId && typeof tagId === 'string') {
        filterConditions.tagLinks = { some: { tagId } };
      }
      if (dateRange && typeof dateRange === 'string') {
        const parsed = parseDateRange(dateRange);
        if (parsed) {
          filterConditions.date = { gte: parsed.start, lte: parsed.end };
        }
      }

      const events = await prisma.event.findMany({
        where: {
          AND: [
            { OR: textConditions },
            filterConditions,
          ],
        },
        include: {
          chapter: true,
          traumaCycle: true,
          tagLinks: { include: { tag: true } },
        },
        take: 20,
      });
      results.events = events.map((e) => ({
        ...e,
        emotionTags: JSON.parse(e.emotionTags),
        tags: e.tagLinks.map((l) => l.tag),
        fieldMatch: textConditions.length === 1 
          ? (searchIn || 'all')
          : 'multiple',
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

// POST /api/search/filter - Structured multi-filter search
searchRoutes.post('/filter', async (req: Request, res: Response) => {
  try {
    const {
      text,
      searchIn,
      chapterIds,
      traumaCycleIds,
      personIds,
      tagIds,
      dateRange,
      isKeystone,
      hasArtifacts,
      hasSynchronicities,
      limit = 50,
    } = req.body;

    // Build where clause
    const where: any = {};

    // Text search
    if (text && typeof text === 'string' && text.length >= 2) {
      const textConditions: any[] = [];
      const fields = searchIn || ['title', 'summary', 'notes'];
      if (fields.includes('title')) textConditions.push({ title: { contains: text } });
      if (fields.includes('summary')) textConditions.push({ summary: { contains: text } });
      if (fields.includes('notes')) textConditions.push({ notes: { contains: text } });
      if (textConditions.length > 0) {
        where.OR = textConditions;
      }
    }

    // Chapter filter
    if (chapterIds && Array.isArray(chapterIds) && chapterIds.length > 0) {
      where.chapterId = { in: chapterIds };
    }

    // Trauma cycle filter
    if (traumaCycleIds && Array.isArray(traumaCycleIds) && traumaCycleIds.length > 0) {
      where.traumaCycleId = { in: traumaCycleIds };
    }

    // Person filter
    if (personIds && Array.isArray(personIds) && personIds.length > 0) {
      where.personLinks = { some: { personId: { in: personIds } } };
    }

    // Tag filter
    if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
      where.tagLinks = { some: { tagId: { in: tagIds } } };
    }

    // Date range filter
    if (dateRange && typeof dateRange === 'object') {
      if (dateRange.start) {
        where.date = { ...where.date, gte: new Date(dateRange.start) };
      }
      if (dateRange.end) {
        where.date = { ...where.date, lte: new Date(dateRange.end) };
      }
    }

    // Keystone filter
    if (typeof isKeystone === 'boolean') {
      where.isKeystone = isKeystone;
    }

    // Has artifacts filter
    if (hasArtifacts === true) {
      where.artifactLinks = { some: {} };
    }

    // Has synchronicities filter
    if (hasSynchronicities === true) {
      where.synchronicityLinks = { some: {} };
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        chapter: true,
        traumaCycle: true,
        tagLinks: { include: { tag: true } },
        personLinks: { include: { person: true } },
        _count: {
          select: {
            artifactLinks: true,
            synchronicityLinks: true,
            songLinks: true,
          },
        },
      },
      orderBy: { date: 'asc' },
      take: Math.min(limit, 100),
    });

    const results = events.map((e) => ({
      ...e,
      emotionTags: JSON.parse(e.emotionTags),
      tags: e.tagLinks.map((l) => l.tag),
      persons: e.personLinks.map((l) => l.person),
    }));

    res.json({
      totalResults: results.length,
      filters: {
        text,
        searchIn,
        chapterIds,
        traumaCycleIds,
        personIds,
        tagIds,
        dateRange,
        isKeystone,
        hasArtifacts,
        hasSynchronicities,
      },
      results,
    });
  } catch (error) {
    console.error('Error in structured filter:', error);
    res.status(500).json({ error: 'Failed to filter events' });
  }
});
