import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const chapterOrganizerRoutes = Router();

interface OrganizationSuggestion {
  suggestedChapters: Array<{
    title: string;
    theme: string;
    eventIds: string[];
    reasoning: string;
  }>;
  unassignedEvents: string[];
  overallNarrative: string;
}

// POST /api/chapters/organize - Get AI suggestions for organizing events into chapters
chapterOrganizerRoutes.post('/organize', async (req: Request, res: Response) => {
  try {
    // Get all events, sorted by date
    const events = await prisma.event.findMany({
      orderBy: { date: 'asc' },
      include: {
        chapter: true,
        personLinks: { include: { person: true } },
      },
    });

    if (events.length === 0) {
      return res.json({
        suggestedChapters: [],
        unassignedEvents: [],
        overallNarrative: "No events found. Start by adding some life events to organize.",
      });
    }

    // Build context for AI
    const eventSummaries = events.map(e => ({
      id: e.id,
      title: e.title,
      date: e.date,
      summary: e.summary,
      emotionTags: e.emotionTags,
      isKeystone: e.isKeystone,
      currentChapter: e.chapter?.title || null,
      people: e.personLinks.map(pl => pl.person.name),
    }));

    const googleAiKey = process.env.GOOGLE_AI_API_KEY;
    
    if (googleAiKey) {
      try {
        const prompt = `You are a memoir editor helping organize life events into chapters.

Here are the events to organize (in chronological order):

${eventSummaries.map((e, i) => `${i + 1}. "${e.title}" (${e.date ? new Date(e.date).toLocaleDateString() : 'undated'})
   Summary: ${e.summary || 'No summary'}
   Emotions: ${Array.isArray(e.emotionTags) ? e.emotionTags.join(', ') : 'None tagged'}
   People: ${e.people.join(', ') || 'None'}
   Keystone: ${e.isKeystone ? 'Yes' : 'No'}
   Current Chapter: ${e.currentChapter || 'Unassigned'}`).join('\n\n')}

Analyze these events and suggest how to organize them into memoir chapters. Consider:
- Thematic connections (similar emotions, people, life phases)
- Chronological flow
- Narrative arc (beginning, conflict, resolution)
- Natural chapter breaks (major life transitions)

Respond with ONLY valid JSON in this format:
{
  "suggestedChapters": [
    {
      "title": "Chapter title suggestion",
      "theme": "Brief theme description",
      "eventIds": ["id1", "id2"],
      "reasoning": "Why these events belong together"
    }
  ],
  "unassignedEvents": ["ids of events that don't fit well anywhere"],
  "overallNarrative": "Brief description of the memoir's overall arc"
}`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${googleAiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 4096,
              },
            }),
          }
        );

        if (response.ok) {
          const data = await response.json() as {
            candidates: Array<{ content: { parts: Array<{ text: string }> } }>
          };
          const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

          if (aiResponse) {
            // Extract JSON from response (handle markdown code blocks)
            let jsonStr = aiResponse;
            const jsonMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
              jsonStr = jsonMatch[1];
            }

            try {
              const suggestions = JSON.parse(jsonStr) as OrganizationSuggestion;
              return res.json(suggestions);
            } catch (parseError) {
              console.error('Failed to parse AI response as JSON:', parseError);
            }
          }
        }
      } catch (error) {
        console.error('AI organization error:', error);
      }
    }

    // Fallback: Simple chronological grouping by year
    const eventsByYear = new Map<number, typeof events>();
    for (const event of events) {
      const year = event.date ? new Date(event.date).getFullYear() : 0;
      if (!eventsByYear.has(year)) {
        eventsByYear.set(year, []);
      }
      eventsByYear.get(year)!.push(event);
    }

    const suggestedChapters = Array.from(eventsByYear.entries())
      .filter(([year]) => year > 0)
      .sort(([a], [b]) => a - b)
      .map(([year, yearEvents]) => ({
        title: `The Year ${year}`,
        theme: `Events from ${year}`,
        eventIds: yearEvents.map(e => e.id),
        reasoning: `${yearEvents.length} events occurred in ${year}`,
      }));

    const undatedEvents = eventsByYear.get(0) || [];

    res.json({
      suggestedChapters,
      unassignedEvents: undatedEvents.map(e => e.id),
      overallNarrative: "Events grouped by year. Add an AI API key for smarter thematic organization.",
    });

  } catch (error) {
    console.error('Error organizing chapters:', error);
    res.status(500).json({ error: 'Failed to organize chapters' });
  }
});

// POST /api/chapters/apply - Apply suggested organization
chapterOrganizerRoutes.post('/apply', async (req: Request, res: Response) => {
  try {
    const { chapters } = req.body as {
      chapters: Array<{
        title: string;
        eventIds: string[];
        isNew?: boolean;
        existingChapterId?: string;
      }>;
    };

    const results = {
      chaptersCreated: 0,
      eventsUpdated: 0,
    };

    for (let i = 0; i < chapters.length; i++) {
      const chapterData = chapters[i];
      let chapterId: string;

      if (chapterData.isNew !== false) {
        // Create new chapter
        const chapter = await prisma.chapter.create({
          data: {
            number: i + 1,
            title: chapterData.title,
          },
        });
        chapterId = chapter.id;
        results.chaptersCreated++;
      } else if (chapterData.existingChapterId) {
        chapterId = chapterData.existingChapterId;
      } else {
        continue;
      }

      // Assign events to chapter
      for (const eventId of chapterData.eventIds) {
        await prisma.event.update({
          where: { id: eventId },
          data: { chapterId },
        });
        results.eventsUpdated++;
      }
    }

    res.json({
      success: true,
      results,
    });

  } catch (error) {
    console.error('Error applying chapter organization:', error);
    res.status(500).json({ error: 'Failed to apply organization' });
  }
});

// GET /api/chapters/unassigned - Get events not assigned to any chapter
chapterOrganizerRoutes.get('/unassigned', async (req: Request, res: Response) => {
  try {
    const events = await prisma.event.findMany({
      where: { chapterId: null },
      orderBy: { date: 'asc' },
      include: {
        personLinks: { include: { person: true } },
      },
    });

    res.json(events);
  } catch (error) {
    console.error('Error fetching unassigned events:', error);
    res.status(500).json({ error: 'Failed to fetch unassigned events' });
  }
});
