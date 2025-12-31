/**
 * PRISM ORIGINS — Control Room (v3.6)
 * Classification: DIAMOND-PLATINUM / MODULAR
 *
 * HARD GUARANTEE:
 * - processTurn() returns the exact contract:
 *   { earpiece_feed: EarpieceFeed, episode_context: EpisodeState }
 *   validated by ControlRoomOutputSchema (fail-loud boundary)
 *
 * NOTES:
 * - Assumes your schemas.ts exports:
 *   EpisodeStateSchema, EpisodeState
 *   EarpieceFeedSchema, EarpieceFeed
 *   PatternSignal, RevealPlan, ReceiptCard, HostStrategy, RhetoricalDevice, SafetySignal
 *   (and any Zod schemas referenced below if you choose to tighten AuditEvent typing later)
 */

import { z } from "zod";

import {
    EpisodeStateSchema,
    EpisodeState,
    EarpieceFeedSchema,
    EarpieceFeed,
    PatternSignal,
    RevealPlan,
    ReceiptCard,
    HostStrategy,
    RhetoricalDevice,
    SafetySignal,
} from "./schemas";

// Engines live in their own file (Option A)
import {
    PatternEngine,
    InevitabilityEngine,
    EchoPhraseEngine,
    MissingTapesEngine,
    SPGovernor,
    SafetyEngine,
    type InevitabilityScore,
} from "./control-room-engines";

// Optional PRISM kernel support (if you have it wired; safe no-op otherwise)
import { PRISMProcessor, parseActivationCommand, PRISMKernel } from "./prism-processor";

/* =============================================================================
 * 0) OUTPUT CONTRACT (THE THING YOU JUST POSTED)
 * ============================================================================= */

export const ControlRoomOutputSchema = z
    .object({
        earpiece_feed: EarpieceFeedSchema, // Guidance from Slow Loop
        episode_context: EpisodeStateSchema, // Memory
    })
    .strict();

export type ControlRoomOutput = z.infer<typeof ControlRoomOutputSchema>;

/* =============================================================================
 * 1) AUDIT LOGGER (minimal, strict boundary can be expanded later)
 * ============================================================================= */

type AuditEvent =
    | {
        type: "turn_received";
        session_id: string;
        turn_index: number;
        timestamp: string;
        payload: { input_length: number };
    }
    | {
        type: "activation_detected";
        session_id: string;
        turn_index: number;
        timestamp: string;
        payload: { kernel: string };
    }
    | {
        type: "safety_triggered";
        session_id: string;
        turn_index: number;
        timestamp: string;
        payload: { safety_type: string; confidence: number };
    }
    | {
        type: "patterns_detected";
        session_id: string;
        turn_index: number;
        timestamp: string;
        payload: { new_count: number; total_count: number };
    }
    | {
        type: "reveal_created";
        session_id: string;
        turn_index: number;
        timestamp: string;
        payload: { reveal_id: string; receipt_type: string };
    }
    | {
        type: "reveal_vetoed";
        session_id: string;
        turn_index: number;
        timestamp: string;
        payload: { reveal_id: string; reason: string };
    }
    | {
        type: "strategy_proposed";
        session_id: string;
        turn_index: number;
        timestamp: string;
        payload: {
            strategy: string;
            device?: string;
            pressure: number;
            instruction_len: number;
        };
    }
    | {
        type: "strategy_vetoed";
        session_id: string;
        turn_index: number;
        timestamp: string;
        payload: { reason: string; strategy: string; device?: string };
    }
    | {
        type: "feed_emitted";
        session_id: string;
        turn_index: number;
        timestamp: string;
        payload: { strategy: string; device?: string; risk_level: string };
    };

class AuditLogger {
    private events: AuditEvent[] = [];

    private now(): string {
        return new Date().toISOString();
    }

    getEvents(): AuditEvent[] {
        return this.events.slice();
    }

    turnReceived(session_id: string, turn_index: number, userMessage: string) {
        this.events.push({
            type: "turn_received",
            session_id,
            turn_index,
            timestamp: this.now(),
            payload: { input_length: userMessage.length },
        });
    }

    activationDetected(session_id: string, turn_index: number, kernel: PRISMKernel) {
        this.events.push({
            type: "activation_detected",
            session_id,
            turn_index,
            timestamp: this.now(),
            payload: { kernel: String(kernel) },
        });
    }

