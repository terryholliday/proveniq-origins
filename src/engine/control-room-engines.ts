/**
 * PRISM ORIGINS — Control Room Engines (v3.6)
 * Classification: DIAMOND-PLATINUM
 *
 * Contains the pure logic engines for signal detection and scoring.
 * Imported by src/control-room/control-room.ts (Option A).
 */

import { z } from "zod";
import {
    EpisodeState,
    PatternSignal,
    PatternKindSchema,
    EchoPhraseSchema,
    ReceiptCard,
    RevealPlan,
    SafetySignal,
    HostStrategy,
    RhetoricalDevice,
    TimelineEventSchema,
} from "./schemas";

/* =============================================================================
 * 1) PATTERN ENGINE (Signal Detection)
 * ============================================================================= */

interface PatternDetection {
    kind: z.infer<typeof PatternKindSchema>;
    confidence: number;
    evidence: string;
    note: string;
}

/**
 * IMPORTANT:
 * - Keys in this object can be arbitrary.
 * - `kind` MUST be a valid member of your PatternKindSchema union/enum.
 */
const PATTERN_DETECTORS: Record<string, (text: string) => PatternDetection | null> = {
    minimization_language: (text) => {
        const matches = text.match(/\b(just|only|not a big deal|no big deal|barely|merely|kind of|sort of)\b/gi);
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
                note: "Subject is using black-and-white framing to avoid nuance.",
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
                note: "Subject describes actions without naming actors.",
            }
            : null;
    },

    humor_deflection: (text) => {
        const matches = text.match(/\b(haha|lol|jk|anyway|but yeah|so yeah)\b/gi);
        return matches
            ? {
                kind: "humor_deflection",
                confidence: 0.6,
                evidence: matches.join(", "),
                note: "Subject is using humor to exit deep waters.",
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
                note: "Subject pivots to future promises to avoid past accountability.",
            }
            : null;
    },

    somatic_leakage: (text) => {
        const matches = text.match(/\b(shaking|crying|sweating|can't breathe|cannot breathe|chest hurts|numb|dizzy)\b/gi);
        return matches
            ? {
                kind: "somatic_leakage",
                confidence: 0.95,
                evidence: matches.join(", "),
                note: "Physiological distress detected in text.",
            }
            : null;
    },

    inevitability_language: (text) => {
        const matches = text.match(/\b(had no choice|forced to|trapped|impossible|backed into a corner)\b/gi);
        return matches
            ? {
                kind: "inevitability_language",
                confidence: 0.75,
                evidence: matches.join(", "),
                note: "Subject claims lack of agency/options.",
            }
            : null;
    },
};

export class PatternEngine {
    detectPatterns(text: string, turnIndex: number): PatternSignal[] {
        const signals: PatternSignal[] = [];

        for (const detector of Object.values(PATTERN_DETECTORS)) {
            const result = detector(text);
            if (!result) continue;

            signals.push({
                kind: result.kind,
                evidence_turn_indices: [turnIndex],
                confidence: result.confidence,
                interpretation_note: result.note,
                first_seen_turn: turnIndex,
                last_seen_turn: turnIndex,
                occurrence_count: 1,
            });
        }

        return signals;
    }
}

/* =============================================================================
 * 2) INEVITABILITY ENGINE (Truth Scoring)
 * ============================================================================= */

export interface InevitabilityScore {
    score: number;
    rationale: string;
    thresholdForReveal: number;
    thresholdForConfrontSoft: number;
    thresholdForConfrontFirm: number;
}

export class InevitabilityEngine {
    compute(state: EpisodeState): InevitabilityScore {
        let score = 0;
        const rationaleParts: string[] = [];

        // 1) Pattern density (recurrence)
        const recurring = state.pattern_ledger.filter((p) => p.occurrence_count >= 2);
        if (recurring.length > 0) {
            score += 0.2;
            rationaleParts.push(`${recurring.length} recurring patterns`);
        }

        // 2) Contradictions
        const unresolved = state.contradiction_ledger.filter((c) => c.resolution_status === "unaddressed");
        if (unresolved.length > 0) {
            score += 0.3;
            rationaleParts.push(`${unresolved.length} unresolved contradictions`);
        }

        // 3) Pressure environment
        if (state.metrics.average_pressure >= 7) {
            score += 0.1;
            rationaleParts.push("High pressure environment");
        }

        const clamped = Math.min(Math.max(score, 0), 1.0);

        return {
            score: clamped,
            rationale: rationaleParts.join(", ") || "Baseline",
            thresholdForReveal: 0.75,
            thresholdForConfrontSoft: 0.5,
            thresholdForConfrontFirm: 0.85,
        };
    }
}

/* =============================================================================
 * 3) ECHO PHRASE ENGINE (Callbacks)
 * ============================================================================= */

export class EchoPhraseEngine {
    private echoPatterns = [
        { regex: /not a big deal/gi, category: "minimizer" },
        { regex: /had no choice/gi, category: "inevitability" },
        { regex: /my fault/gi, category: "shame" },
        { regex: /i just.*let/gi, category: "agency" },
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
                    // If your schema is a strict enum, keep these categories aligned to it.
                    category: p.category as any,
                    eligible_after_act: currentAct + 1,
                    eligible_after_turn: turnIndex + 4,
                    used: false,
                });
            });
        }

        return echoes;
    }

    getEligible(echoes: z.infer<typeof EchoPhraseSchema>[], currentAct: number, currentTurn: number) {
        return echoes.filter((e) => !e.used && (e.eligible_after_act <= currentAct || e.eligible_after_turn <= currentTurn));
    }
}

