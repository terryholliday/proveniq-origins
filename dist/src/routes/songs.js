"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.songRoutes = void 0;
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
exports.songRoutes = (0, express_1.Router)();
// GET /api/songs - List all songs
exports.songRoutes.get('/', async (req, res) => {
    try {
        const userId = req.authUser.uid;
        const songs = await prisma_1.prisma.song.findMany({
            where: { userId },
            orderBy: { title: 'asc' },
        });
        res.json(songs);
    }
    catch (error) {
        console.error('Error fetching songs:', error);
        res.status(500).json({ error: 'Failed to fetch songs' });
    }
});
// GET /api/songs/:id - Get single song
exports.songRoutes.get('/:id', async (req, res) => {
    try {
        const userId = req.authUser.uid;
        const { id } = req.params;
        const song = await prisma_1.prisma.song.findUnique({
            where: { id, userId },
            include: {
                eventLinks: {
                    include: { event: true },
                },
            },
        });
        if (!song) {
            return res.status(404).json({ error: 'Song not found' });
        }
        res.json({
            ...song,
            events: song.eventLinks.map((link) => link.event),
        });
    }
    catch (error) {
        console.error('Error fetching song:', error);
        res.status(500).json({ error: 'Failed to fetch song' });
    }
});
// POST /api/songs - Create song
exports.songRoutes.post('/', async (req, res) => {
    try {
        const userId = req.authUser.uid;
        const { title, artist, era, keyLyric, notes } = req.body;
        if (!title || !artist) {
            return res.status(400).json({ error: 'Title and artist are required' });
        }
        const song = await prisma_1.prisma.song.create({
            data: {
                userId,
                title,
                artist,
                era: era || '',
                keyLyric: keyLyric || '',
                notes: notes || '',
            },
        });
        res.status(201).json(song);
    }
    catch (error) {
        console.error('Error creating song:', error);
        res.status(500).json({ error: 'Failed to create song' });
    }
});
// PUT /api/songs/:id - Update song
exports.songRoutes.put('/:id', async (req, res) => {
    try {
        const userId = req.authUser.uid;
        const { id } = req.params;
        const { title, artist, era, keyLyric, notes } = req.body;
        const existing = await prisma_1.prisma.song.findUnique({ where: { id, userId } });
        if (!existing)
            return res.status(404).json({ error: 'Song not found' });
        const updateData = {};
        if (title !== undefined)
            updateData.title = title;
        if (artist !== undefined)
            updateData.artist = artist;
        if (era !== undefined)
            updateData.era = era;
        if (keyLyric !== undefined)
            updateData.keyLyric = keyLyric;
        if (notes !== undefined)
            updateData.notes = notes;
        const song = await prisma_1.prisma.song.update({
            where: { id },
            data: updateData,
        });
        res.json(song);
    }
    catch (error) {
        console.error('Error updating song:', error);
        res.status(500).json({ error: 'Failed to update song' });
    }
});
// DELETE /api/songs/:id - Delete song
exports.songRoutes.delete('/:id', async (req, res) => {
    try {
        const userId = req.authUser.uid;
        const { id } = req.params;
        const existing = await prisma_1.prisma.song.findUnique({ where: { id, userId } });
        if (!existing)
            return res.status(404).json({ error: 'Song not found' });
        await prisma_1.prisma.song.delete({
            where: { id },
        });
        res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting song:', error);
        res.status(500).json({ error: 'Failed to delete song' });
    }
});
//# sourceMappingURL=songs.js.map