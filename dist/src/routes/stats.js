"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.statsRoutes = void 0;
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
exports.statsRoutes = (0, express_1.Router)();
// GET /api/stats - Get counts for dashboard
exports.statsRoutes.get('/', async (req, res) => {
    try {
        const [eventsCount, chaptersCount, traumaCyclesCount, songsCount, personsCount, artifactsCount, synchronicitiesCount,] = await Promise.all([
            prisma_1.prisma.event.count(),
            prisma_1.prisma.chapter.count(),
            prisma_1.prisma.traumaCycle.count(),
            prisma_1.prisma.song.count(),
            prisma_1.prisma.person.count(),
            prisma_1.prisma.artifact.count(),
            prisma_1.prisma.synchronicity.count(),
        ]);
        res.json({
            events: eventsCount,
            chapters: chaptersCount,
            traumaCycles: traumaCyclesCount,
            songs: songsCount,
            persons: personsCount,
            artifacts: artifactsCount,
            synchronicities: synchronicitiesCount,
        });
    }
    catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});
//# sourceMappingURL=stats.js.map