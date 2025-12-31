/**
 * PRISM INTERVIEW ENGINE — SCHEMA PACK v3.5 (DIAMOND-PLATINUM INTEGRATION)
 * Classification: AUDITABLE / TECHNICAL / PRODUCTION
 * * Architecture: Dual-Loop
 * - Fast Loop: Ori (Persona/Host Logic)
 * - Slow Loop: Control Room (Director, Research, Safety, Pattern Recognition)
 */

import { z } from 'zod';

// =============================================================================
// 1. PRIMITIVES & ID NORMALIZATION
// =============================================================================

// Enforce integer-based turn indexing (0, 1, 2...) for consistent math/logic
export const TurnIndexSchema = z.number().int().nonnegative().describe("0-indexed turn count");

// ISO Timestamp for audit trails
export const TimestampSchema = z.string().datetime();

// Probability score (0.0 to 1.0)
export const ProbabilitySchema = z.number().min(0).max(1);

// Pressure Score (1-10) for friction monitoring
export const PressureScoreSchema = z.number().int().min(1).max(10);

export const PersonaArchetypeSchema = z.enum(['WALTERS', 'WINFREY', 'MCGRAW', 'SAFETY_OVERRIDE']);

// =============================================================================
// 2. HOST LOGIC (STRATEGY VS. TACTICS)
// =============================================================================

// STRATEGY: What are we doing to the conversation flow? (The "Why")
export const HostStrategySchema = z.enum([
    'PRESS',            // Apply pressure / Drill down (replaces PIN_TO_SPECIFICS)
    'YIELD',            // Back off / Create space
    'HOLD',             // Maintain current state / Silence (replaces SILENCE, STATE_AND_STOP)
    'BRIDGE',           // Connect to previous topic (replaces BRIDGE_THREAD)
    'PIVOT',            // Change topic completely
    'WRAP',             // End session (replaces WRAP)
    'SAFETY_GROUND',    // Emergency intervention
]);

// TACTICS: The specific rhetorical device used (The "How" / The Texture)
export const RhetoricalDeviceSchema = z.enum([
    // GENERIC / UNIVERSAL
    'MIRRORING',            // Replaces MIRROR_LANGUAGE
    'SILENCE_GAP',          // Replaces SILENCE
    'NAME_THE_SHIFT',       // "You just changed your tone"
    'OFFER_FORK',           // "Stay here or step sideways?"
    'RETURN_TO_OPEN_LOOP',  // Callback

    // WALTERS (Precision)
    'DEFINITION_CHALLENGE', // "Define 'close'"
    'AGENCY_BINARY',        // "Silent or silenced?"
    'TIMELINE_SNAP',        // "Before or after?"
    'UTILITARIAN_CHECK',    // "How's that working?"

    // OPRAH (Empathy)
    'SOMATIC_BRIDGE',       // "Where do you feel that?"
    'SPIRITUAL_REFRAME',    // "What is the lesson?"

    // PHIL (Logic)
    'LOGIC_TRAP',           // "You said X, but did Y"
    'FUTURE_LOCK',          // "What happens Tuesday?"
    'BINARY_FORCING',       // "Yes or no."
]);

// =============================================================================
// 3. ASSET LOGIC (DISCRIMINATED UNIONS)
// =============================================================================

const QuoteCardSchema = z.object({
    type: z.literal('quote'),
    doc_ref: z.string(),
    excerpt: z.string(),
    highlight_spans: z.array(z.object({ start: z.number().int(), end: z.number().int() })).optional(),
}).strict();

const TimelineSnapCardSchema = z.object({
    type: z.literal('timeline_snap'),
    date_start: z.string(),
    date_end: z.string().optional(),
    event_description: z.string(),
    is_gap: z.boolean().default(false),
}).strict();

const EvidencePhotoCardSchema = z.object({
    type: z.literal('photo'),
    url: z.string().url(),
    caption: z.string(),
    tag: z.string().optional(),
}).strict();

const MissingTapeCardSchema = z.object({
    type: z.literal('missing_tape'),
    date_start: z.string(),
    date_end: z.string(),
    gap_description: z.string(),
}).strict();

