// tests/api.integration.test.ts
import request from 'supertest';
import app from '../src/index'; // adjust if your Express entry point is exported differently

describe('API integration – interview routes', () => {
    it('POST /api/ai/interview/turn returns a valid response', async () => {
        const response = await request(app)
            .post('/api/ai/interview/turn')
            .send({
                // Minimal payload matching your Turn schema – adjust field names as needed
                user_input: 'test input',
                host_strategy: 'PRESS', // one of HostStrategy enum values
                rhetorical_device: 'MIRRORING', // one of RhetoricalDevice enum values
            });
        expect(response.status).toBe(200);
        // Basic shape checks – adapt to actual response format
        expect(response.body).toHaveProperty('episode');
        expect(response.body.episode).toHaveProperty('pattern_ledger');
        expect(response.body.episode).toHaveProperty('earpiece_feed');
    });
});
