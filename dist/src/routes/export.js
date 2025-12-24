"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportRoutes = void 0;
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
exports.exportRoutes = (0, express_1.Router)();
// GET /api/export/json - Export all data as JSON
exports.exportRoutes.get('/json', async (req, res) => {
    try {
        const [chapters, persons, songs, traumaCycles, events, artifacts, synchronicities] = await Promise.all([
            prisma_1.prisma.chapter.findMany({ orderBy: { number: 'asc' } }),
            prisma_1.prisma.person.findMany({ orderBy: { name: 'asc' } }),
            prisma_1.prisma.song.findMany({ orderBy: { title: 'asc' } }),
            prisma_1.prisma.traumaCycle.findMany({ orderBy: { startYear: 'asc' } }),
            prisma_1.prisma.event.findMany({
                include: {
                    chapter: true,
                    traumaCycle: true,
                    personLinks: { include: { person: true } },
                    songLinks: { include: { song: true } },
                    artifactLinks: { include: { artifact: true } },
                    synchronicityLinks: { include: { synchronicity: true } },
                },
                orderBy: { date: 'asc' },
            }),
            prisma_1.prisma.artifact.findMany({
                include: {
                    personLinks: { include: { person: true } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma_1.prisma.synchronicity.findMany({ orderBy: { date: 'desc' } }),
        ]);
        const exportData = {
            exportedAt: new Date().toISOString(),
            version: '1.0',
            data: {
                chapters: chapters.map((c) => ({
                    ...c,
                    yearsCovered: JSON.parse(c.yearsCovered),
                })),
                persons,
                songs,
                traumaCycles,
                events: events.map((e) => ({
                    ...e,
                    emotionTags: JSON.parse(e.emotionTags),
                    persons: e.personLinks.map((l) => l.person.name),
                    songs: e.songLinks.map((l) => `${l.song.title} — ${l.song.artist}`),
                    artifacts: e.artifactLinks.map((l) => l.artifact.shortDescription || l.artifact.type),
                    synchronicities: e.synchronicityLinks.map((l) => l.synchronicity.type),
                })),
                artifacts: artifacts.map((a) => ({
                    ...a,
                    persons: a.personLinks.map((l) => l.person.name),
                })),
                synchronicities,
            },
        };
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=origins-export.json');
        res.json(exportData);
    }
    catch (error) {
        console.error('Error exporting JSON:', error);
        res.status(500).json({ error: 'Failed to export data' });
    }
});
// GET /api/export/markdown - Export as Markdown memoir draft
exports.exportRoutes.get('/markdown', async (req, res) => {
    try {
        const chapters = await prisma_1.prisma.chapter.findMany({
            include: {
                events: {
                    include: {
                        traumaCycle: true,
                        personLinks: { include: { person: true } },
                        songLinks: { include: { song: true } },
                        artifactLinks: { include: { artifact: true } },
                        synchronicityLinks: { include: { synchronicity: true } },
                    },
                    orderBy: { date: 'asc' },
                },
            },
            orderBy: { number: 'asc' },
        });
        let markdown = '# Origins — Draft Export\n\n';
        markdown += `*Exported on ${new Date().toLocaleDateString()}*\n\n`;
        markdown += '---\n\n';
        chapters.forEach((chapter) => {
            const yearsCovered = JSON.parse(chapter.yearsCovered);
            markdown += `## Chapter ${chapter.number}: ${chapter.title}\n\n`;
            if (yearsCovered.length > 0) {
                markdown += `*Years: ${yearsCovered.join(', ')}*\n\n`;
            }
            if (chapter.summary) {
                markdown += `${chapter.summary}\n\n`;
            }
            if (chapter.events.length === 0) {
                markdown += '*No events recorded for this chapter.*\n\n';
            }
            else {
                chapter.events.forEach((event) => {
                    const dateStr = event.date
                        ? new Date(event.date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                        })
                        : 'Date unknown';
                    markdown += `### ${event.title}\n\n`;
                    markdown += `**${dateStr}**`;
                    if (event.location)
                        markdown += ` — *${event.location}*`;
                    if (event.isKeystone)
                        markdown += ' ⭐';
                    markdown += '\n\n';
                    if (event.summary) {
                        markdown += `${event.summary}\n\n`;
                    }
                    if (event.notes) {
                        markdown += `${event.notes}\n\n`;
                    }
                    // People involved
                    if (event.personLinks.length > 0) {
                        const people = event.personLinks.map((l) => l.person.name).join(', ');
                        markdown += `**People:** ${people}\n\n`;
                    }
                    // Songs
                    if (event.songLinks.length > 0) {
                        const songs = event.songLinks
                            .map((l) => `"${l.song.title}" by ${l.song.artist}`)
                            .join(', ');
                        markdown += `**Soundtrack:** ${songs}\n\n`;
                    }
                    // Synchronicities
                    if (event.synchronicityLinks.length > 0) {
                        markdown += '**Synchronicities:**\n';
                        event.synchronicityLinks.forEach((l) => {
                            markdown += `- ${l.synchronicity.type}`;
                            if (l.synchronicity.symbolicTag)
                                markdown += ` (${l.synchronicity.symbolicTag})`;
                            markdown += '\n';
                        });
                        markdown += '\n';
                    }
                    // Emotion tags
                    const emotionTags = JSON.parse(event.emotionTags);
                    if (emotionTags.length > 0) {
                        markdown += `*Emotions: ${emotionTags.join(', ')}*\n\n`;
                    }
                    markdown += '---\n\n';
                });
            }
        });
        res.setHeader('Content-Type', 'text/markdown');
        res.setHeader('Content-Disposition', 'attachment; filename=origins-draft.md');
        res.send(markdown);
    }
    catch (error) {
        console.error('Error exporting Markdown:', error);
        res.status(500).json({ error: 'Failed to export markdown' });
    }
});
// GET /api/export/stats - Get export statistics
exports.exportRoutes.get('/stats', async (req, res) => {
    try {
        const [eventCount, personCount, artifactCount, synchronicityCount, chapterCount, songCount, eventWithDateCount, keystoneCount,] = await Promise.all([
            prisma_1.prisma.event.count(),
            prisma_1.prisma.person.count(),
            prisma_1.prisma.artifact.count(),
            prisma_1.prisma.synchronicity.count(),
            prisma_1.prisma.chapter.count(),
            prisma_1.prisma.song.count(),
            prisma_1.prisma.event.count({ where: { date: { not: null } } }),
            prisma_1.prisma.event.count({ where: { isKeystone: true } }),
        ]);
        // Get date range of events
        const [earliestEvent, latestEvent] = await Promise.all([
            prisma_1.prisma.event.findFirst({
                where: { date: { not: null } },
                orderBy: { date: 'asc' },
                select: { date: true },
            }),
            prisma_1.prisma.event.findFirst({
                where: { date: { not: null } },
                orderBy: { date: 'desc' },
                select: { date: true },
            }),
        ]);
        res.json({
            events: eventCount,
            eventsWithDates: eventWithDateCount,
            keystoneEvents: keystoneCount,
            persons: personCount,
            artifacts: artifactCount,
            synchronicities: synchronicityCount,
            chapters: chapterCount,
            songs: songCount,
            dateRange: {
                earliest: earliestEvent?.date,
                latest: latestEvent?.date,
            },
        });
    }
    catch (error) {
        console.error('Error fetching export stats:', error);
        res.status(500).json({ error: 'Failed to fetch export stats' });
    }
});
//# sourceMappingURL=export.js.map