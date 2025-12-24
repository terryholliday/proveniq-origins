"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.narrativeRoutes = void 0;
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
exports.narrativeRoutes = (0, express_1.Router)();
// GET /api/narrative/chapters - Get all chapters with their events for narrative view
exports.narrativeRoutes.get('/chapters', async (req, res) => {
    try {
        const chapters = await prisma_1.prisma.chapter.findMany({
            include: {
                events: {
                    include: {
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
                    orderBy: { date: 'asc' },
                },
                _count: {
                    select: { events: true },
                },
            },
            orderBy: { number: 'asc' },
        });
        const narrativeChapters = chapters.map((chapter) => ({
            id: chapter.id,
            number: chapter.number,
            title: chapter.title,
            summary: chapter.summary,
            yearsCovered: JSON.parse(chapter.yearsCovered),
            eventCount: chapter._count.events,
            events: chapter.events.map((event) => ({
                id: event.id,
                title: event.title,
                date: event.date,
                location: event.location,
                summary: event.summary,
                emotionTags: JSON.parse(event.emotionTags),
                notes: event.notes,
                isKeystone: event.isKeystone,
                traumaCycle: event.traumaCycle,
                persons: event.personLinks.map((l) => l.person),
                songs: event.songLinks.map((l) => l.song),
                artifacts: event.artifactLinks.map((l) => l.artifact),
                synchronicities: event.synchronicityLinks.map((l) => l.synchronicity),
            })),
        }));
        res.json(narrativeChapters);
    }
    catch (error) {
        console.error('Error fetching narrative chapters:', error);
        res.status(500).json({ error: 'Failed to fetch narrative chapters' });
    }
});
// GET /api/narrative/chapters/:id - Get single chapter narrative view
exports.narrativeRoutes.get('/chapters/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const chapter = await prisma_1.prisma.chapter.findUnique({
            where: { id },
            include: {
                events: {
                    include: {
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
                    orderBy: { date: 'asc' },
                },
            },
        });
        if (!chapter) {
            return res.status(404).json({ error: 'Chapter not found' });
        }
        // Get adjacent chapters for navigation
        const [prevChapter, nextChapter] = await Promise.all([
            prisma_1.prisma.chapter.findFirst({
                where: { number: chapter.number - 1 },
                select: { id: true, number: true, title: true },
            }),
            prisma_1.prisma.chapter.findFirst({
                where: { number: chapter.number + 1 },
                select: { id: true, number: true, title: true },
            }),
        ]);
        const narrativeChapter = {
            id: chapter.id,
            number: chapter.number,
            title: chapter.title,
            summary: chapter.summary,
            yearsCovered: JSON.parse(chapter.yearsCovered),
            prevChapter,
            nextChapter,
            events: chapter.events.map((event) => ({
                id: event.id,
                title: event.title,
                date: event.date,
                location: event.location,
                summary: event.summary,
                emotionTags: JSON.parse(event.emotionTags),
                notes: event.notes,
                isKeystone: event.isKeystone,
                traumaCycle: event.traumaCycle,
                persons: event.personLinks.map((l) => l.person),
                songs: event.songLinks.map((l) => l.song),
                artifacts: event.artifactLinks.map((l) => l.artifact),
                synchronicities: event.synchronicityLinks.map((l) => l.synchronicity),
            })),
        };
        res.json(narrativeChapter);
    }
    catch (error) {
        console.error('Error fetching chapter narrative:', error);
        res.status(500).json({ error: 'Failed to fetch chapter narrative' });
    }
});
//# sourceMappingURL=narrative.js.map