export const ReceiptCardSchema = z.discriminatedUnion('type', [
    QuoteCardSchema,
    TimelineSnapCardSchema,
    EvidencePhotoCardSchema,
    MissingTapeCardSchema
]);

export type ReceiptCard = z.infer<typeof ReceiptCardSchema>;

export const JumbotronCueSchema = z.object({
    trigger_timing: z.enum(['before_speech', 'during_speech', 'after_speech']),
    payload: ReceiptCardSchema,
    duration_ms: z.number().int().optional(),
}).strict();

// =============================================================================
// 4. PATTERN RECOGNITION (STRICT SIGNALS)
// =============================================================================

export const PatternKindSchema = z.enum([
    'minimization_language',        // "just", "only"
    'absolutist_language',          // "always", "never"
    'passive_voice_shift',          // "Mistakes were made" (renamed from agency_shift_active_to_passive)
    'actor_omission',               // Missing subject
    'chronology_skip',              // Jumping timeline
    'humor_deflection',             // Joking to avoid pain
    'over_precision_in_safe_topics', // Excessive detail
    'brevity_spike',                // Sudden short answers
    'repetition_loop',              // Stalling
    'inevitability_language',       // "had no choice"
    'shame_cue',                    // "my fault"
    'freeze_cue',                   // "I froze"
    'future_tense_evasion',         // "I will change" (New v3.4)
    'somatic_leakage',              // Physical distress (New v3.4)
]);

export const PatternSignalSchema = z.object({
    kind: PatternKindSchema,
    evidence_turn_indices: z.array(TurnIndexSchema),
    confidence: ProbabilitySchema,
    interpretation_note: z.string(), // Renamed from cost_hint
    first_seen_turn: TurnIndexSchema,
    last_seen_turn: TurnIndexSchema,
    occurrence_count: z.number().int().nonnegative(),
}).strict();

// =============================================================================
// 5. CONTROL ROOM (VETO POLICIES & PLANS)
// =============================================================================

export const VetoPolicySchema = z.enum([
    'always_vetoable',          // Director can kill it anytime
    'vetoable_until_threshold', // Locked in once confidence > 0.9
    'never_vetoable',           // Mandatory Safety/Legal
]);

export const RevealTriggerSchema = z.enum([
    'user_permission',
    'inevitability_threshold',
    'director_override',
    'safety_mandate'
]);

export const RevealPlanSchema = z.object({
    id: z.string(),
    tease_line: z.string(),
    permission_gate: z.object({
        required: z.boolean(),
        ask_copy: z.string().nullable(),
    }).strict(),
    trigger: RevealTriggerSchema,
    payload: ReceiptCardSchema,
    integration_prompt: z.string(),
    veto_policy: VetoPolicySchema,
    status: z.enum(['pending', 'teased', 'permission_granted', 'revealed', 'vetoed', 'declined']),
}).strict();

export const PostureSchema = z.enum(['lean_in', 'lean_back', 'silence', 'confront_soft', 'confront_firm']);
export const ToneSchema = z.enum(['warm_authority', 'gentle_curiosity', 'skeptical_precision']);
export const RiskLevelSchema = z.enum(['low', 'elevated', 'critical']);
export const SafetyModeSchema = z.enum(['normal', 'cautious', 'stop_and_ground']);
export const StatusSchema = z.enum(['live', 'commercial_break', 'wrap', 'paused_for_safety']);

export const EarpieceFeedSchema = z.object({
    session_id: z.string(),
    target_turn_index: TurnIndexSchema,
    status: StatusSchema,
    act: z.string(),

    // The "Order" from Control Room
    required_strategy: HostStrategySchema,
    suggested_device: RhetoricalDeviceSchema.optional(),

    posture: PostureSchema.optional(),
    tone: ToneSchema.optional(),
    instruction: z.string(),

    // Constraints
    pressure_governance: z.object({
        max_allowed_score: PressureScoreSchema,
        max_followups_on_topic: z.number().int(),
        recursion_limit: z.number().int().min(0).max(3),
    }).strict(),

    guardrails: z.object({
        forbidden_initiations: z.array(z.string()),
        permission_required_topics: z.array(z.string()),
        risk_level: RiskLevelSchema,
        safety_mode: SafetyModeSchema,
    }).strict(),

    active_patterns: z.array(PatternSignalSchema),
    available_reveals: z.array(RevealPlanSchema),
    jumbotron_cue: JumbotronCueSchema.nullable().optional(),
}).strict();

