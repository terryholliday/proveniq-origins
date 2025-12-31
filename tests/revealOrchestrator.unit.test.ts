// tests/revealOrchestrator.unit.test.ts
import { RevealEngine } from '../src/engine/control-room-engines';
import { RevealTrigger } from '../src/engine/schemas';

describe('RevealEngine – each reveal trigger', () => {
    const engine = new RevealEngine();
    const dummyEpisode = {} as any;
    const dummyTurn = {} as any;

    const triggers = Object.values(RevealTrigger) as string[];
    triggers.forEach((trigger) => {
        it(`processes reveal trigger ${trigger}`, async () => {
            const result = await engine.process(dummyEpisode, dummyTurn, trigger as any);
            expect(result).toBeDefined();
        });
    });
});
