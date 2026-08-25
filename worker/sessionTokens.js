// Stateless signed session tokens (HMAC-SHA256) binding a user id to an expiry.
//
// Why: the API historically trusted a client-supplied `user_id`, which means any
// caller could act as any player. These tokens let the server issue an identity
// (`POST /api/session`) and verify it on protected routes without server-side
// session storage (Workers-friendly, Web Crypto only).

const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function base64UrlEncode(bytes) {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return textDecoder.decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

async function importSigningKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

function signaturesMatch(expectedB64, actualB64) {
  if (expectedB64.length !== actualB64.length) {
    // Still burn comparable time so the length check is not a timing oracle.
    let diff = expectedB64.length ^ actualB64.length;
    for (let i = 0; i < Math.min(expectedB64.length, actualB64.length); i += 1) {
      diff |= expectedB64.charCodeAt(i) ^ actualB64.charCodeAt(i);
    }
    return false;
  }
  let diff = 0;
  for (let i = 0; i < expectedB64.length; i += 1) {
    diff |= expectedB64.charCodeAt(i) ^ actualB64.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Create a signed session token for a user.
 * @param {string} userId
 * @param {string} secret Server-side signing secret (env.SESSION_SECRET)
 * @param {{ now?: number, ttlSeconds?: number }} [options]
 * @returns {Promise<string>} "<base64url payload>.<base64url signature>"
 */
export async function createSessionToken(userId, secret, options = {}) {
  if (!userId || typeof userId !== 'string') {
    throw new TypeError('userId is required');
  }
  if (!secret || typeof secret !== 'string') {
    throw new TypeError('secret is required');
  }
  const nowSeconds = Math.floor((options.now ?? Date.now()) / 1000);
  const ttlSeconds = options.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
    throw new TypeError('ttlSeconds must be a positive number');
  }

  const payloadJson = JSON.stringify({ sub: userId, iat: nowSeconds, exp: nowSeconds + ttlSeconds });
  const payload = base64UrlEncode(textEncoder.encode(payloadJson));
  const key = await importSigningKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, textEncoder.encode(payload));
  return `${payload}.${base64UrlEncode(new Uint8Array(signature))}`;
}

/**
 * Verify a signed session token.
 * @param {string} token
 * @param {string} secret
 * @param {{ now?: number }} [options]
 * @returns {Promise<{ userId: string, expiresAt: number } | null>} null when invalid/expired
 */
export async function verifySessionToken(token, secret, options = {}) {
  try {
    if (!token || typeof token !== 'string' || !secret) return null;

    const separatorIndex = token.indexOf('.');
    if (separatorIndex <= 0) return null;
    const payload = token.slice(0, separatorIndex);
    const signature = token.slice(separatorIndex + 1);
    if (!payload || !signature || signature.includes('.')) return null;

    const key = await importSigningKey(secret);
    const expectedSignature = await crypto.subtle.sign('HMAC', key, textEncoder.encode(payload));
    const expectedB64 = base64UrlEncode(new Uint8Array(expectedSignature));
    if (!signaturesMatch(expectedB64, signature)) return null;

    const claims = JSON.parse(base64UrlDecode(payload));
    if (!claims || typeof claims.sub !== 'string' || !claims.sub) return null;

    const expiresAtMs = Number(claims.exp) * 1000;
    const nowMs = options.now ?? Date.now();
    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= nowMs) return null;

    return { userId: claims.sub, expiresAt: expiresAtMs };
  } catch {
    return null;
  }
}
