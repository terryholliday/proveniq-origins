"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.insightsRoutes = void 0;
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const openai_1 = __importDefault(require("openai"));
exports.insightsRoutes = (0, express_1.Router)();
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
// GET /api/insights/this-day - Get "This Day in Your Life" memories
exports.insightsRoutes.get('/this-day', async (req, res) => {
    try {
        const today = new Date();
        const month = today.getMonth() + 1;
        const day = today.getDate();
        // Find events that happened on this day in previous years
        const events = await prisma_1.prisma.event.findMany({
            where: {
                date: {
                    not: null,
                },
            },
            include: {
                personLinks: {
                    include: { person: true },
                },
                chapter: true,
            },
            orderBy: { date: 'desc' },
        });
        // Filter events that match today's month and day
        const thisDay = events.filter((event) => {
            if (!event.date)
                return false;
            const eventDate = new Date(event.date);
            return eventDate.getMonth() + 1 === month && eventDate.getDate() === day;
        });
        // Also get events from "around this time" (within 3 days)
        const aroundThisTime = events.filter((event) => {
            if (!event.date)
                return false;
            const eventDate = new Date(event.date);
            const eventMonth = eventDate.getMonth() + 1;
            const eventDay = eventDate.getDate();
            // Check if within 3 days (simple check, not accounting for month boundaries perfectly)
            if (eventMonth === month) {
                return Math.abs(eventDay - day) <= 3 && Math.abs(eventDay - day) > 0;
            }
            return false;
        }).slice(0, 5);
        // Get a random memory prompt if no events today
        const prompts = [
            "What's your earliest childhood memory?",
            "Who was your best friend growing up?",
            "What was your favorite family tradition?",
            "Describe a moment that changed your perspective on life.",
            "What's a skill you learned from a parent or grandparent?",
            "What was your first job like?",
            "Describe a place that felt like home.",
            "What's a song that takes you back to a specific moment?",
            "Who believed in you when you didn't believe in yourself?",
            "What's a lesson you learned the hard way?",
            "Describe a moment of unexpected kindness.",
            "What tradition do you want to pass down?",
            "What's a story your family always tells about you?",
            "Describe a turning point in your life.",
            "What's something you wish you had asked a grandparent?",
        ];
        const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
        res.json({
            date: today.toISOString(),
            thisDay,
            aroundThisTime,
            prompt: thisDay.length === 0 ? randomPrompt : null,
            yearsAgo: thisDay.map((e) => {
                const eventYear = new Date(e.date).getFullYear();
                return {
                    ...e,
                    yearsAgo: today.getFullYear() - eventYear,
                };
            }),
        });
    }
    catch (error) {
        console.error('Error fetching this day memories:', error);
        res.status(500).json({ error: 'Failed to fetch memories' });
    }
});
// GET /api/insights/life-themes - Analyze life themes and patterns
exports.insightsRoutes.get('/life-themes', async (req, res) => {
    try {
        // Get all events with their tags and emotions
        const events = await prisma_1.prisma.event.findMany({
            include: {
                personLinks: { include: { person: true } },
                tagLinks: { include: { tag: true } },
                chapter: true,
            },
            orderBy: { date: 'asc' },
        });
        if (events.length < 5) {
            return res.json({
                themes: [],
                patterns: [],
                message: 'Add more events to discover life themes and patterns.',
            });
        }
        // Aggregate tags and emotions
        const tagCounts = {};
        const emotionCounts = {};
        const peopleMentions = {};
        const decadeEvents = {};
        events.forEach((event) => {
            // Count tags
            event.tagLinks.forEach((tl) => {
                tagCounts[tl.tag.name] = (tagCounts[tl.tag.name] || 0) + 1;
            });
            // Count emotions
            try {
                const emotions = JSON.parse(event.emotionTags || '[]');
                emotions.forEach((emotion) => {
                    emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
                });
            }
            catch { }
            // Count people
            event.personLinks.forEach((pl) => {
                peopleMentions[pl.person.name] = (peopleMentions[pl.person.name] || 0) + 1;
            });
            // Count by decade
            if (event.date) {
                const decade = Math.floor(new Date(event.date).getFullYear() / 10) * 10;
                decadeEvents[`${decade}s`] = (decadeEvents[`${decade}s`] || 0) + 1;
            }
        });
        // Sort and get top items
        const topTags = Object.entries(tagCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        const topEmotions = Object.entries(emotionCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        const topPeople = Object.entries(peopleMentions)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        // Use AI to identify deeper themes if we have enough data
        let aiThemes = [];
        let aiPatterns = [];
        if (events.length >= 10 && process.env.OPENAI_API_KEY) {
            const eventSummaries = events.slice(0, 50).map((e) => ({
                title: e.title,
                date: e.date,
                summary: e.summary,
                emotions: e.emotionTags,
                people: e.personLinks.map((pl) => pl.person.name).join(', '),
            }));
            try {
                const completion = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: `You are a life pattern analyst. Analyze these life events and identify:
1. 3-5 major recurring THEMES (e.g., "resilience through adversity", "family as anchor", "creative expression")
2. 2-3 notable PATTERNS (e.g., "major changes often follow periods of stability", "relationships deepen through shared challenges")

Be specific and insightful. These should feel like profound realizations about the person's life.
Respond in JSON format: { "themes": ["theme1", "theme2"], "patterns": ["pattern1", "pattern2"] }`,
                        },
                        {
                            role: 'user',
                            content: JSON.stringify(eventSummaries),
                        },
                    ],
                    response_format: { type: 'json_object' },
                    max_tokens: 500,
                });
                const result = JSON.parse(completion.choices[0].message.content || '{}');
                aiThemes = result.themes || [];
                aiPatterns = result.patterns || [];
            }
            catch (error) {
                console.error('AI theme analysis error:', error);
            }
        }
        res.json({
            totalEvents: events.length,
            topTags,
            topEmotions,
            topPeople,
            decadeDistribution: decadeEvents,
            themes: aiThemes,
            patterns: aiPatterns,
        });
    }
    catch (error) {
        console.error('Error analyzing life themes:', error);
        res.status(500).json({ error: 'Failed to analyze themes' });
    }
});
// POST /api/insights/legacy-letter - Generate a legacy letter
exports.insightsRoutes.post('/legacy-letter', async (req, res) => {
    try {
        const { recipient, relationship, tone, includeThemes } = req.body;
        if (!recipient || !relationship) {
            return res.status(400).json({ error: 'Recipient and relationship are required' });
        }
        // Get user's events and life data
        const events = await prisma_1.prisma.event.findMany({
            where: { isKeystone: true },
            include: {
                personLinks: { include: { person: true } },
            },
            orderBy: { date: 'asc' },
            take: 20,
        });
        const chapters = await prisma_1.prisma.chapter.findMany({
            orderBy: { number: 'asc' },
        });
        const people = await prisma_1.prisma.person.findMany({
            where: { isPrimary: true },
        });
        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({ error: 'AI not configured' });
        }
        const context = {
            keystoneEvents: events.map((e) => ({
                title: e.title,
                date: e.date,
                summary: e.summary,
            })),
            chapters: chapters.map((c) => c.title),
            importantPeople: people.map((p) => ({ name: p.name, role: p.role })),
        };
        const toneGuide = {
            warm: 'warm, loving, and heartfelt',
            reflective: 'thoughtful, introspective, and wise',
            celebratory: 'joyful, proud, and celebratory',
            advisory: 'guiding, mentoring, with life lessons',
        };
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `You are helping someone write a legacy letter to their ${relationship} named ${recipient}. 
The tone should be ${toneGuide[tone] || 'warm and sincere'}.

This letter should:
- Feel deeply personal and authentic
- Reference specific life experiences when relevant
- Share wisdom gained from their journey
- Express what the recipient means to them
- Leave them with something meaningful to remember

Write in first person as if you ARE the memoir author. Make it feel like their authentic voice.
The letter should be 400-600 words.`,
                },
                {
                    role: 'user',
                    content: `Here is context about my life to draw from:\n${JSON.stringify(context, null, 2)}\n\n${includeThemes ? 'Please weave in life themes and lessons learned.' : ''}`,
                },
            ],
            max_tokens: 1000,
        });
        const letter = completion.choices[0].message.content;
        res.json({
            recipient,
            relationship,
            tone,
            letter,
            generatedAt: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('Error generating legacy letter:', error);
        res.status(500).json({ error: 'Failed to generate letter' });
    }
});
// GET /api/insights/streak - Get memory streak data
exports.insightsRoutes.get('/streak', async (req, res) => {
    try {
        // Get all events grouped by creation date
        const events = await prisma_1.prisma.event.findMany({
            select: {
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        // Calculate streak
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const eventDates = new Set(events.map((e) => {
            const d = new Date(e.createdAt);
            d.setHours(0, 0, 0, 0);
            return d.toISOString().split('T')[0];
        }));
        let currentStreak = 0;
        let longestStreak = 0;
        let tempStreak = 0;
        let checkDate = new Date(today);
        // Check if user added something today or yesterday (grace period)
        const todayStr = today.toISOString().split('T')[0];
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        if (eventDates.has(todayStr) || eventDates.has(yesterdayStr)) {
            // Count backwards from today/yesterday
            if (!eventDates.has(todayStr)) {
                checkDate = yesterday;
            }
            while (true) {
                const dateStr = checkDate.toISOString().split('T')[0];
                if (eventDates.has(dateStr)) {
                    currentStreak++;
                    checkDate.setDate(checkDate.getDate() - 1);
                }
                else {
                    break;
                }
            }
        }
        // Calculate longest streak ever
        const sortedDates = Array.from(eventDates).sort();
        for (let i = 0; i < sortedDates.length; i++) {
            if (i === 0) {
                tempStreak = 1;
            }
            else {
                const prev = new Date(sortedDates[i - 1]);
                const curr = new Date(sortedDates[i]);
                const diffDays = Math.floor((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
                if (diffDays === 1) {
                    tempStreak++;
                }
                else {
                    tempStreak = 1;
                }
            }
            longestStreak = Math.max(longestStreak, tempStreak);
        }
        // Get activity for last 30 days
        const last30Days = {};
        for (let i = 0; i < 30; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            last30Days[dateStr] = 0;
        }
        events.forEach((e) => {
            const dateStr = new Date(e.createdAt).toISOString().split('T')[0];
            if (last30Days.hasOwnProperty(dateStr)) {
                last30Days[dateStr]++;
            }
        });
        // Milestones
        const totalMemories = events.length;
        const milestones = [
            { count: 10, label: 'First Steps', achieved: totalMemories >= 10 },
            { count: 50, label: 'Memory Keeper', achieved: totalMemories >= 50 },
            { count: 100, label: 'Storyteller', achieved: totalMemories >= 100 },
            { count: 250, label: 'Life Chronicler', achieved: totalMemories >= 250 },
            { count: 500, label: 'Legacy Builder', achieved: totalMemories >= 500 },
            { count: 1000, label: 'Master Archivist', achieved: totalMemories >= 1000 },
        ];
        const nextMilestone = milestones.find((m) => !m.achieved);
        res.json({
            currentStreak,
            longestStreak,
            totalMemories,
            last30Days,
            milestones,
            nextMilestone,
            addedToday: eventDates.has(todayStr),
        });
    }
    catch (error) {
        console.error('Error fetching streak:', error);
        res.status(500).json({ error: 'Failed to fetch streak data' });
    }
});
// POST /api/insights/voice-memoir - Generate audio narration (placeholder for TTS)
exports.insightsRoutes.post('/voice-memoir', async (req, res) => {
    try {
        const { chapterId, voiceStyle } = req.body;
        // Get chapter content
        const chapter = await prisma_1.prisma.chapter.findUnique({
            where: { id: chapterId },
            include: {
                events: {
                    orderBy: { date: 'asc' },
                    include: {
                        personLinks: { include: { person: true } },
                    },
                },
            },
        });
        if (!chapter) {
            return res.status(404).json({ error: 'Chapter not found' });
        }
        // For now, return the text that would be narrated
        // In production, this would call a TTS API (ElevenLabs, OpenAI TTS, etc.)
        const narrativeText = `Chapter ${chapter.number}: ${chapter.title}\n\n${chapter.summary}\n\n` +
            chapter.events.map((e) => {
                const date = e.date ? new Date(e.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }) : '';
                return `${date ? `On ${date}, ` : ''}${e.title}. ${e.summary || ''}`;
            }).join('\n\n');
        res.json({
            chapterId,
            chapterTitle: chapter.title,
            narrativeText,
            voiceStyle: voiceStyle || 'warm',
            audioUrl: null, // Would be populated with actual TTS audio URL
            message: 'Voice memoir generation ready. TTS integration pending.',
        });
    }
    catch (error) {
        console.error('Error generating voice memoir:', error);
        res.status(500).json({ error: 'Failed to generate voice memoir' });
    }
});
//# sourceMappingURL=insights.js.map