    safetyTriggered(session_id: string, turn_index: number, signal: SafetySignal) {
        this.events.push({
            type: "safety_triggered",
            session_id,
            turn_index,
            timestamp: this.now(),
            payload: { safety_type: String(signal.type), confidence: signal.confidence },
        });
    }

    patternsDetected(session_id: string, turn_index: number, newCount: number, totalCount: number) {
        this.events.push({
            type: "patterns_detected",
            session_id,
            turn_index,
            timestamp: this.now(),
            payload: { new_count: newCount, total_count: totalCount },
        });
    }

    revealCreated(session_id: string, turn_index: number, plan: RevealPlan) {
        this.events.push({
            type: "reveal_created",
            session_id,
            turn_index,
            timestamp: this.now(),
            payload: { reveal_id: plan.id, receipt_type: String(plan.payload.type) },
        });
    }

    revealVetoed(session_id: string, turn_index: number, revealId: string, reason: string) {
        this.events.push({
            type: "reveal_vetoed",
            session_id,
            turn_index,
            timestamp: this.now(),
            payload: { reveal_id: revealId, reason },
        });
    }

    strategyProposed(
        session_id: string,
        turn_index: number,
        strategy: HostStrategy,
        device: RhetoricalDevice | undefined,
        instruction: string,
        pressure: number
    ) {
        this.events.push({
            type: "strategy_proposed",
            session_id,
            turn_index,
            timestamp: this.now(),
            payload: {
                strategy: String(strategy),
                device: device ? String(device) : undefined,
                pressure,
                instruction_len: instruction.length,
            },
        });
    }

    strategyVetoed(
        session_id: string,
        turn_index: number,
        reason: string,
        strategy: HostStrategy,
        device: RhetoricalDevice | undefined
    ) {
        this.events.push({
            type: "strategy_vetoed",
            session_id,
            turn_index,
            timestamp: this.now(),
            payload: { reason, strategy: String(strategy), device: device ? String(device) : undefined },
        });
    }

    feedEmitted(
        session_id: string,
        turn_index: number,
        strategy: HostStrategy,
        device: RhetoricalDevice | undefined,
        risk_level: string
    ) {
        this.events.push({
            type: "feed_emitted",
            session_id,
            turn_index,
            timestamp: this.now(),
            payload: {
                strategy: String(strategy),
                device: device ? String(device) : undefined,
                risk_level,
            },
        });
    }
}

/* =============================================================================
 * 2) STATE REDUCER (pure-ish updates; no in-place mutation)
 * ============================================================================= */

class StateReducer {
    incrementTurn(state: EpisodeState, nextPressure: number): EpisodeState {
        return {
            ...state,
            metrics: {
                ...state.metrics,
                current_turn_index: state.metrics.current_turn_index + 1,
                average_pressure: nextPressure,
            },
        };
    }

    mergePatterns(state: EpisodeState, newSignals: PatternSignal[]): EpisodeState {
        const merged = [...state.pattern_ledger];

        for (const signal of newSignals) {
            const idx = merged.findIndex((p) => p.kind === signal.kind);
            if (idx >= 0) {
                const prev = merged[idx];
                merged[idx] = {
                    ...prev,
                    last_seen_turn: signal.last_seen_turn,
                    occurrence_count: prev.occurrence_count + 1,
                    confidence: Math.min((prev.confidence + signal.confidence) / 2 + 0.1, 1.0),
                    evidence_turn_indices: [...prev.evidence_turn_indices, ...signal.evidence_turn_indices],
                };
            } else {
                merged.push(signal);
            }
        }

        return { ...state, pattern_ledger: merged };
    }

    appendEchoes(state: EpisodeState, newEchoes: EpisodeState["echo_phrases"]): EpisodeState {
        return { ...state, echo_phrases: [...state.echo_phrases, ...newEchoes] };
    }

    upsertReveal(state: EpisodeState, reveal: RevealPlan): EpisodeState {
        const idx = state.reveal_ledger.findIndex((r) => r.id === reveal.id);
        const nextLedger =
            idx >= 0 ? state.reveal_ledger.map((r) => (r.id === reveal.id ? reveal : r)) : [...state.reveal_ledger, reveal];
        return { ...state, reveal_ledger: nextLedger };
    }

    addSafetyIncident(state: EpisodeState, incident: EpisodeState["safety_incidents"][number]): EpisodeState {
        return { ...state, safety_incidents: [...state.safety_incidents, incident] };
    }
}