/* =============================================================================
 * 4) MISSING TAPES ENGINE (Timeline gaps)
 * ============================================================================= */

interface TimelineGap {
    startDate: string;
    endDate: string;
    gapDays: number;
    description: string;
}

export class MissingTapesEngine {
    private gapThresholdDays = 180;

    findGaps(timeline: z.infer<typeof TimelineEventSchema>[]): TimelineGap[] {
        if (!timeline || timeline.length < 2) return [];

        const sorted = [...timeline].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const gaps: TimelineGap[] = [];

        for (let i = 0; i < sorted.length - 1; i++) {
            const cur = new Date(sorted[i].date);
            const nxt = new Date(sorted[i + 1].date);
            const diffDays = Math.ceil(Math.abs(nxt.getTime() - cur.getTime()) / (1000 * 60 * 60 * 24));

            if (diffDays >= this.gapThresholdDays) {
                gaps.push({
                    startDate: sorted[i].date,
                    endDate: sorted[i + 1].date,
                    gapDays: diffDays,
                    description: `${Math.round(diffDays / 30)} months between events.`,
                });
            }
        }

        return gaps.sort((a, b) => b.gapDays - a.gapDays);
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
 * 5) S&P GOVERNOR (Veto logic)
 * ============================================================================= */

interface SPVeto {
    vetoed: boolean;
    reason?: string;
    alternativeStrategy?: HostStrategy;
    alternativeDevice?: RhetoricalDevice;
}

export class SPGovernor {
    private bannedPhrases = [/polygraph/i, /lie detector/i, /narcissist/i, /toxic person/i];

    reviewProposal(
        strategy: HostStrategy,
        device: RhetoricalDevice | undefined,
        instruction: string,
        context: { pressure: number; risk: string }
    ): SPVeto {
        if (context.risk === "critical" && strategy !== "SAFETY_GROUND") {
            return { vetoed: true, reason: "Critical risk. Safety override.", alternativeStrategy: "SAFETY_GROUND" };
        }
        if (this.bannedPhrases.some((p) => p.test(instruction))) {
            return { vetoed: true, reason: "Banned terminology.", alternativeStrategy: "HOLD", alternativeDevice: "SILENCE_GAP" };
        }
        if (context.pressure >= 9 && strategy === "PRESS") {
            return { vetoed: true, reason: "Max pressure exceeded.", alternativeStrategy: "YIELD", alternativeDevice: "OFFER_FORK" };
        }
        return { vetoed: false };
    }

    reviewReveal(reveal: RevealPlan, _inevitabilityScore: number): { vetoed: boolean; reason?: string } {
        // If your policy says certain payload types always require permission, enforce it here.
        // Example: quotes require explicit permission.
        if (!reveal.permission_gate.required && reveal.payload.type === "quote") {
            return { vetoed: true, reason: "Quotes require permission." };
        }
        return { vetoed: false };
    }
}

/* =============================================================================
 * 6) SAFETY ENGINE (Crisis detection)
 * ============================================================================= */

export class SafetyEngine {
    private patterns = [
        { regex: /\b(kill myself|suicide)\b/i, type: "imminent_self_harm" },
        { regex: /\b(hurt them|kill him|kill her|kill them)\b/i, type: "imminent_harm_to_others" },
        { regex: /\b(minor|child).*(abuse|assault|exploitation)\b/i, type: "child_exploitation_disclosure" },
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

    getResponse(_type: string): string {
        // Keep this short; your higher-level app can provide localized/helpful resources.
        return "I need to pause for safety. If anyone is in immediate danger, call emergency services now.";
    }
}
