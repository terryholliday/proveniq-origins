// tests/controlRoom.unit.test.ts
import { ControlRoom } from '../src/engine/control-room';
import { EpisodeStateSchema } from '../src/engine/schemas';
import { HostStrategy, RhetoricalDevice } from '../src/engine/schemas';

/** Helper to create a minimal episode state */
function createEpisode() {
    return EpisodeStateSchema.parse({
        // Minimal required fields – adjust if schema adds required props later
        episode_id: 'test-episode',
        turn_index: 0,
        pattern_ledger: [],
        reveal_ledger: [],
        average_pressure: 0,
        earpiece_feed: [],
        // other fields defaulted by schema.strict() will be omitted here
    });
}

describe('ControlRoom.processTurn – basic smoke path', () => {
    it('should grow pattern ledger, update pressure, and emit earpiece feed', async () => {
        const control = new ControlRoom();
        const episode = createEpisode();
        const turn = {
            // Minimal turn payload – adapt to actual Turn type if needed
            user_input: 'test input',
            // Provide a HostStrategy and RhetoricalDevice for the test
            host_strategy: HostStrategy.PRESS,
            rhetorical_device: RhetoricalDevice.MIRRORING,
        } as any; // cast to any to avoid full type import complexities

        const result = await control.processTurn(episode, turn);

        // Verify ledger grew
        expect(result.episode.pattern_ledger.length).toBeGreaterThan(0);
        // Verify pressure changed (non‑zero)
        expect(result.episode.average_pressure).not.toBe(0);
        // Verify an earpiece feed entry was emitted
        expect(result.episode.earpiece_feed.length).toBeGreaterThan(0);
    });
});
