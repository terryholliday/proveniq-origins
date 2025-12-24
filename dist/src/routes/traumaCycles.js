"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.traumaCycleRoutes = void 0;
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
exports.traumaCycleRoutes = (0, express_1.Router)();
// GET /api/trauma-cycles - List all trauma cycles
exports.traumaCycleRoutes.get('/', async (req, res) => {
    try {
        const userId = req.authUser.uid;
        const traumaCycles = await prisma_1.prisma.traumaCycle.findMany({
            where: { userId },
            orderBy: { startYear: 'asc' },
        });
        res.json(traumaCycles);
    }
    catch (error) {
        console.error('Error fetching trauma cycles:', error);
        res.status(500).json({ error: 'Failed to fetch trauma cycles' });
    }
});
// GET /api/trauma-cycles/:id - Get single trauma cycle
exports.traumaCycleRoutes.get('/:id', async (req, res) => {
    try {
        const userId = req.authUser.uid;
        const { id } = req.params;
        const traumaCycle = await prisma_1.prisma.traumaCycle.findUnique({
            where: { id, userId },
            include: {
                events: true,
            },
        });
        if (!traumaCycle) {
            return res.status(404).json({ error: 'Trauma cycle not found' });
        }
        res.json(traumaCycle);
    }
    catch (error) {
        console.error('Error fetching trauma cycle:', error);
        res.status(500).json({ error: 'Failed to fetch trauma cycle' });
    }
});
// POST /api/trauma-cycles - Create trauma cycle
exports.traumaCycleRoutes.post('/', async (req, res) => {
    try {
        const userId = req.authUser.uid;
        const { label, startYear, endYear, description } = req.body;
        if (!label) {
            return res.status(400).json({ error: 'Label is required' });
        }
        const traumaCycle = await prisma_1.prisma.traumaCycle.create({
            data: {
                userId,
                label,
                startYear: startYear || null,
                endYear: endYear || null,
                description: description || '',
            },
        });
        res.status(201).json(traumaCycle);
    }
    catch (error) {
        console.error('Error creating trauma cycle:', error);
        res.status(500).json({ error: 'Failed to create trauma cycle' });
    }
});
// PUT /api/trauma-cycles/:id - Update trauma cycle
exports.traumaCycleRoutes.put('/:id', async (req, res) => {
    try {
        const userId = req.authUser.uid;
        const { id } = req.params;
        const { label, startYear, endYear, description } = req.body;
        const existing = await prisma_1.prisma.traumaCycle.findUnique({ where: { id, userId } });
        if (!existing)
            return res.status(404).json({ error: 'Trauma cycle not found' });
        const updateData = {};
        if (label !== undefined)
            updateData.label = label;
        if (startYear !== undefined)
            updateData.startYear = startYear;
        if (endYear !== undefined)
            updateData.endYear = endYear;
        if (description !== undefined)
            updateData.description = description;
        const traumaCycle = await prisma_1.prisma.traumaCycle.update({
            where: { id },
            data: updateData,
        });
        res.json(traumaCycle);
    }
    catch (error) {
        console.error('Error updating trauma cycle:', error);
        res.status(500).json({ error: 'Failed to update trauma cycle' });
    }
});
// DELETE /api/trauma-cycles/:id - Delete trauma cycle
exports.traumaCycleRoutes.delete('/:id', async (req, res) => {
    try {
        const userId = req.authUser.uid;
        const { id } = req.params;
        const existing = await prisma_1.prisma.traumaCycle.findUnique({ where: { id, userId } });
        if (!existing)
            return res.status(404).json({ error: 'Trauma cycle not found' });
        await prisma_1.prisma.traumaCycle.delete({
            where: { id },
        });
        res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting trauma cycle:', error);
        res.status(500).json({ error: 'Failed to delete trauma cycle' });
    }
});
//# sourceMappingURL=traumaCycles.js.map