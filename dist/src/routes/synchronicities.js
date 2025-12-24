"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.synchronicityRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
exports.synchronicityRoutes = (0, express_1.Router)();
const synchronicityCreateSchema = zod_1.z.object({
    date: zod_1.z.string().datetime().nullable().optional(),
    type: zod_1.z.string().min(1, 'Type is required'),
    description: zod_1.z.string().min(1, 'Description is required'),
    symbolicTag: zod_1.z.string().nullable().optional(),
});
const synchronicityUpdateSchema = synchronicityCreateSchema.partial();
// GET /api/synchronicities - List all synchronicities
exports.synchronicityRoutes.get('/', async (req, res) => {
    try {
        const userId = req.authUser.uid;
        const { type } = req.query;
        const where = { userId };
        if (type && typeof type === 'string') {
            where.type = type;
        }
        const synchronicities = await prisma_1.prisma.synchronicity.findMany({
            where,
            include: {
                _count: {
                    select: { eventLinks: true },
                },
            },
            orderBy: { date: 'desc' },
        });
        res.json(synchronicities);
    }
    catch (error) {
        console.error('Error fetching synchronicities:', error);
        res.status(500).json({ error: 'Failed to fetch synchronicities' });
    }
});
// GET /api/synchronicities/:id - Get single synchronicity with linked events
exports.synchronicityRoutes.get('/:id', async (req, res) => {
    try {
        const userId = req.authUser.uid;
        const { id } = req.params;
        const synchronicity = await prisma_1.prisma.synchronicity.findUnique({
            where: { id, userId },
            include: {
                eventLinks: {
                    include: {
                        event: {
                            include: {
                                chapter: true,
                                traumaCycle: true,
                            },
                        },
                    },
                },
            },
        });
        if (!synchronicity) {
            return res.status(404).json({ error: 'Synchronicity not found' });
        }
        res.json(synchronicity);
    }
    catch (error) {
        console.error('Error fetching synchronicity:', error);
        res.status(500).json({ error: 'Failed to fetch synchronicity' });
    }
});
// POST /api/synchronicities - Create synchronicity
exports.synchronicityRoutes.post('/', async (req, res) => {
    try {
        const userId = req.authUser.uid;
        const validationResult = synchronicityCreateSchema.safeParse(req.body);
        if (!validationResult.success) {
            return res.status(400).json({
                error: 'Validation failed',
                details: validationResult.error.flatten(),
            });
        }
        const data = validationResult.data;
        const synchronicity = await prisma_1.prisma.synchronicity.create({
            data: {
                userId,
                date: data.date ? new Date(data.date) : null,
                type: data.type,
                description: data.description,
                symbolicTag: data.symbolicTag ?? null,
            },
        });
        res.status(201).json(synchronicity);
    }
    catch (error) {
        console.error('Error creating synchronicity:', error);
        res.status(500).json({ error: 'Failed to create synchronicity' });
    }
});
// PUT /api/synchronicities/:id - Update synchronicity
exports.synchronicityRoutes.put('/:id', async (req, res) => {
    try {
        const userId = req.authUser.uid;
        const { id } = req.params;
        const existingSynchronicity = await prisma_1.prisma.synchronicity.findUnique({ where: { id, userId } });
        if (!existingSynchronicity) {
            return res.status(404).json({ error: 'Synchronicity not found' });
        }
        const validationResult = synchronicityUpdateSchema.safeParse(req.body);
        if (!validationResult.success) {
            return res.status(400).json({
                error: 'Validation failed',
                details: validationResult.error.flatten(),
            });
        }
        const data = validationResult.data;
        const updateData = { ...data };
        if (data.date !== undefined) {
            updateData.date = data.date ? new Date(data.date) : null;
        }
        const synchronicity = await prisma_1.prisma.synchronicity.update({
            where: { id },
            data: updateData,
        });
        res.json(synchronicity);
    }
    catch (error) {
        console.error('Error updating synchronicity:', error);
        res.status(500).json({ error: 'Failed to update synchronicity' });
    }
});
// DELETE /api/synchronicities/:id - Delete synchronicity (hard delete)
exports.synchronicityRoutes.delete('/:id', async (req, res) => {
    try {
        const userId = req.authUser.uid;
        const { id } = req.params;
        const existingSynchronicity = await prisma_1.prisma.synchronicity.findUnique({ where: { id, userId } });
        if (!existingSynchronicity) {
            return res.status(404).json({ error: 'Synchronicity not found' });
        }
        await prisma_1.prisma.synchronicity.delete({ where: { id } });
        res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting synchronicity:', error);
        res.status(500).json({ error: 'Failed to delete synchronicity' });
    }
});
//# sourceMappingURL=synchronicities.js.map