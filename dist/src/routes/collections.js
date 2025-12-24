"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectionRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
exports.collectionRoutes = (0, express_1.Router)();
const collectionSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Name is required'),
    description: zod_1.z.string().optional(),
});
// GET /api/collections - List all collections
exports.collectionRoutes.get('/', async (req, res) => {
    try {
        const userId = req.authUser.uid;
        const collections = await prisma_1.prisma.collection.findMany({
            where: { userId },
            include: {
                _count: {
                    select: {
                        eventLinks: true,
                        artifactLinks: true,
                        personLinks: true,
                    },
                },
            },
            orderBy: { updatedAt: 'desc' },
        });
        res.json(collections);
    }
    catch (error) {
        console.error('Error fetching collections:', error);
        res.status(500).json({ error: 'Failed to fetch collections' });
    }
});
// GET /api/collections/:id - Get single collection with all linked items
exports.collectionRoutes.get('/:id', async (req, res) => {
    try {
        const userId = req.authUser.uid;
        const { id } = req.params;
        const collection = await prisma_1.prisma.collection.findUnique({
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
                    include: { artifact: true },
                },
                personLinks: {
                    include: { person: true },
                },
            },
        });
        if (!collection) {
            return res.status(404).json({ error: 'Collection not found' });
        }
        res.json({
            ...collection,
            events: collection.eventLinks.map((l) => ({
                ...l.event,
                emotionTags: JSON.parse(l.event.emotionTags),
            })),
            artifacts: collection.artifactLinks.map((l) => l.artifact),
            persons: collection.personLinks.map((l) => l.person),
        });
    }
    catch (error) {
        console.error('Error fetching collection:', error);
        res.status(500).json({ error: 'Failed to fetch collection' });
    }
});
// POST /api/collections - Create new collection
exports.collectionRoutes.post('/', async (req, res) => {
    try {
        const userId = req.authUser.uid;
        const parsed = collectionSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.errors });
        }
        const collection = await prisma_1.prisma.collection.create({
            data: {
                userId,
                name: parsed.data.name,
                description: parsed.data.description || '',
            },
        });
        res.status(201).json(collection);
    }
    catch (error) {
        console.error('Error creating collection:', error);
        res.status(500).json({ error: 'Failed to create collection' });
    }
});
// PUT /api/collections/:id - Update collection
exports.collectionRoutes.put('/:id', async (req, res) => {
    try {
        const userId = req.authUser.uid;
        const { id } = req.params;
        const existing = await prisma_1.prisma.collection.findUnique({ where: { id, userId } });
        if (!existing)
            return res.status(404).json({ error: 'Collection not found' });
        const parsed = collectionSchema.partial().safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.errors });
        }
        const collection = await prisma_1.prisma.collection.update({
            where: { id },
            data: parsed.data,
        });
        res.json(collection);
    }
    catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Collection not found' });
        }
        console.error('Error updating collection:', error);
        res.status(500).json({ error: 'Failed to update collection' });
    }
});
// DELETE /api/collections/:id - Delete collection
exports.collectionRoutes.delete('/:id', async (req, res) => {
    try {
        const userId = req.authUser.uid;
        const { id } = req.params;
        const existing = await prisma_1.prisma.collection.findUnique({ where: { id, userId } });
        if (!existing)
            return res.status(404).json({ error: 'Collection not found' });
        await prisma_1.prisma.collection.delete({ where: { id } });
        res.status(204).send();
    }
    catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Collection not found' });
        }
        console.error('Error deleting collection:', error);
        res.status(500).json({ error: 'Failed to delete collection' });
    }
});
// ============================================
// Collection Item Linking Endpoints
// ============================================
// POST /api/collections/:id/events/:eventId
exports.collectionRoutes.post('/:id/events/:eventId', async (req, res) => {
    try {
        const userId = req.authUser.uid;
        const { id, eventId } = req.params;
        // Verify ownership of both
        const [collection, event] = await Promise.all([
            prisma_1.prisma.collection.findUnique({ where: { id, userId } }),
            prisma_1.prisma.event.findUnique({ where: { id: eventId, userId } }),
        ]);
        if (!collection || !event) {
            return res.status(404).json({ error: 'Collection or event not found' });
        }
        const link = await prisma_1.prisma.collectionEvent.create({
            data: { collectionId: id, eventId },
        });
        res.status(201).json(link);
    }
    catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Event already in collection' });
        }
        if (error.code === 'P2003') {
            return res.status(404).json({ error: 'Collection or event not found' });
        }
        console.error('Error adding event to collection:', error);
        res.status(500).json({ error: 'Failed to add event to collection' });
    }
});
// DELETE /api/collections/:id/events/:eventId
exports.collectionRoutes.delete('/:id/events/:eventId', async (req, res) => {
    try {
        const userId = req.authUser.uid;
        const { id, eventId } = req.params;
        // Verify ownership (at least of collection)
        const collection = await prisma_1.prisma.collection.findUnique({ where: { id, userId } });
        if (!collection)
            return res.status(404).json({ error: 'Collection not found' });
        await prisma_1.prisma.collectionEvent.delete({
            where: { collectionId_eventId: { collectionId: id, eventId } },
        });
        res.status(204).send();
    }
    catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Link not found' });
        }
        console.error('Error removing event from collection:', error);
        res.status(500).json({ error: 'Failed to remove event from collection' });
    }
});
// POST /api/collections/:id/artifacts/:artifactId
exports.collectionRoutes.post('/:id/artifacts/:artifactId', async (req, res) => {
    try {
        const userId = req.authUser.uid;
        const { id, artifactId } = req.params;
        const [collection, artifact] = await Promise.all([
            prisma_1.prisma.collection.findUnique({ where: { id, userId } }),
            prisma_1.prisma.artifact.findUnique({ where: { id: artifactId, userId } }),
        ]);
        if (!collection || !artifact) {
            return res.status(404).json({ error: 'Collection or artifact not found' });
        }
        const link = await prisma_1.prisma.collectionArtifact.create({
            data: { collectionId: id, artifactId },
        });
        res.status(201).json(link);
    }
    catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Artifact already in collection' });
        }
        if (error.code === 'P2003') {
            return res.status(404).json({ error: 'Collection or artifact not found' });
        }
        console.error('Error adding artifact to collection:', error);
        res.status(500).json({ error: 'Failed to add artifact to collection' });
    }
});
// DELETE /api/collections/:id/artifacts/:artifactId
exports.collectionRoutes.delete('/:id/artifacts/:artifactId', async (req, res) => {
    try {
        const userId = req.authUser.uid;
        const { id, artifactId } = req.params;
        const collection = await prisma_1.prisma.collection.findUnique({ where: { id, userId } });
        if (!collection)
            return res.status(404).json({ error: 'Collection not found' });
        await prisma_1.prisma.collectionArtifact.delete({
            where: { collectionId_artifactId: { collectionId: id, artifactId } },
        });
        res.status(204).send();
    }
    catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Link not found' });
        }
        console.error('Error removing artifact from collection:', error);
        res.status(500).json({ error: 'Failed to remove artifact from collection' });
    }
});
// POST /api/collections/:id/persons/:personId
exports.collectionRoutes.post('/:id/persons/:personId', async (req, res) => {
    try {
        const userId = req.authUser.uid;
        const { id, personId } = req.params;
        const [collection, person] = await Promise.all([
            prisma_1.prisma.collection.findUnique({ where: { id, userId } }),
            prisma_1.prisma.person.findUnique({ where: { id: personId, userId } }),
        ]);
        if (!collection || !person) {
            return res.status(404).json({ error: 'Collection or person not found' });
        }
        const link = await prisma_1.prisma.collectionPerson.create({
            data: { collectionId: id, personId },
        });
        res.status(201).json(link);
    }
    catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Person already in collection' });
        }
        if (error.code === 'P2003') {
            return res.status(404).json({ error: 'Collection or person not found' });
        }
        console.error('Error adding person to collection:', error);
        res.status(500).json({ error: 'Failed to add person to collection' });
    }
});
// DELETE /api/collections/:id/persons/:personId
exports.collectionRoutes.delete('/:id/persons/:personId', async (req, res) => {
    try {
        const userId = req.authUser.uid;
        const { id, personId } = req.params;
        const collection = await prisma_1.prisma.collection.findUnique({ where: { id, userId } });
        if (!collection)
            return res.status(404).json({ error: 'Collection not found' });
        await prisma_1.prisma.collectionPerson.delete({
            where: { collectionId_personId: { collectionId: id, personId } },
        });
        res.status(204).send();
    }
    catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Link not found' });
        }
        console.error('Error removing person from collection:', error);
        res.status(500).json({ error: 'Failed to remove person from collection' });
    }
});
//# sourceMappingURL=collections.js.map