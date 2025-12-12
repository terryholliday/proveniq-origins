import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

export const artifactRoutes = Router();

const artifactCreateSchema = z.object({
  type: z.string().min(1, 'Type is required'),
  sourceSystem: z.string().optional().default(''),
  sourcePathOrUrl: z.string().optional().default(''),
  shortDescription: z.string().optional().default(''),
  transcribedText: z.string().nullable().optional(),
  importedFrom: z.string().nullable().optional(),
});

const artifactUpdateSchema = artifactCreateSchema.partial();

// GET /api/artifacts - List all artifacts with optional type filter
artifactRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const { type } = req.query;

    const where: any = {};

    if (type && typeof type === 'string') {
      where.type = type;
    }

    const artifacts = await prisma.artifact.findMany({
      where,
      include: {
        _count: {
          select: { eventLinks: true, personLinks: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(artifacts);
  } catch (error) {
    console.error('Error fetching artifacts:', error);
    res.status(500).json({ error: 'Failed to fetch artifacts' });
  }
});

// GET /api/artifacts/:id - Get single artifact with linked entities
artifactRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const artifact = await prisma.artifact.findUnique({
      where: { id },
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
        personLinks: {
          include: {
            person: true,
          },
        },
      },
    });

    if (!artifact) {
      return res.status(404).json({ error: 'Artifact not found' });
    }

    res.json(artifact);
  } catch (error) {
    console.error('Error fetching artifact:', error);
    res.status(500).json({ error: 'Failed to fetch artifact' });
  }
});

// POST /api/artifacts - Create artifact
artifactRoutes.post('/', async (req: Request, res: Response) => {
  try {
    const validationResult = artifactCreateSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.flatten(),
      });
    }

    const data = validationResult.data;

    const artifact = await prisma.artifact.create({
      data: {
        type: data.type,
        sourceSystem: data.sourceSystem,
        sourcePathOrUrl: data.sourcePathOrUrl,
        shortDescription: data.shortDescription,
        transcribedText: data.transcribedText ?? null,
        importedFrom: data.importedFrom ?? null,
      },
    });

    res.status(201).json(artifact);
  } catch (error) {
    console.error('Error creating artifact:', error);
    res.status(500).json({ error: 'Failed to create artifact' });
  }
});

// PUT /api/artifacts/:id - Update artifact
artifactRoutes.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingArtifact = await prisma.artifact.findUnique({ where: { id } });
    if (!existingArtifact) {
      return res.status(404).json({ error: 'Artifact not found' });
    }

    const validationResult = artifactUpdateSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.flatten(),
      });
    }

    const data = validationResult.data;

    const artifact = await prisma.artifact.update({
      where: { id },
      data,
    });

    res.json(artifact);
  } catch (error) {
    console.error('Error updating artifact:', error);
    res.status(500).json({ error: 'Failed to update artifact' });
  }
});

// DELETE /api/artifacts/:id - Delete artifact (hard delete)
artifactRoutes.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existingArtifact = await prisma.artifact.findUnique({ where: { id } });
    if (!existingArtifact) {
      return res.status(404).json({ error: 'Artifact not found' });
    }

    await prisma.artifact.delete({ where: { id } });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting artifact:', error);
    res.status(500).json({ error: 'Failed to delete artifact' });
  }
});
