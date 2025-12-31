/**
 * PROVENIQ ORIGINS — Season 20 OMG Interview Routes
 * 
 * New dual-loop architecture:
 * - Fast Loop: /api/ai/interview (Ori host response)
 * - Slow Loop: Control Room runs internally
 * 
 * Integration with existing /api/ai/Ori endpoint preserved for backwards compatibility.
 */

import { Router, Response } from 'express';
import { requireAiConsent, AuthenticatedRequest } from './auth';
import { ControlRoom } from '../engine/control-room';
import { AuditLogger } from '../engine/audit-logger';
import { EpisodeState, EarpieceFeed, HostStrategy } from '../engine/schemas';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

export const InterviewRoutes = Router();

// In-memory session store (would be Redis/DB in production)
const sessionStore: Map<string, {
    episodeState: EpisodeState;
    controlRoom: ControlRoom;
    auditLogger: AuditLogger;
}> = new Map();

// Load system prompt
const systemPromptPath = path.join(__dirname, '../ai_profiles/system_prompt.md');
let SYSTEM_PROMPT = '';
try {
    SYSTEM_PROMPT = fs.readFileSync(systemPromptPath, 'utf-8');
} catch (e) {
    console.error('Failed to load system prompt:', e);
    SYSTEM_PROMPT = 'You are Ori, a documentary-grade interviewer. One question per turn. Mirror exact words. No therapy filler.';
}

/**
 * POST /api/ai/interview/start
 * Start a new interview session
 */
InterviewRoutes.post('/start', requireAiConsent, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.authUser?.uid || 'anonymous';
        const sessionId = uuidv4();

        // Initialize episode state
        const episodeState: EpisodeState = {
            session_id: sessionId,
            user_id: userId,
            story_map: {
                characters: [],
                places: [],
                moments: [],
            },
            timeline: [],
            open_loops: [],
            echo_phrases: [],
            claims_ledger: [],
            contradiction_index: [],
            metrics: {
                question_density: 0,
                silence_utilization: 0,
                callback_rate: 0,
                earned_reveal_rate: 0,
                pressure_violations: 0,
                current_act: 1,
                current_turn: 0,
            },
            pattern_signals: [],
            reveal_plans: [],
            safety_incidents: [],
        };

        // Initialize Control Room and Audit Logger
        const controlRoom = new ControlRoom();
        const auditLogger = new AuditLogger(sessionId);
        auditLogger.sessionStart(userId);

        // Store session
        sessionStore.set(sessionId, { episodeState, controlRoom, auditLogger });

        res.json({
            session_id: sessionId,
            status: 'ready',
            message: 'Interview session started. Ori is listening.',
        });

    } catch (error) {
        console.error('Error starting interview:', error);
        res.status(500).json({ error: 'Failed to start interview session' });
    }
});

/**
 * POST /api/ai/interview/turn
 * Process a user turn and get Ori's response
 */
InterviewRoutes.post('/turn', requireAiConsent, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { session_id, message } = req.body;

        if (!session_id || !message) {
            return res.status(400).json({ error: 'session_id and message are required' });
        }

        const session = sessionStore.get(session_id);
        if (!session) {
            return res.status(404).json({ error: 'Session not found. Please start a new interview.' });
        }

        const { episodeState, controlRoom, auditLogger } = session;
        const turnId = uuidv4();
        const turnNumber = episodeState.metrics.current_turn + 1;

        // Log turn received
        auditLogger.turnReceived(turnNumber, episodeState.metrics.current_act, message.length);

        // Process turn through Control Room (Slow Loop)
        const { feed, updatedState } = await controlRoom.processTurn(message, turnId, episodeState);

        // Log move selected
        auditLogger.moveSelected(
            turnNumber,
            updatedState.metrics.current_act,
            feed.required_strategy,
            feed.suggested_device,
            feed.instruction
        );

        // Generate Ori's response (Fast Loop)
        const oriResponse = await generateOriResponse(feed, message, updatedState);

        // Log move executed
        auditLogger.moveExecuted(
            turnNumber,
            updatedState.metrics.current_act,
            feed.required_strategy,
            oriResponse.length
        );

        // Update session state
        session.episodeState = updatedState;
        sessionStore.set(session_id, session);

        // Build response (NO internal state exposed to user)
        const response: {
            response: string;
            jumbotron?: { type: string; content: unknown } | null;
            trigger_commercial_break?: boolean;
            status: string;
            debug_earpiece_feed?: EarpieceFeed;
        } = {
            response: oriResponse,
            status: feed.status,
        };

        // Expose internal state for verification in dev
        if (process.env.NODE_ENV !== 'production') {
            response.debug_earpiece_feed = feed;
        }

        // Add jumbotron cue if present
        if (feed.jumbotron_cue) {
            response.jumbotron = {
                type: feed.jumbotron_cue.payload.type,
                content: feed.jumbotron_cue.payload,
            };
        }

        // Trigger commercial break if needed
        if (feed.status === 'commercial_break') {
            response.trigger_commercial_break = true;
        }

        res.json(response);

    } catch (error: any) {
        console.error('Error processing turn: ' + (error?.message || String(error)));
        if (error?.stack) console.error(error.stack);
        res.status(500).json({ error: 'Failed to process turn', details: error?.message });
    }
});

