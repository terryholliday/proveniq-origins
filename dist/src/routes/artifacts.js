"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.artifactRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const node_fetch_1 = __importDefault(require("node-fetch"));
exports.artifactRoutes = (0, express_1.Router)();
const artifactCreateSchema = zod_1.z.object({
    type: zod_1.z.string().min(1, 'Type is required'),
    sourceSystem: zod_1.z.string().optional().default(''),
    sourcePathOrUrl: zod_1.z.string().optional().default(''),
    shortDescription: zod_1.z.string().optional().default(''),
    transcribedText: zod_1.z.string().nullable().optional(),
    importedFrom: zod_1.z.string().nullable().optional(),
});
const artifactUpdateSchema = artifactCreateSchema.partial();
// GET /api/artifacts - List all artifacts with optional type filter
exports.artifactRoutes.get('/', async (req, res) => {
    try {
        const userId = req.authUser.uid;
        const { type } = req.query;
        const where = { userId };
        if (type && typeof type === 'string') {
            where.type = type;
        }
        const artifacts = await prisma_1.prisma.artifact.findMany({
            where,
            include: {
                _count: {
                    select: { eventLinks: true, personLinks: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(artifacts);
    }
    catch (error) {
        console.error('Error fetching artifacts:', error);
        res.status(500).json({ error: 'Failed to fetch artifacts' });
    }
});
// GET /api/artifacts/:id - Get single artifact with linked entities
exports.artifactRoutes.get('/:id', async (req, res) => {
    try {
        const userId = req.authUser.uid;
        const { id } = req.params;
        const artifact = await prisma_1.prisma.artifact.findUnique({
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
    }
    catch (error) {
        console.error('Error fetching artifact:', error);
        res.status(500).json({ error: 'Failed to fetch artifact' });
    }
});
// POST /api/artifacts - Create artifact
exports.artifactRoutes.post('/', async (req, res) => {
    try {
        const userId = req.authUser.uid;
        const validationResult = artifactCreateSchema.safeParse(req.body);
        if (!validationResult.success) {
            return res.status(400).json({
                error: 'Validation failed',
                details: validationResult.error.flatten(),
            });
        }
        const data = validationResult.data;
        const artifact = await prisma_1.prisma.artifact.create({
            data: {
                userId,
                type: data.type,
                sourceSystem: data.sourceSystem,
                sourcePathOrUrl: data.sourcePathOrUrl,
                shortDescription: data.shortDescription,
                transcribedText: data.transcribedText ?? null,
                importedFrom: data.importedFrom ?? null,
            },
        });
        res.status(201).json(artifact);
    }
    catch (error) {
        console.error('Error creating artifact:', error);
        res.status(500).json({ error: 'Failed to create artifact' });
    }
});
// PUT /api/artifacts/:id - Update artifact
exports.artifactRoutes.put('/:id', async (req, res) => {
    try {
        const userId = req.authUser.uid;
        const { id } = req.params;
        const existingArtifact = await prisma_1.prisma.artifact.findUnique({ where: { id, userId } });
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
        const artifact = await prisma_1.prisma.artifact.update({
            where: { id },
            data,
        });
        res.json(artifact);
    }
    catch (error) {
        console.error('Error updating artifact:', error);
        res.status(500).json({ error: 'Failed to update artifact' });
    }
});
// POST /api/artifacts/:id/analyze - AI analysis of artifact content
exports.artifactRoutes.post('/:id/analyze', async (req, res) => {
    try {
        const userId = req.authUser.uid;
        const { id } = req.params;
        const artifact = await prisma_1.prisma.artifact.findUnique({
            where: { id, userId },
            include: {
                eventLinks: { include: { event: true } },
                personLinks: { include: { person: true } },
            },
        });
        if (!artifact) {
            return res.status(404).json({ error: 'Artifact not found' });
        }
        const openaiKey = process.env.OPENAI_API_KEY;
        if (!openaiKey) {
            return res.status(500).json({ error: 'OpenAI API key not configured' });
        }
        // Get content to analyze
        const content = artifact.transcribedText || artifact.shortDescription || '';
        if (!content) {
            return res.status(400).json({ error: 'No content available to analyze' });
        }
        // Build context about linked items
        const linkedEvents = artifact.eventLinks?.map(l => l.event.title).join(', ') || 'none';
        const linkedPeople = artifact.personLinks?.map(l => l.person.name).join(', ') || 'none';
        const response = await (0, node_fetch_1.default)('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `You are Ori, a master biographer and journalist helping someone preserve their life story. You've just analyzed a document they uploaded.

Your role is to:
1. Summarize what you found in the document (key themes, people mentioned, time periods, emotional content)
2. Identify story-worthy elements that could become memoir material
3. Ask 2-3 probing follow-up questions like a skilled journalist would - questions that dig deeper into the emotional truth
4. Suggest what they might want to do with this information (create an event, link to existing events, identify people)

Be warm but professional. You're building their story together.

Respond in JSON format:
{
  "summary": "A 2-3 sentence summary of what the document contains",
  "keyThemes": ["theme1", "theme2"],
  "peopleIdentified": ["name1", "name2"],
  "timePeriod": "Estimated time period if detectable",
  "emotionalTone": "The emotional quality of the content",
  "storyElements": ["Interesting story-worthy element 1", "Element 2"],
  "followUpQuestions": [
    "A probing question about the emotional context",
    "A question about relationships or people involved",
    "A question about what happened before or after"
  ],
  "suggestedActions": [
    { "action": "create_event", "reason": "This describes a specific memory worth capturing" },
    { "action": "link_person", "name": "Person name", "reason": "This person is mentioned prominently" }
  ],
  "oriMessage": "A warm, journalist-style message to the user about what you found and what you'd like to explore together"
}`
                    },
                    {
                        role: 'user',
                        content: `Please analyze this ${artifact.type} artifact.

Type: ${artifact.type}
Description: ${artifact.shortDescription || 'None provided'}
Currently linked to events: ${linkedEvents}
Currently linked to people: ${linkedPeople}

Content:
${content.substring(0, 8000)}`
                    }
                ],
                max_tokens: 1500,
                temperature: 0.7,
            }),
        });
        if (!response.ok) {
            const error = await response.text();
            console.error('OpenAI API error:', error);
            return res.status(500).json({ error: 'AI analysis failed' });
        }
        const data = await response.json();
        const responseContent = data.choices?.[0]?.message?.content || '';
        // Parse JSON response
        try {
            const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const analysis = JSON.parse(jsonMatch[0]);
                // Store analysis in artifact
                await prisma_1.prisma.artifact.update({
                    where: { id },
                    data: {
                        shortDescription: artifact.shortDescription || analysis.summary,
                    },
                });
                return res.json({
                    success: true,
                    analysis,
                });
            }
        }
        catch (parseError) {
            console.error('Failed to parse AI response:', parseError);
        }
        // Fallback if JSON parsing fails
        res.json({
            success: true,
            analysis: {
                summary: responseContent,
                oriMessage: responseContent,
                keyThemes: [],
                followUpQuestions: [],
                suggestedActions: [],
            },
        });
    }
    catch (error) {
        console.error('Error analyzing artifact:', error);
        res.status(500).json({ error: 'Failed to analyze artifact' });
    }
});
// DELETE /api/artifacts/:id - Delete artifact (hard delete)
exports.artifactRoutes.delete('/:id', async (req, res) => {
    try {
        const userId = req.authUser.uid;
        const { id } = req.params;
        const existingArtifact = await prisma_1.prisma.artifact.findUnique({ where: { id, userId } });
        if (!existingArtifact) {
            return res.status(404).json({ error: 'Artifact not found' });
        }
        await prisma_1.prisma.artifact.delete({ where: { id } });
        res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting artifact:', error);
        res.status(500).json({ error: 'Failed to delete artifact' });
    }
});
//# sourceMappingURL=artifacts.js.map