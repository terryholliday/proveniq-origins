
import { PrismaClient } from '@prisma/client';

const BASE_URL = 'http://localhost:3011/api';
const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting Season 20 Engine Verification...');

    // 1. Create Test User
    const email = `test-omg-${Date.now()}@test.com`;
    const password = 'password123';
    console.log(`\n👤 Creating test user: ${email}`);

    const signupRes = await fetch(`${BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name: 'Test Subject' }),
    });

    if (!signupRes.ok) {
        const err = await signupRes.text();
        console.error('❌ Signup failed:', err);
        process.exit(1);
    }

    // Get cookie from response headers? 
    // fetch in Node doesn't handle cookies automatically like browser.
    // The signup response sets a cookie. We need to grab it.
    const cookie = signupRes.headers.get('set-cookie');
    console.log('🍪 Auth Cookie:', cookie ? 'Received' : 'Missing');

    // Also grabbing token from user in DB or just use cookie if fetch supports it manually
    // Using cookie in subsequent requests
    const headers = {
        'Content-Type': 'application/json',
        'Cookie': cookie || '',
    } as any;

    // 2. Enable AI Consent (via Prisma backdoor)
    console.log('\n🔓 Enabling AI Consent in DB...');
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error('User not found in DB');

    await prisma.user.update({
        where: { id: user.id },
        data: { aiConsent: true }
    });
    console.log('✅ AI Consent Enabled');

    // 3. Start Interview
    console.log('\n🎬 Starting Interview Session...');
    const startRes = await fetch(`${BASE_URL}/ai/interview/start`, {
        method: 'POST',
        headers,
    });

    if (!startRes.ok) {
        console.error('❌ Start failed:', await startRes.text());
        process.exit(1);
    }
    const startData = await startRes.json() as any;
    console.log('✅ Session Started:', startData);

    const sessionId = startData.session_id;

    // 4. Activate Kernel
    console.log('\n🔫 Activating PRECISION Kernel...');
    const activateRes = await fetch(`${BASE_URL}/ai/interview/turn`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            session_id: sessionId,
            message: '/activate PRECISION'
        }),
    });
    if (!activateRes.ok) {
        console.error('❌ Activation Request Failed:', await activateRes.text());
    } else {
        const activateData = await activateRes.json() as any;
        console.log('🤖 Ori Response:', activateData.response);

        if (!activateData.response) {
            console.error('❌ Response field missing. Full data:', JSON.stringify(activateData, null, 2));
        } else if (!activateData.response.includes('PRECISION')) {
            console.warn('⚠️ Warning: Activation message didn\'t confirm PRECISION');
        }
    }

    // 5. Test Evasion Scenario
    console.log('\n🧪 Testing Evasion Scenario...');
    const evasionMsg = "It was a complicated time for me.";
    console.log(`User: "${evasionMsg}"`);

    const turnRes = await fetch(`${BASE_URL}/ai/interview/turn`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            session_id: sessionId,
            message: evasionMsg
        }),
    });

    const turnData = await turnRes.json() as any;
    console.log('🤖 Ori Response:', turnData.response);
    console.log('👂 Earpiece Feed (Hidden):', turnData.debug_earpiece_feed);

    // Verification checks
    // Verification checks (v3.5 Schema)
    if (turnData.debug_earpiece_feed && turnData.debug_earpiece_feed.required_strategy === 'PRESS') {
        console.log('✅ VERIFIED: Strategy is PRESS');

        if (turnData.debug_earpiece_feed.suggested_device === 'DEFINITION_CHALLENGE') {
            console.log('✅ VERIFIED: Device is DEFINITION_CHALLENGE');
        } else {
            console.warn(`⚠️ Warning: Expected DEFINITION_CHALLENGE, got ${turnData.debug_earpiece_feed.suggested_device}`);
        }
    } else {
        console.log(`❌ FAILED: Wrong strategy selected. Expected PRESS, got ${turnData.debug_earpiece_feed?.required_strategy}`);
    }

    if (turnData.debug_earpiece_feed && turnData.debug_earpiece_feed.tone.includes('skeptical')) {
        console.log('✅ VERIFIED: Tone is skeptical_precision');
    } else {
        console.log('❌ FAILED: Wrong tone selected');
    }

    console.log('\n✅ Verification Complete.');
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
