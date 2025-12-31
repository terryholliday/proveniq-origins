/**
 * PRISM ORIGINS — Control Room Engines (v3.6)
 * Classification: DIAMOND-PLATINUM
 * Contains pure logic engines: pattern detection, echo capture, scoring, gaps, reveals, S&P, safety.
 */

import { z } from "zod";
import {
    EpisodeState,
    PatternSignal,
    ReceiptCard,
    RevealPlan,
    SafetySignal,
    HostStrategy,
    RhetoricalDevice,
    PatternKindSchema,
    EchoPhraseSchema,
    TimelineEventSchema,
    RevealPlanSchema,
} from "./schemas";

/* =============================================================================
 * 1) PATTERN ENGINE
 * ========================================================================== */

interface PatternDetection {
    kind: z.infer<typeof PatternKindSchema>;
    confidence: number; // 0..1
    evidence: string;
    note: string;
}

const PATTERN_DETECTORS: Record<string, (text: string) => PatternDetection | null> = {
    minimization_language: (text) => {
        const matches = text.match(/\b(just|only|not a big deal|no big deal|barely|merely|kind of|sort of|it's fine|it was nothing)\b/gi);
        return matches
            ? {
                kind: "minimization_language",
                confidence: Math.min(0.5 + matches.length * 0.1, 0.95),
                evidence: matches.join(", "),
                note: "Subject is actively reducing the weight of the event.",
            }
            : null;
    },

    absolutist_language: (text) => {
        const matches = text.match(/\b(always|never|everyone|no one|everything|nothing|totally|completely)\b/gi);
        return matches
            ? {
                kind: "absolutist_language",
                confidence: 0.85,
                evidence: matches.join(", "),
                note: "Black-and-white framing to avoid nuance.",
            }
            : null;
    },

    passive_voice_shift: (text) => {
        const matches = text.match(/\b(it happened|was done|got done|ended up|mistakes were made|things occurred|things occured)\b/gi);
        return matches
            ? {
                kind: "passive_voice_shift",
                confidence: 0.75,
                evidence: matches.join(", "),
                note: "Subject removed themselves as the active agent.",
            }
            : null;
    },

    actor_omission: (text) => {
        const matches = text.match(/\b(was hit|got hurt|was said|it was decided)\b/gi);
        return matches
            ? {
                kind: "actor_omission",
                confidence: 0.65,
                evidence: matches.join(", "),
                note: "Actions described without actors.",
            }
            : null;
    },

    humor_deflection: (text) => {
        const matches = text.match(/\b(haha|lol|jk|just kidding|anyway|but yeah|so yeah|so anyway)\b/gi);
        return matches
            ? {
                kind: "humor_deflection",
                confidence: 0.6,
                evidence: matches.join(", "),
                note: "Humor used to exit deep waters.",
            }
            : null;
    },

    future_tense_evasion: (text) => {
        const matches = text.match(/\b(i will|i promise|going to|someday|next time|starting tomorrow)\b/gi);
        return matches
            ? {
                kind: "future_tense_evasion",
                confidence: 0.8,
                evidence: matches.join(", "),
                note: "Future promises used to avoid present accountability.",
            }
            : null;
    },

    somatic_leakage: (text) => {
        const matches = text.match(/\b(shaking|crying|sweating|can't breathe|cannot breathe|chest hurts|numb|dizzy|panic)\b/gi);
        return matches
            ? {
                kind: "somatic_leakage",
                confidence: 0.95,
                evidence: matches.join(", "),
                note: "Physiological distress signaled in text.",
            }
            : null;
    },

    inevitability_language: (text) => {
        const matches = text.match(/\b(had no choice|forced to|trapped|impossible|backed into a corner|no way out|had to)\b/gi);
        return matches
            ? {
                kind: "inevitability_language",
                confidence: 0.75,
                evidence: matches.join(", "),
                note: "Agency removed; options framed as nonexistent.",
            }
            : null;
    },

    shame_cue: (text) => {
        const matches = text.match(/\b(my fault|i deserved|should have known|stupid of me|ashamed|embarrassed)\b/gi);
        return matches
            ? {
                kind: "shame_cue",
                confidence: 0.85,
                evidence: matches.join(", "),
                note: "Internalized blame / shame language.",
            }
            : null;
    },

    freeze_cue: (text) => {
        const matches = text.match(/\b(i froze|couldn't move|couldn't speak|went blank|shut down|paralyzed|paralysed)\b/gi);
        return matches
            ? {
                kind: "freeze_cue",
                confidence: 0.9,
                evidence: matches.join(", "),
                note: "Freeze response indicated.",
            }
            : null;
    },

    brevity_spike: (text) => {
        const wc = text.trim().split(/\s+/).filter(Boolean).length;
        if (wc > 0 && wc < 4) {
            return {
                kind: "brevity_spike",
                confidence: 0.5,
                evidence: `Word count: ${wc}`,
                note: "Sudden reduction in verbal output.",
            };
        }
        return null;
    },
};

export class PatternEngine {
    detectPatterns(text: string, turnIndex: number): PatternSignal[] {
        const out: PatternSignal[] = [];

        for (const detector of Object.values(PATTERN_DETECTORS)) {
            const r = detector(text);
            if (!r) continue;

            out.push({
                kind: r.kind,
                evidence_turn_indices: [turnIndex],
                confidence: r.confidence,
                interpretation_note: r.note,
                first_seen_turn: turnIndex,
                last_seen_turn: turnIndex,
                occurrence_count: 1,
            });
        }

        return out;
    }
}

/* =============================================================================
 * 2) ECHO PHRASE ENGINE
 * ========================================================================== */

export class EchoPhraseEngine {
    private echoPatterns = [
        { regex: /not a big deal/gi, category: "minimizer" },
        { regex: /had no choice/gi, category: "inevitability" },
        { regex: /my fault/gi, category: "shame" },
        { regex: /i (just )?.*let/gi, category: "agency" },
        { regex: /it is what it is/gi, category: "minimizer" },
    ] as const;

    capture(text: string, turnIndex: number, currentAct: number): z.infer<typeof EchoPhraseSchema>[] {
        const echoes: z.infer<typeof EchoPhraseSchema>[] = [];

        for (const p of this.echoPatterns) {
            const matches = text.match(p.regex);
            if (!matches) continue;

            matches.forEach((m, i) => {
                echoes.push({
                    id: `echo-${turnIndex}-${i}`,
                    phrase: m,
                    turn_id: `turn-${turnIndex}`,
                    turn_index: turnIndex,
                    category: p.category,
                    eligible_after_act: currentAct + 1,
                    eligible_after_turn: turnIndex + 4,
                    used: false,
                });
            });
        }

        return echoes;
    }

    getEligible(
        echoes: z.infer<typeof EchoPhraseSchema>[],
        currentAct: number,
        currentTurn: number
    ): z.infer<typeof EchoPhraseSchema>[] {
        return echoes.filter(
            (e) => !e.used && (e.eligible_after_act <= currentAct || e.eligible_after_turn <= currentTurn)
        );
    }
}

/* =============================================================================
 * 3) INEVITABILITY ENGINE
 * ========================================================================== */

export interface InevitabilityScore {
    score: number; // 0..1
    rationale: string;
    thresholdForReveal: number;
    thresholdForConfrontSoft: number;
    thresholdForConfrontFirm: number;
}

export class InevitabilityEngine {
    compute(state: EpisodeState): InevitabilityScore {
        let score = 0;
        const factors: string[] = [];

        // Factor 1: recurring patterns
        const recurring = state.pattern_ledger.filter((p) => p.occurrence_count >= 2);
        if (recurring.length > 0) {
            score += Math.min(0.3, recurring.length * 0.1);
            factors.push(`${recurring.length} recurring patterns`);
        }

        // Factor 2: unresolved contradictions
        const unresolved = state.contradiction_ledger.filter((c) => c.resolution_status === "unaddressed");
        if (unresolved.length > 0) {
            score += Math.min(0.4, unresolved.length * 0.15);
            factors.push(`${unresolved.length} contradictions`);
        }

        // Factor 3: critical open loops
        const criticalLoops = state.open_loops.filter((l) => l.priority >= 8 && l.status === "open");
        if (criticalLoops.length > 0) {
            score += 0.2;
            factors.push("critical open loop active");
        }

        // Factor 4: contradicted claims
        const contradictedClaims = state.claims_ledger.filter((c) => c.support_level === "contradicted");
        if (contradictedClaims.length > 0) {
            score += 0.25;
            factors.push("direct evidence contradiction");
        }

        score = Math.min(score, 1.0);

        return {
            score,
            rationale: factors.join(" + ") || "baseline gathering",
            thresholdForReveal: 0.75,
            thresholdForConfrontSoft: 0.5,
            thresholdForConfrontFirm: 0.85,
        };
    }
}

/* =============================================================================
 * 4) MISSING TAPES ENGINE
 * ========================================================================== */

export interface TimelineGap {
    startDate: string;
    endDate: string;
    gapDays: number;
    description: string;
}

export class MissingTapesEngine {
    private gapThresholdDays = 180;

    findGaps(timeline: z.infer<typeof TimelineEventSchema>[]): TimelineGap[] {
        if (timeline.length < 2) return [];

        const sorted = [...timeline].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const gaps: TimelineGap[] = [];

        for (let i = 0; i < sorted.length - 1; i++) {
            const a = new Date(sorted[i].date);
            const b = new Date(sorted[i + 1].date);
            const diffDays = Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));

            if (diffDays >= this.gapThresholdDays) {
                gaps.push({
                    startDate: sorted[i].date,
                    endDate: sorted[i + 1].date,
                    gapDays: diffDays,
                    description: `${Math.round(diffDays / 30)} months between "${sorted[i].description}" and "${sorted[i + 1].description}"`,
                });
            }
        }

        return gaps.sort((x, y) => y.gapDays - x.gapDays);
    }

    createReceiptCard(gap: TimelineGap): ReceiptCard {
        return {
            type: "missing_tape",
            date_start: gap.startDate,
            date_end: gap.endDate,
            gap_description: gap.description,
        };
    }
}

/* =============================================================================
 * 5) REVEAL ENGINE
 * ========================================================================== */

export class RevealEngine {
    createRevealPlan(
        id: string,
        receipt: ReceiptCard,
        trigger: z.infer<typeof RevealPlanSchema>["trigger"],
        requirePermission: boolean
    ): RevealPlan {
        return {
            id,
            tease_line: this.generateTease(receipt),
            permission_gate: {
                required: requirePermission,
                ask_copy: requirePermission ? "I have something that might clarify this. May I show you?" : null,
            },
            trigger,
            payload: receipt,
            integration_prompt: this.generateIntegrationPrompt(receipt),
            veto_policy: requirePermission ? "always_vetoable" : "never_vetoable",
            status: "pending",
        };
    }

    private generateTease(receipt: ReceiptCard): string {
        switch (receipt.type) {
            case "quote":
                return "I have the transcript of what you said that day.";
            case "photo":
                return "There is an image from that night that tells a story.";
            case "timeline_snap":
                return "The timeline shows a sequence we haven't discussed.";
            case "missing_tape":
                return "There is a significant gap in the record.";
            default:
                return "I have something from the record that may matter here.";
        }
    }

    private generateIntegrationPrompt(receipt: ReceiptCard): string {
        switch (receipt.type) {
            case "quote":
                return "How does hearing those words again land with you now?";
            case "missing_tape":
                return "What was happening during that silence?";
            default:
                return "How does this fit into the story you're telling me?";
        }
    }
}

/* =============================================================================
 * 6) S&P GOVERNOR
 * ========================================================================== */

export interface SPVeto {
    vetoed: boolean;
    reason?: string;
    alternativeStrategy?: HostStrategy;
    alternativeDevice?: RhetoricalDevice;
}

export class SPGovernor {
    private bannedPhrases = [
        /polygraph/i,
        /lie detector/i,
        /narcissist/i,
        /toxic person/i,
        /as an ai/i,
        /i am a language model/i,
        /delusional/i,
    ];

    reviewProposal(
        strategy: HostStrategy,
        device: RhetoricalDevice | undefined,
        instruction: string,
        context: { pressure: number; risk: "low" | "elevated" | "critical" }
    ): SPVeto {
        if (context.risk === "critical" && strategy !== "SAFETY_GROUND") {
            return {
                vetoed: true,
                reason: "Critical risk detected. Safety override required.",
                alternativeStrategy: "SAFETY_GROUND",
            };
        }

        if (this.bannedPhrases.some((p) => p.test(instruction))) {
            return {
                vetoed: true,
                reason: "Instruction contains banned terminology.",
                alternativeStrategy: "HOLD",
                alternativeDevice: "SILENCE_GAP",
            };
        }

        if (context.pressure >= 9 && strategy === "PRESS") {
            return {
                vetoed: true,
                reason: "Max pressure exceeded. Must de-escalate.",
                alternativeStrategy: "YIELD",
                alternativeDevice: "OFFER_FORK",
            };
        }

        return { vetoed: false };
    }

    reviewReveal(reveal: RevealPlan, inevitabilityScore: number): { vetoed: boolean; reason?: string } {
        if (!reveal.permission_gate.required && reveal.payload.type === "quote") {
            return { vetoed: true, reason: "Quote reveals require permission gate." };
        }

        if (inevitabilityScore < 0.5) {
            return { vetoed: true, reason: "Truth not yet inevitable. More groundwork needed." };
        }

        return { vetoed: false };
    }
}

/* =============================================================================
 * 7) SAFETY ENGINE
 * ========================================================================== */

export class SafetyEngine {
    private patterns = [
        { regex: /\b(kill myself|suicide|end it all|want to die)\b/i, type: "imminent_self_harm" },
        { regex: /\b(hurt them|kill him|kill her|shoot)\b/i, type: "imminent_harm_to_others" },
        { regex: /\b(minor|child|kid).*(abuse|touch|molest)\b/i, type: "child_exploitation_disclosure" },
        { regex: /\b(can't go on|no point|give up)\b/i, type: "acute_crisis" },
    ] as const;

    detect(text: string, turnIndex: number): SafetySignal | null {
        for (const p of this.patterns) {
            if (p.regex.test(text)) {
                return {
                    type: p.type,
                    confidence: 0.95,
                    evidence_turn_id: `turn-${turnIndex}`,
                    triggered_at: new Date().toISOString(),
                };
            }
        }
        return null;
    }

    getResponse(type: SafetySignal["type"]): string {
        switch (type) {
            case "imminent_self_harm":
                return "I need to pause. If you're in immediate danger or thinking about harming yourself, call 988 (US) now, or your local emergency number.";
            case "imminent_harm_to_others":
                return "I need to pause. If anyone is in immediate danger, contact emergency services now.";
            case "child_exploitation_disclosure":
                return "I must stop here. If a child is in danger, contact local authorities immediately.";
            case "acute_crisis":
                return "I’m going to pause and focus on safety. If you’re in crisis, call 988 (US) or your local emergency number.";
            default:
                return "I need to pause for safety reasons.";
        }
    }
}