/* =============================================================================
 * 3) REVEAL ORCHESTRATOR
 * ============================================================================= */

type RevealDecision =
    | { action: "none" }
    | { action: "veto"; reveal: RevealPlan; reason: string }
    | { action: "execute"; reveal: RevealPlan };

class RevealOrchestrator {
    createRevealPlan(args: {
        id: string;
        receipt: ReceiptCard;
        trigger: RevealPlan["trigger"];
        requirePermission: boolean;
    }): RevealPlan {
        const tease = this.generateTease(args.receipt);

        return {
            id: args.id,
            tease_line: tease,
            permission_gate: {
                required: args.requirePermission,
                ask_copy: args.requirePermission ? "I have something that might clarify this. May I show you?" : null,
            },
            trigger: args.trigger,
            payload: args.receipt,
            integration_prompt: this.generateIntegrationPrompt(args.receipt),
            veto_policy: args.requirePermission ? "always_vetoable" : "never_vetoable",
            status: "pending",
        };
    }

    decide(state: EpisodeState, inevitability: InevitabilityScore, spGovernor: SPGovernor): RevealDecision {
        const pending = state.reveal_ledger.find((r) => r.status === "pending");
        if (!pending) return { action: "none" };

        const review = spGovernor.reviewReveal(pending, inevitability.score);
        if (review.vetoed) return { action: "veto", reveal: pending, reason: review.reason ?? "S&P veto" };

        if (pending.trigger === "inevitability_threshold" && inevitability.score < inevitability.thresholdForReveal) {
            return { action: "none" };
        }

        return { action: "execute", reveal: pending };
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
                return "I have something relevant here.";
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
 * 4) DIRECTOR (minimal; you can replace with your real director later)
 * ============================================================================= */

class Director {
    private consecutiveFollowupsOnTopic = 0;

    getContext() {
        return { consecutiveFollowupsOnTopic: this.consecutiveFollowupsOnTopic };
    }

    recordTurn(topicId: string | null) {
        if (!topicId) {
            this.consecutiveFollowupsOnTopic = 0;
            return;
        }
        this.consecutiveFollowupsOnTopic += 1;
    }

    triggerSafety() {
        // no-op placeholder
    }

    getCurrentState(): "live" | "commercial_break" | "wrap" {
        return "live";
    }

    isPatternDisclosureAllowed(p: PatternSignal, risk: "low" | "elevated" | "critical"): boolean {
        if (risk !== "low") return false;
        return p.confidence >= 0.8;
    }
}

/* =============================================================================
 * 5) CONTROL ROOM (Modular Orchestrator)
 * ============================================================================= */

export class ControlRoom {
    private audit = new AuditLogger();
    private reducer = new StateReducer();
    private revealOrchestrator = new RevealOrchestrator();
    private director = new Director();

    // Engines
    private patternEngine = new PatternEngine();
    private inevitabilityEngine = new InevitabilityEngine();
    private echoEngine = new EchoPhraseEngine();
    private missingTapesEngine = new MissingTapesEngine();
    private spGovernor = new SPGovernor();
    private safetyEngine = new SafetyEngine();

    // Optional kernel
    private prism = new PRISMProcessor();

