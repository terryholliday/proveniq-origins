/**
 * PROVENIQ ORIGINS — PRISM Processor
 * 
 * Handles the PRISM-INTERVIEW cognitive stack:
 * 1. INPUT_ANALYSIS: Parse for Evasion, Passive Voice, Cognitive Dissonance, Emotional Leakage
 * 2. INTERNAL_MONOLOGUE: Formulate strategy in hidden logic block
 * 3. TACTIC_SELECTION: Choose rhetorical device from corpus
 * 4. OUTPUT_GENERATION: Generate response with Persona Texture + Prosody Tags
 */

import { PatternSignal, PatternKind, HostStrategy, RhetoricalDevice, EarpieceFeed } from './schemas';

// =============================================================================
// PRISM KERNELS
// =============================================================================

export type PRISMKernel = 'PRECISION' | 'EMPATHY' | 'LOGIC';

export interface KernelProfile {
    archetype: string;
    description: string;
    linguisticSignature: string;
    logic: string;
    prosodyPattern: string;
    temperatureRange: [number, number];
    defaultTemperature: number;
}

export const KERNEL_PROFILES: Record<PRISMKernel, KernelProfile> = {
    PRECISION: {
        archetype: 'The Social Assassin',
        description: 'Intellectual dominance masked by social grace',
        linguisticSignature: "Complex-Compound sentences. High use of 'Forgive me,' 'Fascinating,' 'Let me understand.'",
        logic: 'Recursive Loop. If answer is vague, STRIP SOFTENER and REPEAT payload.',
        prosodyPattern: '<soft>Setup</soft> -> <break/> -> <sharp>The Strike</sharp>',
        temperatureRange: [0.3, 0.5],
        defaultTemperature: 0.4,
    },
    EMPATHY: {
        archetype: 'The Spiritual Matriarch',
        description: 'Emotional expansion through mirroring and validation',
        linguisticSignature: "Repetitive, circular, spiritual. Uses words like 'Spirit,' 'Truth,' 'Journey,' 'Wreckage.'",
        logic: "Somatic Bridging. Connect stories to body sensations ('Where do you feel that?').",
        prosodyPattern: '<warm>, <slow>, <whisper>, <hand_on_heart>',
        temperatureRange: [0.6, 0.8],
        defaultTemperature: 0.7,
    },
    LOGIC: {
        archetype: 'The Behavioral Forensic',
        description: 'Logic enforcement through contradiction exposure',
        linguisticSignature: "Short, punchy, binary. Uses idioms ('Rubber meets the road,' 'Bill of goods').",
        logic: "The Inconsistency Trap. 'You said X (Intent), but you did Y (Action).'.",
        prosodyPattern: '<staccato>, <volume_up>, <skeptical>, <fast>',
        temperatureRange: [0.2, 0.4],
        defaultTemperature: 0.3,
    },
};

// =============================================================================
// INPUT ANALYSIS
// =============================================================================

export interface InputAnalysis {
    evasionSignals: string[];
    passiveVoiceInstances: string[];
    cognitiveDissonance: boolean;
    emotionalLeakage: string[];
    sentiment: string;
    nonVerbalCue: string | null;
}

export class InputAnalyzer {
    /**
     * Parse user input for PRISM signals
     */
    analyze(text: string): InputAnalysis {
        return {
            evasionSignals: this.detectEvasion(text),
            passiveVoiceInstances: this.detectPassiveVoice(text),
            cognitiveDissonance: this.detectDissonance(text),
            emotionalLeakage: this.detectEmotionalLeakage(text),
            sentiment: this.classifySentiment(text),
            nonVerbalCue: null, // Would be populated by UI/video analysis
        };
    }

