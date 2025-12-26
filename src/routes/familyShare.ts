/**
 * @file routes/familyShare.ts
 * @description Family Sharing Routes for Origins Phase 5
 * 
 * Allows memoir owners to share their content with family members.
 * Recipients get read-only access via magic link with optional scoping.
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from './auth';
import { getLedgerWriter } from '../services/ledger-writer';

export const familyShareRoutes = Router();

const createShareSchema = z.object({
  recipientEmail: z.string().email('Valid email required'),
  recipientName: z.string().optional(),
  accessLevel: z.enum(['read', 'contribute']).default('read'),
  expiresInDays: z.number().optional(),
  scopeAllChapters: z.boolean().default(true),
  scopeChapterIds: z.array(z.string()).optional(),
  scopeCollectionIds: z.array(z.string()).optional(),
});

// GET /api/family/shares - List all shares created by the user
familyShareRoutes.get('/shares', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.authUser!.uid;

    const shares = await prisma.familyShare.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(shares.map(s => ({
      ...s,
      scopeChapterIds: JSON.parse(s.scopeChapterIds),
      scopeCollectionIds: JSON.parse(s.scopeCollectionIds),
      shareUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}/shared/${s.accessToken}`,
    })));
  } catch (error) {
    console.error('Error fetching shares:', error);
    res.status(500).json({ error: 'Failed to fetch shares' });
  }
});

// POST /api/family/shares - Create a new share
familyShareRoutes.post('/shares', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.authUser!.uid;
    const parsed = createShareSchema.parse(req.body);

    // Check if share already exists
    const existing = await prisma.familyShare.findUnique({
      where: { userId_recipientEmail: { userId, recipientEmail: parsed.recipientEmail } },
    });

    if (existing) {
      return res.status(409).json({ error: 'Share already exists for this recipient' });
    }

    // Calculate expiry
    let expiresAt: Date | null = null;
    if (parsed.expiresInDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parsed.expiresInDays);
    }

    const share = await prisma.familyShare.create({
      data: {
        userId,
        recipientEmail: parsed.recipientEmail,
        recipientName: parsed.recipientName,
        accessLevel: parsed.accessLevel,
        expiresAt,
        scopeAllChapters: parsed.scopeAllChapters,
        scopeChapterIds: JSON.stringify(parsed.scopeChapterIds || []),
        scopeCollectionIds: JSON.stringify(parsed.scopeCollectionIds || []),
      },
    });

    // Record to Ledger
    const ledgerWriter = getLedgerWriter();
    const ledgerResult = await ledgerWriter.recordFamilyShareCreated(
      userId,
      share.id,
      parsed.recipientEmail,
      parsed.accessLevel
    );

    // Update with ledger event ID
    if (ledgerResult.success && ledgerResult.eventId) {
      await prisma.familyShare.update({
        where: { id: share.id },
        data: { ledgerEventId: ledgerResult.eventId },
      });
    }

    res.status(201).json({
      ...share,
      scopeChapterIds: JSON.parse(share.scopeChapterIds),
      scopeCollectionIds: JSON.parse(share.scopeCollectionIds),
      shareUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}/shared/${share.accessToken}`,
      ledgerSynced: ledgerResult.success,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Error creating share:', error);
    res.status(500).json({ error: 'Failed to create share' });
  }
});

// DELETE /api/family/shares/:id - Revoke a share
familyShareRoutes.delete('/shares/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.authUser!.uid;
    const { id } = req.params;

    const share = await prisma.familyShare.findUnique({
      where: { id },
    });

    if (!share || share.userId !== userId) {
      return res.status(404).json({ error: 'Share not found' });
    }

    // Soft delete - mark as inactive
    await prisma.familyShare.update({
      where: { id },
      data: { isActive: false },
    });

    // Record to Ledger
    const ledgerWriter = getLedgerWriter();
    await ledgerWriter.recordFamilyShareRevoked(userId, id);

    res.json({ success: true, message: 'Share revoked' });
  } catch (error) {
    console.error('Error revoking share:', error);
    res.status(500).json({ error: 'Failed to revoke share' });
  }
});

// GET /api/family/shared/:token - Access shared content (public endpoint)
familyShareRoutes.get('/shared/:token', async (req, res: Response) => {
  try {
    const { token } = req.params;

    const share = await prisma.familyShare.findUnique({
      where: { accessToken: token },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    });

    if (!share) {
      return res.status(404).json({ error: 'Share not found' });
    }

    if (!share.isActive) {
      return res.status(410).json({ error: 'This share has been revoked' });
    }

    if (share.expiresAt && new Date() > share.expiresAt) {
      return res.status(410).json({ error: 'This share has expired' });
    }

    // Update last accessed
    await prisma.familyShare.update({
      where: { id: share.id },
      data: { lastAccessedAt: new Date() },
    });

    // Build scoped content query
    const scopeChapterIds = JSON.parse(share.scopeChapterIds) as string[];
    const scopeCollectionIds = JSON.parse(share.scopeCollectionIds) as string[];

    // Fetch chapters based on scope
    const chapterWhere = share.scopeAllChapters
      ? { userId: share.userId }
      : { userId: share.userId, id: { in: scopeChapterIds } };

    const chapters = await prisma.chapter.findMany({
      where: chapterWhere,
      include: {
        events: {
          include: {
            personLinks: { include: { person: true } },
            artifactLinks: { include: { artifact: true } },
          },
          orderBy: { date: 'asc' },
        },
      },
      orderBy: { number: 'asc' },
    });

    // Fetch collections if scoped
    let collections: any[] = [];
    if (scopeCollectionIds.length > 0) {
      collections = await prisma.collection.findMany({
        where: { id: { in: scopeCollectionIds }, userId: share.userId },
        include: {
          eventLinks: { include: { event: true } },
          artifactLinks: { include: { artifact: true } },
          personLinks: { include: { person: true } },
        },
      });
    }

    // Get memoir stats
    const [eventCount, artifactCount, personCount] = await Promise.all([
      prisma.event.count({ where: { userId: share.userId } }),
      prisma.artifact.count({ where: { userId: share.userId } }),
      prisma.person.count({ where: { userId: share.userId } }),
    ]);

    res.json({
      share: {
        id: share.id,
        ownerName: share.user.name || 'Anonymous',
        accessLevel: share.accessLevel,
        createdAt: share.createdAt,
        expiresAt: share.expiresAt,
      },
      memoir: {
        stats: {
          chapters: chapters.length,
          events: eventCount,
          artifacts: artifactCount,
          people: personCount,
        },
        chapters: chapters.map(ch => ({
          id: ch.id,
          number: ch.number,
          title: ch.title,
          summary: ch.summary,
          yearsCovered: JSON.parse(ch.yearsCovered),
          events: ch.events.map(e => ({
            id: e.id,
            title: e.title,
            date: e.date,
            location: e.location,
            summary: e.summary,
            emotionTags: JSON.parse(e.emotionTags),
            isKeystone: e.isKeystone,
            people: e.personLinks.map(l => l.person.name),
            artifactCount: e.artifactLinks.length,
          })),
        })),
        collections: collections.map(c => ({
          id: c.id,
          name: c.name,
          description: c.description,
          eventCount: c.eventLinks.length,
          artifactCount: c.artifactLinks.length,
          personCount: c.personLinks.length,
        })),
      },
    });
  } catch (error) {
    console.error('Error accessing shared content:', error);
    res.status(500).json({ error: 'Failed to access shared content' });
  }
});

// PATCH /api/family/shares/:id - Update share settings
familyShareRoutes.patch('/shares/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.authUser!.uid;
    const { id } = req.params;
    const { accessLevel, expiresInDays, scopeAllChapters, scopeChapterIds, scopeCollectionIds } = req.body;

    const share = await prisma.familyShare.findUnique({
      where: { id },
    });

    if (!share || share.userId !== userId) {
      return res.status(404).json({ error: 'Share not found' });
    }

    const updateData: any = {};

    if (accessLevel) updateData.accessLevel = accessLevel;
    if (typeof scopeAllChapters === 'boolean') updateData.scopeAllChapters = scopeAllChapters;
    if (scopeChapterIds) updateData.scopeChapterIds = JSON.stringify(scopeChapterIds);
    if (scopeCollectionIds) updateData.scopeCollectionIds = JSON.stringify(scopeCollectionIds);

    if (expiresInDays !== undefined) {
      if (expiresInDays === null) {
        updateData.expiresAt = null;
      } else {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);
        updateData.expiresAt = expiresAt;
      }
    }

    const updated = await prisma.familyShare.update({
      where: { id },
      data: updateData,
    });

    res.json({
      ...updated,
      scopeChapterIds: JSON.parse(updated.scopeChapterIds),
      scopeCollectionIds: JSON.parse(updated.scopeCollectionIds),
      shareUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}/shared/${updated.accessToken}`,
    });
  } catch (error) {
    console.error('Error updating share:', error);
    res.status(500).json({ error: 'Failed to update share' });
  }
});

// POST /api/family/shares/:id/regenerate-token - Generate new access token
familyShareRoutes.post('/shares/:id/regenerate-token', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.authUser!.uid;
    const { id } = req.params;

    const share = await prisma.familyShare.findUnique({
      where: { id },
    });

    if (!share || share.userId !== userId) {
      return res.status(404).json({ error: 'Share not found' });
    }

    // Generate new token using random hex
    const newToken = `share_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

    const updated = await prisma.familyShare.update({
      where: { id },
      data: { accessToken: newToken },
    });

    res.json({
      success: true,
      newShareUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}/shared/${updated.accessToken}`,
    });
  } catch (error) {
    console.error('Error regenerating token:', error);
    res.status(500).json({ error: 'Failed to regenerate token' });
  }
});