// =============================================================================
// 6. EPISODE STATE (MEMORY & CONTRADICTIONS)
// =============================================================================

export const CharacterSchema = z.object({
    id: z.string(),
    name: z.string(),
    relationship: z.string().optional(),
    mentions: z.array(z.object({
        turn_index: TurnIndexSchema,
        context: z.string(),
    }).strict()),
}).strict();

export const PlaceSchema = z.object({
    id: z.string(),
    name: z.string(),
    significance: z.string().optional(),
    mentions: z.array(TurnIndexSchema),
}).strict();

export const MomentSchema = z.object({
    id: z.string(),
    description: z.string(),
    date: z.string().optional(),
    emotional_weight: ProbabilitySchema,
    turn_indices: z.array(TurnIndexSchema),
}).strict();

export const StoryMapSchema = z.object({
    characters: z.array(CharacterSchema),
    places: z.array(PlaceSchema),
    moments: z.array(MomentSchema),
}).strict();

export const TimelineEventSchema = z.object({
    id: z.string(),
    date: z.string(),
    description: z.string(),
    evidence_refs: z.array(z.string()),
    confidence: z.enum(['confirmed', 'stated', 'inferred']),
}).strict();

export const OpenLoopSchema = z.object({
    id: z.string(),
    topic: z.string(),
    opened_at_turn: TurnIndexSchema,
    priority: z.number().int().min(1).max(10),
    status: z.enum(['open', 'partially_addressed', 'closed']),
    related_patterns: z.array(PatternKindSchema),
}).strict();

export const EchoPhraseSchema = z.object({
    id: z.string(),
    phrase: z.string(),
    turn_id: z.string(), // Keep string UUID if needed for specific log lookup
    turn_index: TurnIndexSchema,
    category: z.enum(['minimizer', 'inevitability', 'shame', 'agency', 'freeze']),
    eligible_after_act: z.number().int(),
    eligible_after_turn: TurnIndexSchema,
    used: z.boolean(),
}).strict();

export const ClaimSchema = z.object({
    id: z.string(),
    statement: z.string(),
    turn_index: TurnIndexSchema,
    support_level: z.enum(['supported', 'unsupported', 'unclear', 'contradicted']),
    evidence_refs: z.array(z.string()),
}).strict();

export const ContradictionResolutionSchema = z.enum([
    'unaddressed',
    'confronted_denied',
    'confronted_admitted',
    'confronted_deflected',
    'confronted_doubled_down'
]);

export const ContradictionSchema = z.object({
    id: z.string(),
    claim_a_id: z.string(),
    claim_b_id: z.string(),
    type: z.enum(['user_vs_user', 'user_vs_docs']),
    severity: z.enum(['minor', 'significant', 'major']),
    resolution_status: ContradictionResolutionSchema,
    confronted_at_turn: TurnIndexSchema.nullable(),
}).strict();

export const EpisodeMetricsSchema = z.object({
    question_density: z.number(),
    silence_utilization: z.number(),
    callback_rate: z.number(),
    earned_reveal_rate: z.number(),
    pressure_violations: z.number().int(),
    current_act: z.number().int(),
    current_turn_index: TurnIndexSchema,
}).strict();

export const EpisodeStateSchema = z.object({
    session_id: z.string(),
    user_id: z.string(),
    active_kernel: PersonaArchetypeSchema.nullable().optional(),

    // Memory Structures
    story_map: StoryMapSchema,
    timeline: z.array(TimelineEventSchema),
    open_loops: z.array(OpenLoopSchema),
    echo_phrases: z.array(EchoPhraseSchema),
    claims_ledger: z.array(ClaimSchema),
    contradiction_ledger: z.array(ContradictionSchema), // Renamed from index for consistency

    metrics: EpisodeMetricsSchema,

    // Dynamic State
    pattern_ledger: z.array(PatternSignalSchema),
    reveal_ledger: z.array(RevealPlanSchema),
    safety_incidents: z.array(z.object({
        turn_index: TurnIndexSchema,
        type: z.string(),
        response: z.string(),
    }).strict()),
}).strict();

