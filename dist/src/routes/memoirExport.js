"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.memoirExportRoutes = void 0;
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
exports.memoirExportRoutes = (0, express_1.Router)();
// POST /api/memoir/generate - Generate AI-woven narrative from events
exports.memoirExportRoutes.post('/generate', async (req, res) => {
    try {
        const { chapterIds, style = 'reflective', includeAllEvents = true, authorName = 'Anonymous' } = req.body;
        // Fetch chapters with events
        const whereClause = chapterIds?.length > 0
            ? { id: { in: chapterIds } }
            : {};
        const chapters = await prisma_1.prisma.chapter.findMany({
            where: whereClause,
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
        // Also get unassigned events if requested
        let unassignedEvents = [];
        if (includeAllEvents) {
            unassignedEvents = await prisma_1.prisma.event.findMany({
                where: { chapterId: null },
                include: {
                    personLinks: { include: { person: true } },
                    artifactLinks: { include: { artifact: true } },
                },
                orderBy: { date: 'asc' },
            });
        }
        const googleAiKey = process.env.GOOGLE_AI_API_KEY;
        const narrativeChapters = [];
        // Style prompts
        const stylePrompts = {
            reflective: 'Write in a reflective, introspective style. Focus on meaning and emotional truth. Use first person.',
            journalistic: 'Write in a clear, factual style with vivid details. Balance objectivity with personal voice.',
            literary: 'Write in a literary style with rich imagery, metaphor, and narrative tension. Craft prose that reads like a novel.',
            conversational: 'Write in a warm, conversational tone as if telling stories to a grandchild. Natural and accessible.',
            legacy: 'Write with gravitas and wisdom. This is a legacy document meant to pass down life lessons.',
        };
        for (const chapter of chapters) {
            if (chapter.events.length === 0)
                continue;
            const eventsContext = chapter.events.map(e => {
                const people = e.personLinks.map(l => l.person.name).join(', ');
                const emotionTags = JSON.parse(e.emotionTags || '[]');
                return `EVENT: "${e.title}"
Date: ${e.date ? new Date(e.date).toLocaleDateString() : 'Unknown'}
Location: ${e.location || 'Unknown'}
Summary: ${e.summary || 'No summary'}
Notes: ${e.notes || 'None'}
People involved: ${people || 'None mentioned'}
Emotions: ${emotionTags.join(', ') || 'Not tagged'}
Keystone moment: ${e.isKeystone ? 'Yes' : 'No'}`;
            }).join('\n\n');
            let narrative = '';
            if (googleAiKey) {
                try {
                    const prompt = `You are a skilled memoir ghostwriter. Transform these life events into a cohesive chapter narrative.

CHAPTER: "${chapter.title}"
${chapter.summary ? `Chapter theme: ${chapter.summary}` : ''}

EVENTS TO WEAVE:
${eventsContext}

STYLE INSTRUCTION:
${stylePrompts[style] || stylePrompts.reflective}

REQUIREMENTS:
1. Weave ALL events into a flowing narrative (don't just list them)
2. Create transitions between events
3. Add sensory details and emotional depth where appropriate
4. Maintain chronological flow but allow for reflection
5. Use the people's names naturally in the narrative
6. If an event is marked as a Keystone moment, give it extra weight
7. Keep the author's authentic voice - don't over-dramatize
8. Length: 500-1500 words depending on number of events

Write the chapter narrative now. No preamble, just the prose.`;
                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${googleAiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ role: 'user', parts: [{ text: prompt }] }],
                            generationConfig: {
                                temperature: 0.8,
                                maxOutputTokens: 4096,
                            },
                        }),
                    });
                    if (response.ok) {
                        const data = await response.json();
                        narrative = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    }
                }
                catch (error) {
                    console.error('AI narrative generation error:', error);
                }
            }
            // Fallback: concatenate summaries
            if (!narrative) {
                narrative = chapter.events
                    .map(e => e.summary || e.notes || `[${e.title}]`)
                    .join('\n\n');
            }
            narrativeChapters.push({
                number: chapter.number,
                title: chapter.title,
                narrative,
                events: chapter.events.map(e => ({
                    id: e.id,
                    title: e.title,
                    date: e.date,
                    summary: e.summary,
                })),
            });
        }
        // Handle unassigned events as "Uncategorized Memories"
        if (unassignedEvents.length > 0) {
            const eventsContext = unassignedEvents.map(e => {
                const people = e.personLinks.map(l => l.person.name).join(', ');
                return `"${e.title}" (${e.date ? new Date(e.date).toLocaleDateString() : 'undated'}): ${e.summary || 'No summary'}. People: ${people || 'None'}`;
            }).join('\n');
            let narrative = '';
            if (googleAiKey) {
                try {
                    const prompt = `These are uncategorized life memories that don't fit into specific chapters yet. Write a brief reflective passage (200-400 words) that acknowledges these moments as part of the larger tapestry of life. Style: ${stylePrompts[style]}

MEMORIES:
${eventsContext}

Write a gentle, connecting narrative for these miscellaneous memories.`;
                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${googleAiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ role: 'user', parts: [{ text: prompt }] }],
                            generationConfig: { temperature: 0.8, maxOutputTokens: 1024 },
                        }),
                    });
                    if (response.ok) {
                        const data = await response.json();
                        narrative = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    }
                }
                catch (error) {
                    console.error('AI error for uncategorized:', error);
                }
            }
            if (!narrative) {
                narrative = unassignedEvents.map(e => e.summary || e.title).join('\n\n');
            }
            narrativeChapters.push({
                number: narrativeChapters.length + 1,
                title: 'Other Memories',
                narrative,
                events: unassignedEvents.map(e => ({
                    id: e.id,
                    title: e.title,
                    date: e.date,
                    summary: e.summary,
                })),
            });
        }
        res.json({
            authorName,
            style,
            generatedAt: new Date().toISOString(),
            chapters: narrativeChapters,
            totalEvents: narrativeChapters.reduce((sum, ch) => sum + ch.events.length, 0),
        });
    }
    catch (error) {
        console.error('Error generating memoir:', error);
        res.status(500).json({ error: 'Failed to generate memoir' });
    }
});
// POST /api/memoir/legacy-letter - Generate a legacy letter
exports.memoirExportRoutes.post('/legacy-letter', async (req, res) => {
    try {
        const { recipientName = 'my loved ones', themes = [] } = req.body;
        // Get keystone events and high-emotion events
        const keystoneEvents = await prisma_1.prisma.event.findMany({
            where: { isKeystone: true },
            include: { personLinks: { include: { person: true } } },
            orderBy: { date: 'asc' },
        });
        // Get all people for relationship context
        const people = await prisma_1.prisma.person.findMany({
            include: { eventLinks: { select: { eventId: true } } },
        });
        const googleAiKey = process.env.GOOGLE_AI_API_KEY;
        if (!googleAiKey) {
            return res.status(500).json({ error: 'AI not configured' });
        }
        const keystoneContext = keystoneEvents.map(e => {
            const peopleMentioned = e.personLinks.map(l => l.person.name).join(', ');
            return `- "${e.title}" (${e.date ? new Date(e.date).getFullYear() : 'undated'}): ${e.summary || 'No summary'}. People: ${peopleMentioned || 'None'}`;
        }).join('\n');
        const importantPeople = people
            .sort((a, b) => b.eventLinks.length - a.eventLinks.length)
            .slice(0, 10)
            .map(p => `${p.name} (${p.relationshipType || 'relationship unknown'}) - appears in ${p.eventLinks.length} events`);
        const prompt = `You are helping someone write a legacy letter - a heartfelt message to pass down wisdom and love to future generations.

RECIPIENT: ${recipientName}

KEYSTONE LIFE MOMENTS (the most significant events):
${keystoneContext || 'No keystone events recorded yet'}

IMPORTANT PEOPLE IN THEIR LIFE:
${importantPeople.join('\n') || 'No people recorded yet'}

${themes.length > 0 ? `THEMES TO ADDRESS: ${themes.join(', ')}` : ''}

Write a warm, wise legacy letter (400-800 words) that:
1. Opens with love and acknowledgment of the recipient
2. Distills wisdom from the keystone life moments
3. Acknowledges the important people and relationships
4. Shares life lessons learned
5. Expresses hopes for the recipient's future
6. Closes with enduring love

The tone should be: warm, wise, authentic, not preachy. This is a grandparent speaking to grandchildren, or a parent to children. Real, not saccharine.

Write the letter now.`;
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${googleAiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.85, maxOutputTokens: 2048 },
            }),
        });
        if (!response.ok) {
            throw new Error('AI request failed');
        }
        const data = await response.json();
        const letter = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!letter) {
            throw new Error('No letter generated');
        }
        res.json({
            recipientName,
            generatedAt: new Date().toISOString(),
            letter,
            keystoneEventsUsed: keystoneEvents.length,
            peopleReferenced: importantPeople.length,
        });
    }
    catch (error) {
        console.error('Error generating legacy letter:', error);
        res.status(500).json({ error: 'Failed to generate legacy letter' });
    }
});
// GET /api/memoir/pdf - Generate PDF (returns HTML for client-side PDF generation)
exports.memoirExportRoutes.post('/html', async (req, res) => {
    try {
        const { chapters, authorName = 'Anonymous', title = 'My Memoir' } = req.body;
        if (!chapters || !Array.isArray(chapters)) {
            return res.status(400).json({ error: 'Chapters array required' });
        }
        // Generate print-ready HTML
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @page {
      size: 6in 9in;
      margin: 0.75in;
    }
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1a1a1a;
      max-width: 5in;
      margin: 0 auto;
    }
    .title-page {
      text-align: center;
      page-break-after: always;
      padding-top: 3in;
    }
    .title-page h1 {
      font-size: 28pt;
      margin-bottom: 0.5in;
      font-weight: normal;
      letter-spacing: 0.05em;
    }
    .title-page .author {
      font-size: 14pt;
      font-style: italic;
      color: #444;
    }
    .chapter {
      page-break-before: always;
    }
    .chapter-header {
      text-align: center;
      margin-bottom: 1in;
      padding-top: 1in;
    }
    .chapter-number {
      font-size: 10pt;
      text-transform: uppercase;
      letter-spacing: 0.2em;
      color: #666;
    }
    .chapter-title {
      font-size: 18pt;
      margin-top: 0.25in;
      font-weight: normal;
    }
    .chapter-content {
      text-align: justify;
      text-indent: 0.25in;
    }
    .chapter-content p {
      margin: 0 0 0.5em 0;
    }
    .chapter-content p:first-of-type {
      text-indent: 0;
    }
    .chapter-content p:first-of-type::first-letter {
      font-size: 3em;
      float: left;
      line-height: 0.8;
      padding-right: 0.1em;
      font-weight: bold;
    }
    .toc {
      page-break-after: always;
    }
    .toc h2 {
      text-align: center;
      font-size: 14pt;
      margin-bottom: 1in;
    }
    .toc-entry {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5em;
    }
    .toc-dots {
      flex: 1;
      border-bottom: 1px dotted #999;
      margin: 0 0.5em;
      position: relative;
      top: -0.3em;
    }
  </style>
</head>
<body>
  <div class="title-page">
    <h1>${title}</h1>
    <p class="author">by ${authorName}</p>
  </div>

  <div class="toc">
    <h2>Contents</h2>
    ${chapters.map((ch, i) => `
      <div class="toc-entry">
        <span>Chapter ${ch.number}: ${ch.title}</span>
        <span class="toc-dots"></span>
        <span>${i + 3}</span>
      </div>
    `).join('')}
  </div>

  ${chapters.map((ch) => `
    <div class="chapter">
      <div class="chapter-header">
        <div class="chapter-number">Chapter ${ch.number}</div>
        <h2 class="chapter-title">${ch.title}</h2>
      </div>
      <div class="chapter-content">
        ${ch.narrative.split('\n\n').map(p => `<p>${p}</p>`).join('')}
      </div>
    </div>
  `).join('')}
</body>
</html>`;
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    }
    catch (error) {
        console.error('Error generating HTML:', error);
        res.status(500).json({ error: 'Failed to generate HTML' });
    }
});
// GET /api/memoir/styles - Get available narrative styles
exports.memoirExportRoutes.get('/styles', (req, res) => {
    res.json([
        { id: 'reflective', name: 'Reflective', description: 'Introspective and meaning-focused' },
        { id: 'journalistic', name: 'Journalistic', description: 'Clear, factual with vivid details' },
        { id: 'literary', name: 'Literary', description: 'Rich imagery and narrative tension' },
        { id: 'conversational', name: 'Conversational', description: 'Warm, like telling stories to family' },
        { id: 'legacy', name: 'Legacy', description: 'Gravitas and wisdom for future generations' },
    ]);
});
//# sourceMappingURL=memoirExport.js.map