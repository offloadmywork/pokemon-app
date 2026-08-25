import { describe, expect, it } from 'vitest';
import { createSessionToken, verifySessionToken } from './sessionTokens';

// BDD: Server-bound identity — the server, not the client, decides who a
// request is acting as. Tokens are signed with a server secret and expire.

const SECRET = 'test-secret';
const NOW = 1756100000000; // fixed ms timestamp for deterministic tests

describe('Session tokens', () => {
  it('issues a token that verifies back to the same user id', async () => {
    const token = await createSessionToken('user-1', SECRET, { now: NOW });
    expect(typeof token).toBe('string');
    expect(token).toContain('.');

    const session = await verifySessionToken(token, SECRET, { now: NOW + 1000 });
    expect(session).toEqual({ userId: 'user-1', expiresAt: NOW + 7 * 24 * 60 * 60 * 1000 });
  });

  it('embeds issued-at and expiry from the provided clock', async () => {
    const token = await createSessionToken('user-1', SECRET, { now: NOW, ttlSeconds: 60 });
    const [payloadB64] = token.split('.');
    const claims = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
    expect(claims.iat).toBe(Math.floor(NOW / 1000));
    expect(claims.exp).toBe(Math.floor(NOW / 1000) + 60);
  });

  it('rejects a payload tampered after signing', async () => {
    const token = await createSessionToken('user-1', SECRET, { now: NOW });
    const [, signature] = token.split('.');
    // A valid-base64url payload claiming a different user.
    const forgedPayload = btoa(JSON.stringify({ sub: 'attacker', iat: 0, exp: Math.floor(NOW / 1000) + 9999 }))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const session = await verifySessionToken(`${forgedPayload}.${signature}`, SECRET, { now: NOW + 1 });
    expect(session).toBeNull();
  });

  it('rejects a token signed with the wrong secret', async () => {
    const token = await createSessionToken('user-1', SECRET, { now: NOW });
    const session = await verifySessionToken(token, 'other-secret', { now: NOW + 1 });
    expect(session).toBeNull();
  });

  it('rejects an expired token but accepts it just before expiry', async () => {
    const token = await createSessionToken('user-1', SECRET, { now: NOW, ttlSeconds: 60 });
    const expired = await verifySessionToken(token, SECRET, { now: NOW + 61_000 });
    expect(expired).toBeNull();

    const stillValid = await verifySessionToken(token, SECRET, { now: NOW + 59_000 });
    expect(stillValid?.userId).toBe('user-1');
  });

  it('rejects malformed tokens without throwing', async () => {
    await expect(verifySessionToken('', SECRET)).resolves.toBeNull();
    await expect(verifySessionToken('not-a-token', SECRET)).resolves.toBeNull();
    await expect(verifySessionToken('a.b.c', SECRET)).resolves.toBeNull();
    await expect(verifySessionToken('.signature-only', SECRET)).resolves.toBeNull();
    await expect(verifySessionToken(null, SECRET)).resolves.toBeNull();
  });

  it('refuses to mint tokens without a user id, secret, or valid ttl', async () => {
    await expect(createSessionToken('', SECRET, { now: NOW })).rejects.toThrow(TypeError);
    await expect(createSessionToken(null, SECRET, { now: NOW })).rejects.toThrow(TypeError);
    await expect(createSessionToken('user-1', '', { now: NOW })).rejects.toThrow(TypeError);
    await expect(createSessionToken('user-1', SECRET, { now: NOW, ttlSeconds: 0 })).rejects.toThrow(TypeError);
  });
});