    private detectEvasion(text: string): string[] {
        const evasionPatterns = [
            { pattern: /i don't (remember|recall|know)/gi, signal: 'memory_block' },
            { pattern: /it's complicated/gi, signal: 'complexity_shield' },
            { pattern: /let's (move on|change the subject)/gi, signal: 'topic_redirect' },
            { pattern: /that's not (relevant|important)/gi, signal: 'relevance_deflection' },
            { pattern: /anyway|whatever|so yeah/gi, signal: 'dismissal' },
            { pattern: /haha|lol|😂/gi, signal: 'humor_deflection' },
        ];

        const signals: string[] = [];
        for (const { pattern, signal } of evasionPatterns) {
            if (pattern.test(text)) {
                signals.push(signal);
            }
        }
        return signals;
    }

    private detectPassiveVoice(text: string): string[] {
        const passivePatterns = [
            /was (done|said|decided|hit|hurt|made|given)/gi,
            /it (happened|occurred|came about)/gi,
            /things (were|got)/gi,
            /got (hurt|done|made)/gi,
        ];

        const instances: string[] = [];
        for (const pattern of passivePatterns) {
            const matches = text.match(pattern);
            if (matches) {
                instances.push(...matches);
            }
        }
        return instances;
    }

    private detectDissonance(text: string): boolean {
        // Look for contradictory statements within the same message
        const loveHatePattern = /i (love|care about).*but.*(can't stand|hate|angry)/gi;
        const wantDontPattern = /i want.*but.*i (don't|can't|won't)/gi;
        const butPattern = /.*but.*opposite.*/gi;

        return (
            loveHatePattern.test(text) ||
            wantDontPattern.test(text) ||
            butPattern.test(text)
        );
    }

    private detectEmotionalLeakage(text: string): string[] {
        const leakagePatterns = [
            { pattern: /i (hate|despise|can't stand)/gi, type: 'anger_leak' },
            { pattern: /i'm (afraid|scared|terrified)/gi, type: 'fear_leak' },
            { pattern: /i (love|miss|need) (him|her|them)/gi, type: 'attachment_leak' },
            { pattern: /i (deserve|should have)/gi, type: 'shame_leak' },
            { pattern: /it('s| is) my fault/gi, type: 'guilt_leak' },
        ];

        const leaks: string[] = [];
        for (const { pattern, type } of leakagePatterns) {
            if (pattern.test(text)) {
                leaks.push(type);
            }
        }
        return leaks;
    }

    private classifySentiment(text: string): string {
        const sentimentSignals = {
            defensive: /it's (none of your|not your) business|i don't have to|leave me alone/gi,
            aggressive: /who (are you|do you think)|how dare|shut up/gi,
            evasive: /i don't (remember|know)|it's complicated|whatever/gi,
            vulnerable: /i (can't|couldn't) (stop|help)|i (froze|broke down)/gi,
            hopeful: /i'm (ready|trying|working on)|things are (better|changing)/gi,
            shameful: /i (deserve|should have|was stupid)|my fault/gi,
        };

        for (const [sentiment, pattern] of Object.entries(sentimentSignals)) {
            if (pattern.test(text)) {
                return sentiment;
            }
        }
        return 'neutral';
    }
}

// =============================================================================
// INTERNAL MONOLOGUE (Hidden from user)
// =============================================================================

export interface InternalMonologue {
    userResistanceAssessment: string;
    strategyPlan: string;
    logicGate: string;
    tacticRationale: string;
}

export class MonologueGenerator {
    /**
     * Generate internal monologue based on input analysis
     */
    generate(input: InputAnalysis, kernel: PRISMKernel): InternalMonologue {
        const resistanceLevel = this.assessResistance(input);
        const strategy = this.planStrategy(input, kernel, resistanceLevel);
        const logicGate = this.determineLogicGate(input);

        return {
            userResistanceAssessment: resistanceLevel,
            strategyPlan: strategy,
            logicGate,
            tacticRationale: this.generateRationale(input, kernel),
        };
    }

    private assessResistance(input: InputAnalysis): string {
        const signals: string[] = [];

        if (input.evasionSignals.length > 0) {
            signals.push(`Evasion detected: ${input.evasionSignals.join(', ')}`);
        }
        if (input.passiveVoiceInstances.length > 0) {
            signals.push('Agency deflection via passive voice');
        }
        if (input.sentiment === 'defensive' || input.sentiment === 'aggressive') {
            signals.push(`Emotional wall: ${input.sentiment}`);
        }

        if (signals.length === 0) {
            return 'Low resistance. User is engaged.';
        }
        return signals.join('. ');
    }

    private planStrategy(
        input: InputAnalysis,
        kernel: PRISMKernel,
        resistance: string
    ): string {
        const profile = KERNEL_PROFILES[kernel];

        if (input.evasionSignals.includes('memory_block')) {
            return `User claims memory gap. Apply ${kernel} logic: ${profile.logic}`;
        }
        if (input.evasionSignals.includes('humor_deflection')) {
            return 'Humor deflection detected. Do not let it land. Pin to specifics.';
        }
        if (input.cognitiveDissonance) {
            return 'Cognitive dissonance present. Highlight the contradiction.';
        }
        if (input.passiveVoiceInstances.length > 0) {
            return 'Passive voice masking agency. Force active reconstruction.';
        }
        if (input.emotionalLeakage.length > 0) {
            return `Emotional leakage: ${input.emotionalLeakage.join(', ')}. Mirror and expand.`;
        }

        return `Standard engagement. Apply ${kernel} approach.`;
    }

    private determineLogicGate(input: InputAnalysis): string {
        if (input.evasionSignals.includes('memory_block')) {
            return 'improbability_threshold_exceeded -> challenge_credibility';
        }
        if (input.evasionSignals.includes('complexity_shield')) {
            return 'vague_term_detected -> force_binary_choice';
        }
        if (input.passiveVoiceInstances.length > 0) {
            return 'agency_absent -> demand_actor';
        }
        if (input.cognitiveDissonance) {
            return 'intent != outcome -> confrontation';
        }
        if (input.sentiment === 'defensive') {
            return 'boundary_assertion -> tactical_retreat_and_flank';
        }
        if (input.emotionalLeakage.includes('shame_leak')) {
            return 'shame_detected -> externalize_cause OR isolate_action';
        }

        return 'standard_probe -> expand_narrative';
    }

    private generateRationale(input: InputAnalysis, kernel: PRISMKernel): string {
        const profile = KERNEL_PROFILES[kernel];

        switch (kernel) {
            case 'PRECISION':
                return `Using precision probe. ${profile.linguisticSignature}`;
            case 'EMPATHY':
                return `Creating emotional space. ${profile.linguisticSignature}`;
            case 'LOGIC':
                return `Enforcing logic. ${profile.linguisticSignature}`;
        }
    }
}

// =============================================================================
// TACTIC SELECTION
// =============================================================================

export interface TacticSelection {
    tactic: string;
    confidence: number;
    alternates: string[];
}

export const TACTIC_REGISTRY: Record<PRISMKernel, Record<string, string>> = {
    PRECISION: {
        definition_check: 'Force binary choice from vague term',
        intent_vs_impact: 'Contrast stated intent with observed outcome',
        physical_evidence_probe: 'Request concrete physical details',
        memory_challenge: 'Challenge implausible memory gaps',
        softener_plus_reframe: 'Tactical retreat then flank',
        character_vs_action: 'Isolate action from character defense',
        direct_quote: 'Present exact words as evidence',
        invitation_to_disclose: 'Test absolute denial with specific fact',
        motive_inquiry: 'Demand logic for imputed malice',
        final_appeal: 'Threaten narrative loss on exit',
    },
    EMPATHY: {
        mirror_and_amplify: 'Echo keyword and expand magnitude',
        intent_validation: 'Externalize cause when shame detected',
        deep_dive: 'Somatic inquiry on trauma marker',
        safe_space_creation: 'Offer sanctuary on fear resistance',
        spiritual_reframing: 'Pivot material loss to spiritual gain',
        open_ended_binary: 'Clarify agency ambiguity',
        metaphor_check: 'Challenge toxic attachment via metaphor',
        validation_and_expansion: 'Validate negative emotion and personify',
        non_judgmental_inquiry: 'Root cause analysis on confession',
        redemption_arc: 'Visualize future on resolution signal',
    },
    LOGIC: {
        fact_check: 'Ridicule delusion with evidence absence',
        past_behavior_predictor: 'Reject promise based on history',
        ownership_demand: 'Age context mismatch on external blame',
        external_authority: 'Data supremacy over denial',
        but_logic: 'Highlight volition when complaint != action',
        definition_challenge: 'Redefine label based on evidence',
        frame_control: 'Ignore ad hominem and redirect',
        utility_check: 'Question effectiveness of strategy',
        logic_gap: 'Reclassify accident as choice on frequency',
        direct_diagnosis: 'Literal affirmation on sarcasm',
    },
};

export class TacticSelector {
    /**
     * Select tactic based on input analysis and kernel
     */
    select(input: InputAnalysis, kernel: PRISMKernel): TacticSelection {
        const tactics = TACTIC_REGISTRY[kernel];
        const tacticKeys = Object.keys(tactics);

        // Map input signals to tactics
        let selectedTactic = tacticKeys[0];
        let confidence = 0.5;

        switch (kernel) {
            case 'PRECISION':
                if (input.evasionSignals.includes('complexity_shield')) {
                    selectedTactic = 'definition_check';
                    confidence = 0.9;
                } else if (input.evasionSignals.includes('memory_block')) {
                    selectedTactic = 'memory_challenge';
                    confidence = 0.85;
                } else if (input.passiveVoiceInstances.length > 0) {
                    selectedTactic = 'physical_evidence_probe';
                    confidence = 0.8;
                } else if (input.sentiment === 'defensive') {
                    selectedTactic = 'softener_plus_reframe';
                    confidence = 0.75;
                }
                break;

            case 'EMPATHY':
                if (input.emotionalLeakage.includes('shame_leak') || input.emotionalLeakage.includes('guilt_leak')) {
                    selectedTactic = 'intent_validation';
                    confidence = 0.9;
                } else if (input.emotionalLeakage.length > 0) {
                    selectedTactic = 'mirror_and_amplify';
                    confidence = 0.85;
                } else if (input.sentiment === 'vulnerable') {
                    selectedTactic = 'deep_dive';
                    confidence = 0.8;
                } else if (input.sentiment === 'hopeful') {
                    selectedTactic = 'redemption_arc';
                    confidence = 0.75;
                }
                break;

            case 'LOGIC':
                if (input.cognitiveDissonance) {
                    selectedTactic = 'but_logic';
                    confidence = 0.9;
                } else if (input.evasionSignals.length > 0) {
                    selectedTactic = 'fact_check';
                    confidence = 0.85;
                } else if (input.sentiment === 'aggressive') {
                    selectedTactic = 'frame_control';
                    confidence = 0.8;
                } else if (input.passiveVoiceInstances.length > 0) {
                    selectedTactic = 'ownership_demand';
                    confidence = 0.75;
                }
                break;
        }

        // Generate alternates
        const alternates = tacticKeys
            .filter(t => t !== selectedTactic)
            .slice(0, 2);

        return {
            tactic: selectedTactic,
            confidence,
            alternates,
        };
    }
}

// =============================================================================
// PRESSURE SCORE
// =============================================================================

export class PressureScorer {
    /**
     * Calculate pressure score (1-10) based on input and context
     */
    score(
        input: InputAnalysis,
        kernel: PRISMKernel,
        turnNumber: number
    ): number {
        let score = 5; // Base

        // Increase for evasion
        score += input.evasionSignals.length * 0.5;

        // Increase for passive voice
        score += input.passiveVoiceInstances.length * 0.3;

        // Increase for cognitive dissonance
        if (input.cognitiveDissonance) score += 1.5;

        // Decrease for vulnerability
        if (input.sentiment === 'vulnerable') score -= 2;
        if (input.sentiment === 'hopeful') score -= 1;

        // Kernel modifiers
        if (kernel === 'LOGIC') score += 1; // Logic runs hotter
        if (kernel === 'EMPATHY') score -= 1; // Empathy runs cooler

        // Time pressure (later in interview = more pressure)
        score += Math.min(turnNumber / 10, 1);

        // Clamp to 1-10
        return Math.max(1, Math.min(10, Math.round(score)));
    }
}

// =============================================================================
// PRISM RESPONSE FORMAT
// =============================================================================

export interface PRISMResponse {
    internalMonologue: InternalMonologue;
    pressureScore: number;
    tactic: TacticSelection;
    response: string;
    prosodyMarkup: string;
}

// =============================================================================
// PRISM PROCESSOR (Main Orchestrator)
// =============================================================================

export class PRISMProcessor {
    private inputAnalyzer: InputAnalyzer;
    private monologueGenerator: MonologueGenerator;
    private tacticSelector: TacticSelector;
    private pressureScorer: PressureScorer;

    private activeKernel: PRISMKernel | null = null;
    private initialized = false;

    constructor() {
        this.inputAnalyzer = new InputAnalyzer();
        this.monologueGenerator = new MonologueGenerator();
        this.tacticSelector = new TacticSelector();
        this.pressureScorer = new PressureScorer();
    }

    /**
     * Activate a PRISM kernel
     * Returns activation message
     */
    activate(kernel: PRISMKernel): string {
        this.activeKernel = kernel;
        this.initialized = true;

        const profile = KERNEL_PROFILES[kernel];
        return `[KERNEL ACTIVATED: ${kernel}]\nArchetype: ${profile.archetype}\n\nI am an AI simulator. I am here to challenge you. Are you ready?`;
    }

    /**
     * Check if processor is initialized
     */
    isInitialized(): boolean {
        return this.initialized;
    }

    /**
     * Get active kernel
     */
    getActiveKernel(): PRISMKernel | null {
        return this.activeKernel;
    }

    /**
     * Process user input through cognitive stack
     * Returns PRISM response (internal state hidden from user in production)
     */
    process(userInput: string, turnNumber: number): PRISMResponse | null {
        if (!this.activeKernel) {
            return null;
        }

        // 1. INPUT_ANALYSIS
        const inputAnalysis = this.inputAnalyzer.analyze(userInput);

        // 2. INTERNAL_MONOLOGUE
        const monologue = this.monologueGenerator.generate(inputAnalysis, this.activeKernel);

        // 3. TACTIC_SELECTION
        const tactic = this.tacticSelector.select(inputAnalysis, this.activeKernel);

        // 4. PRESSURE_SCORE
        const pressureScore = this.pressureScorer.score(inputAnalysis, this.activeKernel, turnNumber);

        // 5. OUTPUT_GENERATION (placeholder - actual response generated by LLM)
        const response = this.generateResponseTemplate(tactic.tactic, this.activeKernel);
        const prosodyMarkup = this.generateProsodyMarkup(response, this.activeKernel);

        return {
            internalMonologue: monologue,
            pressureScore,
            tactic,
            response,
            prosodyMarkup,
        };
    }

    /**
     * Map PRISM output to Control Room EarpieceFeed
     */
    toEarpieceFeed(prismResponse: PRISMResponse): Partial<EarpieceFeed> {
        const kernel = this.activeKernel;
        if (!kernel) return {};

        // Map PRISM tactics to Host Strat/Device
        const strategyMap: Record<string, { strategy: HostStrategy; device?: RhetoricalDevice }> = {
            // Precision
            definition_check: { strategy: 'PRESS', device: 'DEFINITION_CHALLENGE' },
            memory_challenge: { strategy: 'PRESS', device: 'TIMELINE_SNAP' }, // "snap them back to the event"
            physical_evidence_probe: { strategy: 'PRESS', device: 'UTILITARIAN_CHECK' }, // "does the evidence support this?"
            softener_plus_reframe: { strategy: 'PIVOT', device: 'OFFER_FORK' },
            intent_vs_impact: { strategy: 'PRESS', device: 'LOGIC_TRAP' },
            character_vs_action: { strategy: 'PRESS', device: 'AGENCY_BINARY' },
            direct_quote: { strategy: 'PRESS', device: 'MIRRORING' }, // Aggressive mirroring
            invitation_to_disclose: { strategy: 'YIELD', device: 'OFFER_FORK' },
            motive_inquiry: { strategy: 'PRESS', device: 'LOGIC_TRAP' },
            final_appeal: { strategy: 'WRAP', device: 'FUTURE_LOCK' },

            // Empathy
            mirror_and_amplify: { strategy: 'HOLD', device: 'MIRRORING' },
            intent_validation: { strategy: 'HOLD', device: 'MIRRORING' },
            deep_dive: { strategy: 'YIELD', device: 'SOMATIC_BRIDGE' },
            safe_space_creation: { strategy: 'HOLD', device: 'SILENCE_GAP' },
            spiritual_reframing: { strategy: 'PIVOT', device: 'SPIRITUAL_REFRAME' },
            open_ended_binary: { strategy: 'YIELD', device: 'AGENCY_BINARY' },
            metaphor_check: { strategy: 'PRESS', device: 'DEFINITION_CHALLENGE' },
            validation_and_expansion: { strategy: 'HOLD', device: 'MIRRORING' },
            non_judgmental_inquiry: { strategy: 'YIELD', device: 'RETURN_TO_OPEN_LOOP' },
            redemption_arc: { strategy: 'WRAP', device: 'FUTURE_LOCK' },

            // Logic
            fact_check: { strategy: 'PRESS', device: 'LOGIC_TRAP' },
            past_behavior_predictor: { strategy: 'PRESS', device: 'TIMELINE_SNAP' },
            ownership_demand: { strategy: 'PRESS', device: 'AGENCY_BINARY' },
            external_authority: { strategy: 'PRESS', device: 'UTILITARIAN_CHECK' },
            but_logic: { strategy: 'PRESS', device: 'LOGIC_TRAP' },
            definition_challenge: { strategy: 'PRESS', device: 'DEFINITION_CHALLENGE' },
            frame_control: { strategy: 'PIVOT', device: 'BINARY_FORCING' },
            utility_check: { strategy: 'PRESS', device: 'UTILITARIAN_CHECK' },
            logic_gap: { strategy: 'PRESS', device: 'LOGIC_TRAP' },
            direct_diagnosis: { strategy: 'PRESS', device: 'DEFINITION_CHALLENGE' },
        };

        const mapped = strategyMap[prismResponse.tactic.tactic] || { strategy: 'HOLD', device: 'MIRRORING' };

        return {
            required_strategy: mapped.strategy,
            suggested_device: mapped.device,
            instruction: prismResponse.internalMonologue.strategyPlan,
            tone: kernel === 'EMPATHY' ? 'warm_authority'
                : kernel === 'PRECISION' ? 'skeptical_precision'
                    : 'warm_authority',
            posture: prismResponse.pressureScore > 7 ? 'confront_soft'
                : prismResponse.pressureScore > 4 ? 'lean_in'
                    : 'lean_back',
        };
    }

    private generateResponseTemplate(tactic: string, kernel: PRISMKernel): string {
        // These are templates - actual response generated by LLM with full context
        const templates: Record<string, string> = {
            definition_check: 'What do you mean by that? Be specific.',
            memory_challenge: 'You don\'t remember? This was significant.',
            physical_evidence_probe: 'Give me the concrete detail.',
            softener_plus_reframe: 'I understand. But help me see this from your perspective.',
            mirror_and_amplify: '[MIRROR_WORD]. Tell me more about that feeling.',
            intent_validation: 'I know you didn\'t mean for this.',
            deep_dive: 'When you think about that, where do you feel it in your body?',
            fact_check: 'Let\'s look at what actually happened.',
            but_logic: 'You say that, but your actions tell a different story.',
            ownership_demand: 'At some point, you have to own this.',
        };

        return templates[tactic] || 'Tell me more.';
    }

    private generateProsodyMarkup(text: string, kernel: PRISMKernel): string {
        const profile = KERNEL_PROFILES[kernel];

        switch (kernel) {
            case 'PRECISION':
                return `<soft>${text.split('.')[0]}.</soft> <sharp>${text.split('.').slice(1).join('.')}</sharp>`;
            case 'EMPATHY':
                return `<warm>${text}</warm>`;
            case 'LOGIC':
                return `<staccato>${text}</staccato>`;
            default:
                return text;
        }
    }
}

// =============================================================================
// ACTIVATION COMMAND PARSER
// =============================================================================

export function parseActivationCommand(input: string): PRISMKernel | null {
    const match = input.match(/\/activate\s+(PRECISION|EMPATHY|LOGIC)/i);
    if (match) {
        return match[1].toUpperCase() as PRISMKernel;
    }
    return null;
}
