"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.personRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
exports.personRoutes = (0, express_1.Router)();
const personCreateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Name is required'),
    role: zod_1.z.string().optional().default(''),
    relationshipType: zod_1.z.string().optional().default(''),
    notes: zod_1.z.string().optional().default(''),
    isPrimary: zod_1.z.boolean().optional().default(false),
    tags: zod_1.z.array(zod_1.z.string()).optional().default([]),
});
const personUpdateSchema = personCreateSchema.partial();
// GET /api/persons - List all persons with optional search
exports.personRoutes.get('/', async (req, res) => {
    try {
        const userId = req.authUser.uid;
        const { search } = req.query;
        const where = { userId };
        if (search && typeof search === 'string') {
            where.name = {
                contains: search,
            };
        }
        const persons = await prisma_1.prisma.person.findMany({
            where,
            include: {
                _count: {
                    select: { eventLinks: true },
                },
            },
            orderBy: { name: 'asc' },
        });
        res.json(persons);
    }
    catch (error) {
        console.error('Error fetching persons:', error);
        res.status(500).json({ error: 'Failed to fetch persons' });
    }
});
// GET /api/persons/:id - Get single person with linked events
exports.personRoutes.get('/:id', async (req, res) => {
    try {
        const userId = req.authUser.uid;
        const { id } = req.params;
        const person = await prisma_1.prisma.person.findUnique({
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
                artifactLinks: {
                    include: {
                        artifact: true,
                    },
                },
            },
        });
        if (!person) {
            return res.status(404).json({ error: 'Person not found' });
        }
        res.json(person);
    }
    catch (error) {
        console.error('Error fetching person:', error);
        res.status(500).json({ error: 'Failed to fetch person' });
    }
});
// POST /api/persons - Create person
exports.personRoutes.post('/', async (req, res) => {
    try {
        const userId = req.authUser.uid;
        const validationResult = personCreateSchema.safeParse(req.body);
        if (!validationResult.success) {
            return res.status(400).json({
                error: 'Validation failed',
                details: validationResult.error.flatten(),
            });
        }
        const data = validationResult.data;
        const person = await prisma_1.prisma.person.create({
            data: {
                userId,
                name: data.name,
                role: data.role,
                relationshipType: data.relationshipType,
                notes: data.notes,
                isPrimary: data.isPrimary,
                tags: JSON.stringify(data.tags || []),
            },
        });
        res.status(201).json(person);
    }
    catch (error) {
        console.error('Error creating person:', error);
        res.status(500).json({ error: 'Failed to create person' });
    }
});
// PUT /api/persons/:id - Update person
exports.personRoutes.put('/:id', async (req, res) => {
    try {
        const userId = req.authUser.uid;
        const { id } = req.params;
        const existingPerson = await prisma_1.prisma.person.findUnique({ where: { id, userId } });
        if (!existingPerson) {
            return res.status(404).json({ error: 'Person not found' });
        }
        const validationResult = personUpdateSchema.safeParse(req.body);
        if (!validationResult.success) {
            return res.status(400).json({
                error: 'Validation failed',
                details: validationResult.error.flatten(),
            });
        }
        const data = validationResult.data;
        // Convert tags array to JSON string if present
        const updateData = { ...data };
        if (data.tags !== undefined) {
            updateData.tags = JSON.stringify(data.tags);
        }
        const person = await prisma_1.prisma.person.update({
            where: { id },
            data: updateData,
        });
        res.json(person);
    }
    catch (error) {
        console.error('Error updating person:', error);
        res.status(500).json({ error: 'Failed to update person' });
    }
});
// DELETE /api/persons/:id - Delete person (hard delete)
exports.personRoutes.delete('/:id', async (req, res) => {
    try {
        const userId = req.authUser.uid;
        const { id } = req.params;
        const existingPerson = await prisma_1.prisma.person.findUnique({ where: { id, userId } });
        if (!existingPerson) {
            return res.status(404).json({ error: 'Person not found' });
        }
        await prisma_1.prisma.person.delete({ where: { id } });
        res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting person:', error);
        res.status(500).json({ error: 'Failed to delete person' });
    }
});
//# sourceMappingURL=persons.js.map