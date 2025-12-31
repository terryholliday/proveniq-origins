// tests/safetyEngine.unit.test.ts
import { SafetyEngine } from '../src/engine/control-room-engines';
import { SafetySignal } from '../src/engine/schemas';

describe('SafetyEngine – all safety signals', () => {
    const engine = new SafetyEngine();
    const dummyEpisode = {} as any;
    const dummyTurn = {} as any;

    const signals = Object.values(SafetySignal) as string[];
    signals.forEach((signal) => {
        it(`handles safety signal ${signal}`, async () => {
            const result = await engine.process(dummyEpisode, dummyTurn, signal as any);
            expect(result).toBeDefined();
            // Add more specific checks if you know the shape of the result
        });
    });
});
