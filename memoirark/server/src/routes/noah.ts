import { Router, Request, Response } from 'express';

export const noahRoutes = Router();

/**
 * Noah AI Endpoint
 * 
 * This endpoint handles the AI conversation for Noah, the digital biographer.
 * It expects a system prompt, conversation history, and user message,
 * and returns Noah's response.
 * 
 * In production, this would connect to an LLM API (OpenAI, Anthropic, etc.)
 * For now, it provides a fallback response that demonstrates correct Noah behavior.
 */

interface NoahRequest {
  systemPrompt: string;
  conversationHistory: string;
  userMessage: string;
}

// POST /api/ai/noah - Generate Noah's response
noahRoutes.post('/noah', async (req: Request, res: Response) => {
  try {
    const { systemPrompt, conversationHistory, userMessage } = req.body as NoahRequest;

    if (!userMessage) {
      return res.status(400).json({ error: 'User message is required' });
    }

    // Check for OpenAI API key
    const openaiKey = process.env.OPENAI_API_KEY;
    
    if (openaiKey) {
      // Use OpenAI API
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4-turbo-preview',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Previous conversation:\n${conversationHistory}\n\nUser's latest message:\n${userMessage}` },
            ],
            max_tokens: 500,
            temperature: 0.8,
          }),
        });

        if (response.ok) {
          const data = await response.json() as { choices: Array<{ message: { content: string } }> };
          const noahResponse = data.choices[0]?.message?.content;
          
          if (noahResponse) {
            return res.json({ response: noahResponse });
          }
        }
      } catch (error) {
        console.error('OpenAI API error:', error);
        // Fall through to fallback
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
          const data = await response.json() as { content: Array<{ text: string }> };
          const noahResponse = data.content[0]?.text;
          
          if (noahResponse) {
            return res.json({ response: noahResponse });
          }
        }
      } catch (error) {
        console.error('Anthropic API error:', error);
        // Fall through to fallback
      }
    }

    // Fallback: Generate response using pattern-based logic
    // This demonstrates correct Noah behavior without an LLM
    const fallbackResponse = generateFallbackResponse(userMessage, conversationHistory);
    res.json({ response: fallbackResponse });

  } catch (error) {
    console.error('Error in Noah endpoint:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

// GET /api/ai/noah/status - Check if AI is configured
noahRoutes.get('/noah/status', (req: Request, res: Response) => {
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  
  res.json({
    configured: hasOpenAI || hasAnthropic,
    provider: hasOpenAI ? 'openai' : hasAnthropic ? 'anthropic' : 'fallback',
    message: hasOpenAI || hasAnthropic 
      ? 'AI is configured and ready' 
      : 'Using fallback responses. Set OPENAI_API_KEY or ANTHROPIC_API_KEY for full AI capability.',
  });
});

/**
 * Fallback response generator
 * Demonstrates correct Noah behavior: Reflect → Validate → Ask ONE open-ended question
 */
function generateFallbackResponse(userMessage: string, history: string): string {
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