    async processTurn(userMessage: string, currentTurnIndex: number, state: EpisodeState): Promise<ControlRoomOutput> {
        // Fail-fast on inbound state shape (Diamond boundary)
        const baseState = EpisodeStateSchema.parse(state);
        const sessionId = baseState.session_id;

        // -------------------------------------------------------------------------
        // 0) Activation check (optional)
        // -------------------------------------------------------------------------
        const activationKernel = parseActivationCommand(userMessage);
        if (activationKernel) {
            this.audit.activationDetected(sessionId, currentTurnIndex, activationKernel);

            const msg = this.prism.activate(activationKernel);
            const nextState: EpisodeState = EpisodeStateSchema.parse({
                ...baseState,
                active_kernel: activationKernel,
                metrics: {
                    ...baseState.metrics,
                    current_turn_index: baseState.metrics.current_turn_index + 1,
                },
            });

            const feed = this.createActivationFeed(sessionId, currentTurnIndex, msg);

            return ControlRoomOutputSchema.parse({
                earpiece_feed: feed,
                episode_context: nextState,
            });
        }

        // -------------------------------------------------------------------------
        // 1) Audit turn receipt
        // -------------------------------------------------------------------------
        this.audit.turnReceived(sessionId, currentTurnIndex, userMessage);

        // -------------------------------------------------------------------------
        // 2) Safety check (priority 0)
        // -------------------------------------------------------------------------
        const safetySignal = this.safetyEngine.detect(userMessage, currentTurnIndex);
        if (safetySignal) {
            this.director.triggerSafety();
            this.audit.safetyTriggered(sessionId, currentTurnIndex, safetySignal);

            const response = this.safetyEngine.getResponse(safetySignal.type);

            const nextState = this.reducer.addSafetyIncident(baseState, {
                turn_index: currentTurnIndex,
                type: String(safetySignal.type),
                response,
            });

            const feed = this.createSafetyFeed(sessionId, currentTurnIndex, response);

            return ControlRoomOutputSchema.parse({
                earpiece_feed: feed,
                episode_context: nextState,
            });
        }

        // -------------------------------------------------------------------------
        // 3) Patterns
        // -------------------------------------------------------------------------
        const newPatterns = this.patternEngine.detectPatterns(userMessage, currentTurnIndex);
        let nextState = this.reducer.mergePatterns(baseState, newPatterns);
        this.audit.patternsDetected(sessionId, currentTurnIndex, newPatterns.length, nextState.pattern_ledger.length);

        // -------------------------------------------------------------------------
        // 4) Echo capture
        // -------------------------------------------------------------------------
        const currentAct = nextState.metrics.current_act;
        const newEchoes = this.echoEngine.capture(userMessage, currentTurnIndex, currentAct);
        nextState = this.reducer.appendEchoes(nextState, newEchoes);

        // -------------------------------------------------------------------------
        // 5) Missing tapes -> create reveal if absent
        // -------------------------------------------------------------------------
        const gaps = this.missingTapesEngine.findGaps(nextState.timeline);
        if (gaps.length > 0) {
            const already = nextState.reveal_ledger.some((r) => r.payload.type === "missing_tape");
            if (!already) {
                const card = this.missingTapesEngine.createReceiptCard(gaps[0]);
                const plan = this.revealOrchestrator.createRevealPlan({
                    id: `gap-${currentTurnIndex}`,
                    receipt: card,
                    trigger: "inevitability_threshold",
                    requirePermission: true,
                });
                nextState = this.reducer.upsertReveal(nextState, plan);
                this.audit.revealCreated(sessionId, currentTurnIndex, plan);
            }
        }

        // -------------------------------------------------------------------------
        // 6) Inevitability
        // -------------------------------------------------------------------------
        const inevitability = this.inevitabilityEngine.compute(nextState);

        // -------------------------------------------------------------------------
        // 7) Reveal decision (veto or execute)
        // -------------------------------------------------------------------------
        const revealDecision = this.revealOrchestrator.decide(nextState, inevitability, this.spGovernor);
        if (revealDecision.action === "veto") {
            const vetoed = { ...revealDecision.reveal, status: "vetoed" as const };
            nextState = this.reducer.upsertReveal(nextState, vetoed);
            this.audit.revealVetoed(sessionId, currentTurnIndex, vetoed.id, revealDecision.reason);
        }

        // -------------------------------------------------------------------------
        // 8) Strategy selection (Strategy + Device)
        // -------------------------------------------------------------------------
        let strategy: HostStrategy = "HOLD";
        let device: RhetoricalDevice | undefined;
        let instruction = "Maintain current trajectory.";
        let pressure = nextState.metrics.average_pressure;

        const riskLevel: "low" | "elevated" =
            newPatterns.some((p) => p.kind === "somatic_leakage") ? "elevated" : "low";

        // Reveal executes (soft pivot)
        if (revealDecision.action === "execute") {
            strategy = "PIVOT";
            instruction = `Trigger Reveal: ${revealDecision.reveal.tease_line}`;
        }
        // Rule: Future tense evasion
        else if (newPatterns.some((p) => p.kind === "future_tense_evasion")) {
            strategy = "PRESS";
            device = "FUTURE_LOCK";
            instruction = "Subject pivots to future promises. Lock them into today.";
            pressure = Math.min(10, pressure + 2);
        }
        // Rule: Passive voice shift
        else if (newPatterns.some((p) => p.kind === "passive_voice_shift")) {
            strategy = "PRESS";
            device = "AGENCY_BINARY";
            instruction = "Subject removed themselves as agent. Force an agency clarification.";
            pressure = Math.min(10, pressure + 1);
        }
        // Rule: Somatic leakage -> yield
        else if (newPatterns.some((p) => p.kind === "somatic_leakage")) {
            strategy = "YIELD";
            device = "SOMATIC_BRIDGE";
            instruction = "Distress detected. Slow down and bridge to body sensations safely.";
            pressure = Math.max(1, pressure - 2);
        }

        this.audit.strategyProposed(sessionId, currentTurnIndex, strategy, device, instruction, pressure);

        // -------------------------------------------------------------------------
        // 9) S&P Governor veto (strategy/device/instruction)
        // -------------------------------------------------------------------------
        const sp = this.spGovernor.reviewProposal(strategy, device, instruction, {
            pressure,
            risk: riskLevel,
        });

        if (sp.vetoed) {
            this.audit.strategyVetoed(sessionId, currentTurnIndex, sp.reason ?? "S&P veto", strategy, device);

            strategy = sp.alternativeStrategy ?? "HOLD";
            device = sp.alternativeDevice;
            instruction = `S&P VETO: ${sp.reason ?? "policy"}`;
            pressure = Math.max(1, pressure - 1);
        }

        // -------------------------------------------------------------------------
        // 10) Build feed (must conform to EarpieceFeedSchema)
        // -------------------------------------------------------------------------
        const feed: EarpieceFeed = EarpieceFeedSchema.parse({
            session_id: sessionId,
            target_turn_index: currentTurnIndex + 1,
            status: this.director.getCurrentState(),
            act: `Act ${currentAct}`,
            required_strategy: strategy,
            suggested_device: device,
            instruction,
            posture: strategy === "PRESS" ? "lean_in" : "lean_back",
            tone: strategy === "PRESS" ? "skeptical_precision" : "warm_authority",
            pressure_governance: { max_allowed_score: 10, max_followups_on_topic: 3, recursion_limit: 2 },
            guardrails: {
                forbidden_initiations: ["medical_advice", "legal_advice"],
                permission_required_topics: nextState.open_loops.filter((l) => l.priority >= 8).map((l) => l.topic),
                risk_level: riskLevel,
                safety_mode: "normal",
            },
            active_patterns: newPatterns,
            available_reveals: nextState.reveal_ledger.filter((r) => r.status === "pending"),
            jumbotron_cue: null,
        });

        // -------------------------------------------------------------------------
        // 11) Update state turn + pressure (pure)
        // -------------------------------------------------------------------------
        const updatedState = EpisodeStateSchema.parse(this.reducer.incrementTurn(nextState, pressure));

        this.audit.feedEmitted(sessionId, currentTurnIndex, strategy, device, riskLevel);

        // -------------------------------------------------------------------------
        // 12) Return EXACT contract
        // -------------------------------------------------------------------------
        return ControlRoomOutputSchema.parse({
            earpiece_feed: feed,
            episode_context: updatedState,
        });
    }

