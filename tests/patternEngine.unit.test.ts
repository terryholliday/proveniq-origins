// tests/patternEngine.unit.test.ts
import { PatternEngine } from '../src/engine/control-room-engines';
import { PatternKind } from '../src/engine/schemas';

describe('PatternEngine – each PatternKind', () => {
    const engine = new PatternEngine();
    const dummyEpisode = {} as any; // minimal placeholder
    const dummyTurn = {} as any;

    const allKinds = Object.values(PatternKind) as string[];
    allKinds.forEach((kind) => {
        it(`processes pattern kind ${kind}`, async () => {
            // Simulate a turn that would trigger this pattern kind
            // The actual payload shape depends on your engine; using a generic placeholder
            const result = await engine.process(dummyEpisode, dummyTurn, kind as any);
            expect(result).toBeDefined();
            // You can add more specific assertions once you know the return shape
        });
    });
});
