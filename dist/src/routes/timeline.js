"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.timelineRoutes = void 0;
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
exports.timelineRoutes = (0, express_1.Router)();
// GET /api/timeline - Get all events in chronological order with related data
exports.timelineRoutes.get('/', async (req, res) => {
    try {
        const { startYear, endYear, chapterId, traumaCycleId } = req.query;
        const where = {
            date: { not: null },
        };
        if (startYear && typeof startYear === 'string') {
            const startDate = new Date(`${startYear}-01-01`);
            where.date = { ...where.date, gte: startDate };
        }
        if (endYear && typeof endYear === 'string') {
            const endDate = new Date(`${endYear}-12-31`);
            where.date = { ...where.date, lte: endDate };
        }
        if (chapterId && typeof chapterId === 'string') {
            where.chapterId = chapterId;
        }
        if (traumaCycleId && typeof traumaCycleId === 'string') {
            where.traumaCycleId = traumaCycleId;
        }
        const events = await prisma_1.prisma.event.findMany({
            where,
            include: {
                chapter: true,
                traumaCycle: true,
                personLinks: {
                    include: { person: true },
                },
                artifactLinks: {
                    include: { artifact: true },
                },
                synchronicityLinks: {
                    include: { synchronicity: true },
                },
                _count: {
                    select: {
                        personLinks: true,
                        songLinks: true,
                        artifactLinks: true,
                        synchronicityLinks: true,
                    },
                },
            },
            orderBy: { date: 'asc' },
        });
        // Group events by year for timeline visualization
        const timelineData = [];
        const eventsByYear = new Map();
        events.forEach((event) => {
            if (event.date) {
                const year = new Date(event.date).getFullYear();
                if (!eventsByYear.has(year)) {
                    eventsByYear.set(year, []);
                }
                eventsByYear.get(year).push({
                    ...event,
                    emotionTags: JSON.parse(event.emotionTags),
                    persons: event.personLinks.map((l) => l.person),
                    artifacts: event.artifactLinks.map((l) => l.artifact),
                    synchronicities: event.synchronicityLinks.map((l) => l.synchronicity),
                });
            }
        });
        // Sort years and build timeline array
        const sortedYears = Array.from(eventsByYear.keys()).sort((a, b) => a - b);
        sortedYears.forEach((year) => {
            timelineData.push({
                year,
                events: eventsByYear.get(year),
            });
        });
        res.json({
            totalEvents: events.length,
            yearRange: sortedYears.length > 0
                ? { start: sortedYears[0], end: sortedYears[sortedYears.length - 1] }
                : null,
            timeline: timelineData,
        });
    }
    catch (error) {
        console.error('Error fetching timeline:', error);
        res.status(500).json({ error: 'Failed to fetch timeline' });
    }
});
//# sourceMappingURL=timeline.js.map