/**
 * POST /api/ai/interview/commercial-break
 * Get commercial break summary
 */
InterviewRoutes.post('/commercial-break', requireAiConsent, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { session_id } = req.body;

        if (!session_id) {
            return res.status(400).json({ error: 'session_id is required' });
        }

        const session = sessionStore.get(session_id);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const { episodeState, auditLogger } = session;

        // Build story so far
        const storySoFar = episodeState.story_map.moments
            .slice(-3)
            .map(m => m.description);

        // Get open loops
        const openLoops = episodeState.open_loops
            .filter(l => l.status === 'open')
            .slice(0, 2)
            .map(l => l.topic);

        // Coming up hint
        const comingUp = episodeState.open_loops.find(l => l.priority >= 8)?.topic || null;

        // Log commercial break
        auditLogger.commercialBreak(
            episodeState.metrics.current_turn,
            episodeState.metrics.current_act,
            openLoops,
            storySoFar
        );

        res.json({
            story_so_far: storySoFar,
            open_loops: openLoops,
            coming_up: comingUp,
            options: {
                ready: true,
                need_moment: true,
                pivot: true,
            },
        });

    } catch (error) {
        console.error('Error generating commercial break:', error);
        res.status(500).json({ error: 'Failed to generate commercial break' });
    }
});

/**
 * POST /api/ai/interview/resume
 * Resume from commercial break
 */
InterviewRoutes.post('/resume', requireAiConsent, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { session_id, choice } = req.body;

        if (!session_id) {
            return res.status(400).json({ error: 'session_id is required' });
        }

        const session = sessionStore.get(session_id);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const { episodeState, auditLogger } = session;

        // Log act transition
        auditLogger.actTransition(
            episodeState.metrics.current_turn,
            episodeState.metrics.current_act,
            episodeState.metrics.current_act + 1
        );

        // Update act
        session.episodeState = {
            ...episodeState,
            metrics: {
                ...episodeState.metrics,
                current_act: episodeState.metrics.current_act + 1,
            },
        };
        sessionStore.set(session_id, session);

        let resumeMessage = "Whenever you're ready to continue.";

        if (choice === 'pivot') {
            resumeMessage = "Let's explore something different. What's been on your mind that we haven't touched yet?";
        }

        res.json({
            status: 'live',
            message: resumeMessage,
        });

    } catch (error) {
        console.error('Error resuming interview:', error);
        res.status(500).json({ error: 'Failed to resume interview' });
    }
});

/**
 * POST /api/ai/interview/end
 * End the interview session
 */
InterviewRoutes.post('/end', requireAiConsent, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { session_id } = req.body;

        if (!session_id) {
            return res.status(400).json({ error: 'session_id is required' });
        }

        const session = sessionStore.get(session_id);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const { episodeState, auditLogger } = session;

        // Log session end
        auditLogger.sessionEnd(
            episodeState.metrics.current_turn,
            episodeState.metrics.current_act,
            {
                total_turns: episodeState.metrics.current_turn,
                total_acts: episodeState.metrics.current_act,
                patterns_detected: episodeState.pattern_signals.length,
                echo_phrases_captured: episodeState.echo_phrases.length,
                safety_incidents: episodeState.safety_incidents.length,
            }
        );

        // Clean up session
        sessionStore.delete(session_id);

        res.json({
            status: 'complete',
            message: 'Interview session ended. Thank you for sharing your story.',
            summary: {
                turns: episodeState.metrics.current_turn,
                acts: episodeState.metrics.current_act,
                moments_captured: episodeState.story_map.moments.length,
            },
        });

    } catch (error) {
        console.error('Error ending interview:', error);
        res.status(500).json({ error: 'Failed to end interview' });
    }
});

