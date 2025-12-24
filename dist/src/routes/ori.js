"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OriRoutes = void 0;
const express_1 = require("express");
exports.OriRoutes = (0, express_1.Router)();
// POST /api/ai/Ori - Generate Ori's response
exports.OriRoutes.post('/Ori', async (req, res) => {
    try {
        const { systemPrompt, conversationHistory, userMessage } = req.body;
        if (!userMessage) {
            return res.status(400).json({ error: 'User message is required' });
        }
        // Check for OpenAI API key - PREFERRED for conversational quality
        const openaiKey = process.env.OPENAI_API_KEY;
        if (openaiKey) {
            try {
                // Parse conversation history into proper message format
                const messages = [
                    { role: 'system', content: systemPrompt },
                ];
                // Parse the conversation history into alternating user/assistant messages
                if (conversationHistory && conversationHistory.trim()) {
                    const lines = conversationHistory.split('\n');
                    let currentRole = null;
                    let currentContent = '';
                    for (const line of lines) {
                        if (line.startsWith('User:')) {
                            if (currentRole && currentContent.trim()) {
                                messages.push({ role: currentRole, content: currentContent.trim() });
                            }
                            currentRole = 'user';
                            currentContent = line.replace('User:', '').trim();
                        }
                        else if (line.startsWith('Ori:')) {
                            if (currentRole && currentContent.trim()) {
                                messages.push({ role: currentRole, content: currentContent.trim() });
                            }
                            currentRole = 'assistant';
                            currentContent = line.replace('Ori:', '').trim();
                        }
                        else if (currentRole) {
                            currentContent += '\n' + line;
                        }
                    }
                    if (currentRole && currentContent.trim()) {
                        messages.push({ role: currentRole, content: currentContent.trim() });
                    }
                }
                // Add the current user message
                messages.push({ role: 'user', content: userMessage });
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${openaiKey}`,
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o',
                        messages,
                        max_tokens: 1000,
                        temperature: 0.85,
                    }),
                });
                if (response.ok) {
                    const data = await response.json();
                    const OriResponse = data.choices[0]?.message?.content;
                    if (OriResponse) {
                        console.log('✅ Ori response generated via OpenAI');
                        return res.json({ response: OriResponse });
                    }
                }
                else {
                    const errorData = await response.text();
                    console.error('OpenAI API error:', response.status, errorData);
                }
            }
            catch (error) {
                console.error('OpenAI API error:', error);
                // Fall through to other providers
            }
        }
        // Check for Google AI (Gemini) API key
        const googleAiKey = process.env.GOOGLE_AI_API_KEY;
        if (googleAiKey) {
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${googleAiKey}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contents: [
                            {
                                role: 'user',
                                parts: [{ text: `${systemPrompt}\n\n---\n\nPrevious conversation:\n${conversationHistory}\n\nUser's latest message:\n${userMessage}` }],
                            },
                        ],
                        generationConfig: {
                            temperature: 0.8,
                            maxOutputTokens: 2048,
                        },
                    }),
                });
                if (response.ok) {
                    const data = await response.json();
                    const OriResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (OriResponse) {
                        console.log('✅ Ori response generated via Gemini');
                        return res.json({ response: OriResponse });
                    }
                }
                else {
                    const errorData = await response.text();
                    console.error('Gemini API error:', response.status, errorData);
                }
            }
            catch (error) {
                console.error('Google AI API error:', error);
                // Fall through to other providers
            }
        }
        // Check for Anthropic API key
        const anthropicKey = process.env.ANTHROPIC_API_KEY;
        if (anthropicKey) {
            try {
                const response = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': anthropicKey,
                        'anthropic-version': '2023-06-01',
                    },
                    body: JSON.stringify({
                        model: 'claude-3-sonnet-20240229',
                        max_tokens: 500,
                        system: systemPrompt,
                        messages: [
                            { role: 'user', content: `Previous conversation:\n${conversationHistory}\n\nUser's latest message:\n${userMessage}` },
                        ],
                    }),
                });
                if (response.ok) {
                    const data = await response.json();
                    const OriResponse = data.content[0]?.text;
                    if (OriResponse) {
                        console.log('✅ Ori response generated via Anthropic');
                        return res.json({ response: OriResponse });
                    }
                }
            }
            catch (error) {
                console.error('Anthropic API error:', error);
                // Fall through to fallback
            }
        }
        // Fallback: Generate response using pattern-based logic
        // This demonstrates correct Ori behavior without an LLM
        console.log('⚠️ Using fallback response - no AI provider configured or all failed');
        const fallbackResponse = generateFallbackResponse(userMessage, conversationHistory);
        res.json({ response: fallbackResponse });
    }
    catch (error) {
        console.error('Error in Ori endpoint:', error);
        res.status(500).json({ error: 'Failed to generate response' });
    }
});
// POST /api/ai/rectify - Birth time rectification using life events
exports.OriRoutes.post('/rectify', async (req, res) => {
    try {
        const { birthDate, birthPlace, timeWindow, lifeEvents } = req.body;
        if (!birthDate || !birthPlace || !lifeEvents || lifeEvents.length < 3) {
            return res.status(400).json({
                error: 'Requires birth date, place, and at least 3 life events'
            });
        }
        const openaiKey = process.env.OPENAI_API_KEY;
        const googleAiKey = process.env.GOOGLE_AI_API_KEY;
        if (!openaiKey && !googleAiKey) {
            return res.status(500).json({ error: 'AI not configured' });
        }
        // Categorize events by type for analysis
        const eventsByType = {};
        lifeEvents.forEach((e) => {
            if (!eventsByType[e.type])
                eventsByType[e.type] = [];
            eventsByType[e.type].push(`${e.date}: ${e.description}`);
        });
        const prompt = `You are an expert astrologer performing birth time rectification using the Placidus house system.

BIRTH DATA:
- Date: ${birthDate}
- Place: ${birthPlace}
- Time Window: ${timeWindow.earliest} to ${timeWindow.latest}
- Additional context: ${timeWindow.context || 'None provided'}

LIFE EVENTS BY CATEGORY:
${lifeEvents.map((e, i) => `${i + 1}. ${e.date} - ${e.type}: ${e.description}`).join('\n')}

RECTIFICATION METHOD:
You must systematically test birth times within the window by checking which time produces a chart where major transits/progressions align with the life events.

KEY ANGLE CORRELATIONS (use these to narrow the Ascendant):
- ASCENDANT (1st house cusp): Physical body events - accidents, surgeries, major illness, physical transformation, near-death experiences
- MC (10th house cusp): Career peaks, public recognition, job changes, reputation events
- DESCENDANT (7th house cusp): Marriage, divorce, major partnerships beginning/ending
- IC (4th house cusp): Home moves, parent's death, family structure changes

TRANSIT TIMING RULES:
- Saturn conjunct/square/oppose angles: Major life structure changes, endings, responsibilities
- Uranus conjunct/square/oppose angles: Sudden unexpected events, liberation, accidents
- Pluto conjunct/square/oppose angles: Deep transformation, death/rebirth experiences, power struggles
- Jupiter conjunct angles: Expansion, luck, opportunities
- Mars conjunct Ascendant: Accidents, surgeries, conflicts (within 1° orb)

CRITICAL: The Ascendant moves approximately 1° every 4 minutes. A 2-hour window spans ~30° of the zodiac. You must:
1. Calculate which rising sign degrees would place outer planet transits on angles during the dated events
2. Work BACKWARDS from the events to determine which Ascendant degree fits best
3. Convert that degree back to a birth time

For deaths of loved ones, check transits to the 4th house (parent) or 8th house (transformation/death).
For marriages, check transits to the 7th house cusp and Venus.
For career events, check transits to the 10th house cusp and Saturn.
For accidents/health, check transits to the 1st house cusp and Mars.

Respond with ONLY valid JSON (no markdown, no code fences):
{
  "estimatedTime": "HH:MM",
  "confidenceLevel": "low" | "medium" | "high",
  "reasoning": "Detailed explanation of which specific transits to which angles/houses correlate with which events, and how you derived the time",
  "alternativeTimes": ["HH:MM", "HH:MM"],
  "missingEventTypes": ["list of event types that would help narrow down further - e.g., 'accident or surgery date', 'exact marriage date'"],
  "disclaimer": "Brief reminder that this is a hypothesis, not fact"
}`;
        let aiResponse = null;
        // Try OpenAI first
        if (openaiKey) {
            try {
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${openaiKey}`,
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o',
                        messages: [
                            { role: 'system', content: 'You are an expert astrologer. Respond only with valid JSON, no markdown.' },
                            { role: 'user', content: prompt },
                        ],
                        max_tokens: 1000,
                        temperature: 0.7,
                    }),
                });
                if (response.ok) {
                    const data = await response.json();
                    aiResponse = data.choices[0]?.message?.content;
                    console.log('✅ Rectification via OpenAI');
                }
            }
            catch (error) {
                console.error('OpenAI rectification error:', error);
            }
        }
        // Fallback to Google AI
        if (!aiResponse && googleAiKey) {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${googleAiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 1024,
                    },
                }),
            });
            if (response.ok) {
                const data = await response.json();
                aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
                console.log('✅ Rectification via Gemini');
            }
        }
        if (!aiResponse) {
            throw new Error('No AI response from any provider');
        }
        // Parse JSON from response
        let jsonStr = aiResponse;
        const jsonMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1];
        }
        const result = JSON.parse(jsonStr.trim());
        // Ensure disclaimer exists
        if (!result.disclaimer) {
            result.disclaimer = 'This is an astrological hypothesis based on correlating life events with planetary transits. It should not be treated as factual or scientifically verified.';
        }
        res.json(result);
    }
    catch (error) {
        console.error('Rectification error:', error);
        res.status(500).json({ error: 'Failed to process rectification' });
    }
});
// GET /api/ai/Ori/status - Check if AI is configured
exports.OriRoutes.get('/Ori/status', (req, res) => {
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasGoogleAI = !!process.env.GOOGLE_AI_API_KEY;
    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
    const configured = hasOpenAI || hasGoogleAI || hasAnthropic;
    const provider = hasOpenAI ? 'openai' : hasGoogleAI ? 'gemini' : hasAnthropic ? 'anthropic' : 'fallback';
    res.json({
        configured,
        provider,
        message: configured
            ? `AI is configured and ready (${provider})`
            : 'Using fallback responses. Set OPENAI_API_KEY for best results, or GOOGLE_AI_API_KEY or ANTHROPIC_API_KEY.',
    });
});
/**
 * Fallback response generator
 * Demonstrates correct Ori behavior: Reflect → Validate → Ask ONE open-ended question
 */
function generateFallbackResponse(userMessage, history) {
    const text = userMessage.toLowerCase();
    const wordCount = userMessage.split(/\s+/).length;
    const messageCount = (history.match(/User:/g) || []).length;
    // Determine if this is a short/vague response
    const isShortResponse = wordCount < 15;
    // Detect emotional content
    const emotions = {
        sad: /\b(sad|cry|crying|tears|grief|loss|miss|missing|mourning)\b/i.test(text),
        angry: /\b(angry|mad|furious|rage|hate|resent|bitter)\b/i.test(text),
        scared: /\b(scared|afraid|fear|terrified|anxious|worried|panic)\b/i.test(text),
        lonely: /\b(alone|lonely|isolated|abandoned|left)\b/i.test(text),
        hurt: /\b(hurt|pain|broken|damaged|wounded)\b/i.test(text),
        shame: /\b(shame|ashamed|embarrassed|guilty|fault)\b/i.test(text),
    };
    // Detect people mentioned
    const people = {
        mother: /\b(mother|mom|mama|mommy)\b/i.test(text),
        father: /\b(father|dad|daddy|papa)\b/i.test(text),
        sibling: /\b(brother|sister|sibling)\b/i.test(text),
        partner: /\b(husband|wife|partner|spouse|boyfriend|girlfriend)\b/i.test(text),
        child: /\b(son|daughter|child|kid|baby)\b/i.test(text),
    };
    // Build reflection based on content
    let reflection = '';
    let validation = '';
    let question = '';
    // Opening exchange
    if (messageCount === 0) {
        reflection = "Thank you for trusting me with that.";
        validation = "I can sense there's a lot beneath what you just shared.";
        question = "What comes up for you when you sit with that memory?";
        return `${reflection} ${validation}\n\n${question}`;
    }
    // Short/vague response - use sensory grounding
    if (isShortResponse) {
        reflection = "I hear you.";
        validation = "Sometimes the hardest things are the hardest to put into words.";
        question = "Take me back to that moment. What do you remember seeing around you?";
        return `${reflection} ${validation}\n\n${question}`;
    }
    // Emotional responses
    if (emotions.sad) {
        reflection = "There's real grief in what you're describing.";
        validation = "That kind of sadness doesn't just go away—it stays with us.";
        question = "Where do you feel that sadness in your body when it comes up?";
        return `${reflection} ${validation}\n\n${question}`;
    }
    if (emotions.angry) {
        reflection = "I can feel the weight of that anger in your words.";
        validation = "Anger like that usually has a story behind it.";
        question = "What was the moment when that anger first took root?";
        return `${reflection} ${validation}\n\n${question}`;
    }
    if (emotions.scared) {
        reflection = "That sounds like it was genuinely frightening.";
        validation = "Fear like that leaves a mark.";
        question = "When you think about that fear now, what does it want you to know?";
        return `${reflection} ${validation}\n\n${question}`;
    }
    if (emotions.lonely) {
        reflection = "That kind of loneliness—it's one of the hardest things to carry.";
        validation = "Feeling alone, especially when you needed someone, stays with us.";
        question = "Who did you need in that moment? Where were they?";
        return `${reflection} ${validation}\n\n${question}`;
    }
    if (emotions.hurt) {
        reflection = "What you're describing sounds deeply painful.";
        validation = "Some wounds take a long time to heal, if they ever fully do.";
        question = "What did that experience teach you about yourself?";
        return `${reflection} ${validation}\n\n${question}`;
    }
    if (emotions.shame) {
        reflection = "I hear the weight of that shame in your words.";
        validation = "Shame is often something someone else put on us.";
        question = "Whose voice do you hear when that shame comes up?";
        return `${reflection} ${validation}\n\n${question}`;
    }
    // People-focused responses
    if (people.mother) {
        reflection = "Your mother clearly played a significant role in this.";
        validation = "The relationship with a mother shapes so much of who we become.";
        question = "What did you need from her that you didn't get?";
        return `${reflection} ${validation}\n\n${question}`;
    }
    if (people.father) {
        reflection = "I notice your father comes up in this.";
        validation = "Fathers leave their mark, whether they're present or absent.";
        question = "What did his presence—or absence—teach you about yourself?";
        return `${reflection} ${validation}\n\n${question}`;
    }
    if (people.partner) {
        reflection = "This relationship clearly mattered deeply to you.";
        validation = "The people we choose to love reveal a lot about what we're seeking.";
        question = "What were you looking for in that relationship that you hadn't found before?";
        return `${reflection} ${validation}\n\n${question}`;
    }
    if (people.child) {
        reflection = "I can hear how much this child means to you.";
        validation = "Being a parent changes everything about how we see ourselves.";
        question = "What do you want them to understand about you someday?";
        return `${reflection} ${validation}\n\n${question}`;
    }
    // Default deepening responses
    const deepeningResponses = [
        {
            reflection: "There's something important in what you just shared.",
            validation: "I can sense this memory still carries weight for you.",
            question: "What stayed with you after that experience?",
        },
        {
            reflection: "Thank you for going there with me.",
            validation: "It takes courage to look at these moments honestly.",
            question: "How did that shape who you became?",
        },
        {
            reflection: "I hear you.",
            validation: "These are the moments that define us, even when we don't realize it.",
            question: "What do you know now that you didn't know then?",
        },
        {
            reflection: "That's meaningful.",
            validation: "The details you're sharing paint a vivid picture.",
            question: "If you could go back to that moment, what would you tell yourself?",
        },
    ];
    const selected = deepeningResponses[messageCount % deepeningResponses.length];
    return `${selected.reflection} ${selected.validation}\n\n${selected.question}`;
}
//# sourceMappingURL=ori.js.map