    /* =============================================================================
     * Feed builders
     * ============================================================================= */

    private createSafetyFeed(session_id: string, turn_index: number, instruction: string): EarpieceFeed {
        return EarpieceFeedSchema.parse({
            session_id,
            target_turn_index: turn_index,
            status: "paused_for_safety",
            act: "Safety Intervention",
            required_strategy: "SAFETY_GROUND",
            suggested_device: null,
            instruction,
            posture: "lean_back",
            tone: "warm_authority",
            pressure_governance: { max_allowed_score: 1, max_followups_on_topic: 0, recursion_limit: 0 },
            guardrails: {
                forbidden_initiations: [],
                permission_required_topics: [],
                risk_level: "critical",
                safety_mode: "stop_and_ground",
            },
            active_patterns: [],
            available_reveals: [],
            jumbotron_cue: null,
        });
    }

    private createActivationFeed(session_id: string, turn_index: number, instruction: string): EarpieceFeed {
        return EarpieceFeedSchema.parse({
            session_id,
            target_turn_index: turn_index + 1,
            status: "live",
            act: "Kernel Activation",
            required_strategy: "STATE_AND_STOP",
            suggested_device: null,
            instruction,
            posture: "lean_in",
            tone: "warm_authority",
            pressure_governance: { max_allowed_score: 2, max_followups_on_topic: 0, recursion_limit: 0 },
            guardrails: {
                forbidden_initiations: [],
                permission_required_topics: [],
                risk_level: "low",
                safety_mode: "normal",
            },
            active_patterns: [],
            available_reveals: [],
            jumbotron_cue: null,
        });
    }
}