/**
 * GET /api/ai/interview/preferences
 * Get user preference options
 */
InterviewRoutes.get('/preferences', (req, res) => {
    res.json({
        options: [
            { id: 'directness', label: 'Directness', values: ['gentle', 'balanced', 'direct'] },
            { id: 'pace', label: 'Pace', values: ['slow', 'natural', 'focused'] },
            { id: 'surprises', label: 'Surprises', values: ['none', 'with_permission', 'open'] },
        ],
    });
});

/**
 * Generate Ori's response based on EarpieceFeed
 */
async function generateOriResponse(
    feed: EarpieceFeed,
    userMessage: string,
    state: EpisodeState
): Promise<string> {
    // Safety override
    if (feed.guardrails.safety_mode === 'stop_and_ground') {
        return feed.instruction;
    }

    // Check for LLM
    const openaiKey = process.env.OPENAI_API_KEY;

    if (openaiKey) {
        try {
            // Build move-specific instruction for the LLM
            const moveInstruction = buildMoveInstruction(feed);

            // Determine temperature based on move
            const temperature = getTemperatureForMove(feed.move);

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${openaiKey}`,
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'system', content: `EARPIECE DIRECTION:\nMove: ${feed.move}\nPosture: ${feed.posture}\nTone: ${feed.tone}\nInstruction: ${feed.instruction}` },
                        { role: 'user', content: userMessage },
                    ],
                    max_tokens: 200,  // Keep responses concise
                    temperature,
                }),
            });

            if (response.ok) {
                const data = await response.json() as { choices: Array<{ message: { content: string } }> };
                const oriResponse = data.choices[0]?.message?.content;

                if (oriResponse) {
                    console.log(`✅ Ori response generated (${feed.move})`);
                    return oriResponse;
                }
            }
        } catch (error) {
            console.error('OpenAI API error:', error);
        }
    }

    // Fallback: Pattern-based response
    return generateFallbackResponse(feed, userMessage);
}

/**
 * Build move-specific instruction
 */
function buildMoveInstruction(feed: EarpieceFeed): string {
    const base = feed.instruction;

    switch (feed.move) {
        case 'SILENCE':
            return `${base} Output only: "...take your time." or similar minimal continuer.`;
        case 'MIRROR_LANGUAGE':
            return `${base} Repeat their exact words. Do not paraphrase.`;
        case 'PIN_TO_SPECIFICS':
            return `${base} Ask for ONE specific detail, image, or moment.`;
        case 'STATE_AND_STOP':
            return `${base} Make a single observation. Then stop. Do not ask a question.`;
        case 'OFFER_FORK':
            return `${base} Give them two clear options: stay here or go somewhere else.`;
        default:
            return base;
    }
}

/**
 * Get temperature for move
 */
function getTemperatureForMove(move: HostMove): number {
    // Lower temperature for precision moves
    const precisionMoves: HostMove[] = ['PIN_TO_SPECIFICS', 'UTILITARIAN_CHECK', 'PATTERN_PAUSE'];
    if (precisionMoves.includes(move)) return 0.3;

    // Higher temperature for emotional moves
    const emotionalMoves: HostMove[] = ['MIRROR_LANGUAGE', 'SILENCE'];
    if (emotionalMoves.includes(move)) return 0.6;

    // Default
    return 0.5;
}

/**
 * Fallback response generator (no LLM)
 */
function generateFallbackResponse(feed: EarpieceFeed, userMessage: string): string {
    if (feed.act === 'Kernel Activation') {
        return feed.instruction;
    }

    switch (feed.move) {
        case 'SILENCE':
            return '...take your time.';

        case 'MIRROR_LANGUAGE':
            // Extract key phrase and mirror
            const words = userMessage.split(' ').slice(0, 5).join(' ');
            return `"${words}..."`;

        case 'PIN_TO_SPECIFICS':
            return 'What did that look like? Give me the specific moment.';

        case 'STATE_AND_STOP':
            return 'I hear you.';

        case 'OFFER_FORK':
            return 'We can stay here, or step sideways. What do you need?';

        case 'RETURN_TO_OPEN_LOOP':
            return 'Earlier you mentioned something I want to come back to.';

        case 'UTILITARIAN_CHECK':
            return "How's that working for you?";

        case 'SAFETY_GROUND':
            return feed.instruction;

        default:
            return 'Tell me more.';
    }
}
