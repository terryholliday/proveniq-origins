"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chapterRoutes = void 0;
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
exports.chapterRoutes = (0, express_1.Router)();
// GET /api/chapters - List all chapters
exports.chapterRoutes.get('/', async (req, res) => {
    try {
        const userId = req.authUser.uid;
        const chapters = await prisma_1.prisma.chapter.findMany({
            where: { userId },
            orderBy: { number: 'asc' },
        });
        const chaptersWithParsedYears = chapters.map((chapter) => ({
            ...chapter,
            yearsCovered: JSON.parse(chapter.yearsCovered),
        }));
        res.json(chaptersWithParsedYears);
    }
    catch (error) {
        console.error('Error fetching chapters:', error);
        res.status(500).json({ error: 'Failed to fetch chapters' });
    }
});
// GET /api/chapters/:id - Get single chapter
exports.chapterRoutes.get('/:id', async (req, res) => {
    try {
        const userId = req.authUser.uid;
        const { id } = req.params;
        const chapter = await prisma_1.prisma.chapter.findUnique({
            where: { id, userId },
            include: {
                events: true,
            },
        });
        if (!chapter) {
            return res.status(404).json({ error: 'Chapter not found' });
        }
        res.json({
            ...chapter,
            yearsCovered: JSON.parse(chapter.yearsCovered),
        });
    }
    catch (error) {
        console.error('Error fetching chapter:', error);
        res.status(500).json({ error: 'Failed to fetch chapter' });
    }
});
// POST /api/chapters - Create chapter
exports.chapterRoutes.post('/', async (req, res) => {
    try {
        const userId = req.authUser.uid;
        const { number, title, yearsCovered, summary } = req.body;
        if (!number || !title) {
            return res.status(400).json({ error: 'Number and title are required' });
        }
        const chapter = await prisma_1.prisma.chapter.create({
            data: {
                userId,
                number,
                title,
                yearsCovered: JSON.stringify(yearsCovered || []),
                summary: summary || '',
            },
        });
        res.status(201).json({
            ...chapter,
            yearsCovered: JSON.parse(chapter.yearsCovered),
        });
    }
    catch (error) {
        console.error('Error creating chapter:', error);
        res.status(500).json({ error: 'Failed to create chapter' });
    }
});
// PUT /api/chapters/:id - Update chapter
exports.chapterRoutes.put('/:id', async (req, res) => {
    try {
        const userId = req.authUser.uid;
        const { id } = req.params;
        const { number, title, yearsCovered, summary } = req.body;
        // Verify ownership
        const existing = await prisma_1.prisma.chapter.findUnique({ where: { id, userId } });
        if (!existing)
            return res.status(404).json({ error: 'Chapter not found' });
        const updateData = {};
        if (number !== undefined)
            updateData.number = number;
        if (title !== undefined)
            updateData.title = title;
        if (yearsCovered !== undefined)
            updateData.yearsCovered = JSON.stringify(yearsCovered);
        if (summary !== undefined)
            updateData.summary = summary;
        const chapter = await prisma_1.prisma.chapter.update({
            where: { id },
            data: updateData,
        });
        res.json({
            ...chapter,
            yearsCovered: JSON.parse(chapter.yearsCovered),
        });
    }
    catch (error) {
        console.error('Error updating chapter:', error);
        res.status(500).json({ error: 'Failed to update chapter' });
    }
});
// DELETE /api/chapters/:id - Delete chapter
exports.chapterRoutes.delete('/:id', async (req, res) => {
    try {
        const userId = req.authUser.uid;
        const { id } = req.params;
        // Verify ownership
        const existing = await prisma_1.prisma.chapter.findUnique({ where: { id, userId } });
        if (!existing)
            return res.status(404).json({ error: 'Chapter not found' });
        await prisma_1.prisma.chapter.delete({
            where: { id },
        });
        res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting chapter:', error);
        res.status(500).json({ error: 'Failed to delete chapter' });
    }
});
//# sourceMappingURL=chapters.js.map