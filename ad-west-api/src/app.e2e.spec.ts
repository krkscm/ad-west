const BASE_URL = 'http://localhost:3001/api/v1';

describe('DB smoke flow', () => {
  it('logs in as admin and reaches the DB-backed readiness endpoint', async () => {
    const captchaResponse = await fetch(`${BASE_URL}/auth/captcha`);
    expect(captchaResponse.ok).toBe(true);

    const captchaBody = (await captchaResponse.json()) as { captchaToken: string; challenge: string };
    const captchaAnswer = evaluateChallenge(captchaBody.challenge);

    const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        identifier: 'super.admin@adwest.local',
        password: 'SuperAdmin@123',
        captchaToken: captchaBody.captchaToken,
        captchaAnswer,
      }),
    });

    expect(loginResponse.ok).toBe(true);
    const loginBody = (await loginResponse.json()) as { accessToken: string };
    expect(loginBody.accessToken).toBeDefined();

    const readinessResponse = await fetch(`${BASE_URL}/core/persistence/readiness`, {
      headers: {
        Authorization: `Bearer ${loginBody.accessToken}`,
      },
    });

    expect(readinessResponse.ok).toBe(true);
    const readinessBody = (await readinessResponse.json()) as {
      coreBusinessStore: 'in-memory' | 'db';
      authStoreMode: 'in-memory' | 'db';
      blockers: string[];
    };

    expect(readinessBody.coreBusinessStore).toBe('db');
    expect(readinessBody.authStoreMode).toBe('db');
    expect(Array.isArray(readinessBody.blockers)).toBe(true);

    const zonesResponse = await fetch(`${BASE_URL}/org/zones`, {
      headers: {
        Authorization: `Bearer ${loginBody.accessToken}`,
      },
    });

    expect(zonesResponse.ok).toBe(true);
    const zonesBody = (await zonesResponse.json()) as Array<{ id: string; name: string; code?: string }>;
    expect(zonesBody.length).toBeGreaterThan(0);
    expect(zonesBody[0].name).toBeDefined();
  });
});

function evaluateChallenge(challenge: string): string {
  const match = challenge.match(/^(\d+)\s*([+-])\s*(\d+)$/);
  if (!match) {
    throw new Error(`Unexpected captcha challenge: ${challenge}`);
  }

  const left = Number(match[1]);
  const operator = match[2];
  const right = Number(match[3]);

  return operator === '+' ? String(left + right) : String(left - right);
}

