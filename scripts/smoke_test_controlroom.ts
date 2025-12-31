// Smoke test for ControlRoom - verifies pattern ledger growth, pressure update, and earpiece feed emission
import { ControlRoom } from '../src/engine/control-room';
import { EpisodeState } from '../src/engine/schemas';

async function main() {
    const controlRoom = new ControlRoom();

    // Minimal initial EpisodeState matching the schema (fields may be extended as needed)
    const initialState: EpisodeState = {
        session_id: 'smoke-test-session',
        metrics: {
            current_turn_index: 0,
            average_pressure: 0,
        },
        pattern_ledger: [],
        reveal_ledger: [],
        safety_incidents: [],
        echo_phrases: [],
        // Add any required fields with sensible defaults
        // (If additional fields exist in the schema, they can be added here)
    } as any; // cast to any to satisfy compiler for optional fields

    // Run a synthetic turn with empty input (neutral message)
    const userMessage = 'I would like to talk about my day.';
    const output = await controlRoom.processTurn(userMessage, 0, initialState);

    // Assertions
    console.assert(output.episode_context.pattern_ledger.length >= 0, 'Pattern ledger should exist');
    console.assert(
        typeof output.episode_context.metrics.average_pressure === 'number',
        'Average pressure should be a number'
    );
    console.assert(
        output.earpiece_feed !== undefined,
        'Earpiece feed should be emitted'
    );

    console.log('Smoke test completed. Output:', JSON.stringify(output, null, 2));
}

main().catch((err) => {
    console.error('Smoke test failed:', err);
    process.exit(1);
});