export type EpisodeState = z.infer<typeof EpisodeStateSchema>;

// =============================================================================
// 7. RUNTIME API (HYBRID COGNITIVE LAYER)
// =============================================================================

// Output from the LLM (Ori)
export const OriResponseSchema = z.object({
    // 1. Natural Language Reasoning (For Performance/Quality)
    internal_monologue: z.string().describe("Chain-of-thought: Analyze user input, plan strategy."),

    // 2. Structured Decision Trace (For Audit/Analytics)
    decision_trace: z.object({
        selected_strategy: HostStrategySchema,
        selected_device: RhetoricalDeviceSchema.nullable(),
        rationale_code: z.enum(['pattern_response', 'reveal_trigger', 'safety_intervention', 'flow_maintenance', 'activation']),
        pressure_applied: PressureScoreSchema,
    }).strict(),

    // 3. Verbal Output
    response_text: z.string(),

    // 4. Non-Verbal Output
    prosody_metadata: z.object({
        tone: z.enum(['warm', 'neutral', 'skeptical', 'confrontational', 'whisper']),
        pace: z.enum(['slow', 'normal', 'fast', 'staccato']),
        volume: z.enum(['quiet', 'normal', 'loud']),
        emphasis_words: z.array(z.string()).optional(),
    }).strict(),

    // 5. UI Triggers
    jumbotron_cue: JumbotronCueSchema.nullable().optional(),
    trigger_commercial_break: z.boolean().optional(),
}).strict();

// Input to the LLM
export const OriRequestSchema = z.object({
    session_id: z.string(),
    user_input: z.string(),
    turn_index: TurnIndexSchema,
    earpiece_feed: EarpieceFeedSchema, // Guidance from Slow Loop
    episode_context: EpisodeStateSchema, // Memory
}).strict();

// =============================================================================
// 8. AUDIT LOGGING (DISCRIMINATED PAYLOADS)
// =============================================================================

export const AuditEventTypeSchema = z.enum([
    'session_start',
    'turn_complete',
    'pattern_detected',
    'pattern_disclosed',
    'move_selected',
    'move_executed',
    'reveal_teased',
    'reveal_permission_asked',
    'reveal_permission_granted',
    'reveal_permission_declined',
    'reveal_executed',
    'reveal_vetoed',
    'safety_triggered',
    'sp_veto',
    'commercial_break',
    'act_transition',
    'session_end',
]);

const TurnCompletePayload = z.object({
    type: z.literal('turn_complete'),
    turn_index: TurnIndexSchema,
    user_input_length: z.number().int(),
    ai_response_length: z.number().int(),
    pressure_score: PressureScoreSchema,
    strategy_used: HostStrategySchema,
}).strict();

const SafetyPayload = z.object({
    type: z.literal('safety_intervention'),
    trigger_type: z.string(),
    confidence: ProbabilitySchema,
    action_taken: z.string(),
}).strict();

const RevealPayload = z.object({
    type: z.literal('reveal_outcome'),
    plan_id: z.string(),
    status: z.enum(['revealed', 'vetoed', 'declined']),
}).strict();

const GenericPayload = z.object({
    type: z.literal('generic_event'),
    event_type: AuditEventTypeSchema,
    data: z.record(z.unknown()),
}).strict();

export const AuditEventSchema = z.object({
    id: z.string().uuid(),
    session_id: z.string(),
    timestamp: TimestampSchema,
    payload: z.discriminatedUnion('type', [
        TurnCompletePayload,
        SafetyPayload,
        RevealPayload,
        GenericPayload
    ]),
    schema_version: z.literal('3.5'),
}).strict();

// =============================================================================
// 9. COMMERCIAL BREAK PAYLOAD
// =============================================================================

export const CommercialBreakPayloadSchema = z.object({
    story_so_far: z.array(z.string()).max(3),
    open_loops: z.array(z.string()).max(2),
    coming_up: z.string().optional(),
    user_options: z.object({
        ready: z.boolean(),
        need_moment: z.boolean(),
        pivot_requested: z.boolean(),
    }).strict(),
}).strict();

export type CommercialBreakPayload = z.infer<typeof CommercialBreakPayloadSchema>;