'use strict';
const crypto = require('node:crypto');
const LANGUAGES = new Set(['angielski', 'hiszpański', 'włoski', 'chiński']);
const PREFIX = 'linguai-learner-v1.';

// The identity comes from a server-signed, short-lived capability, not an LLM field.
// The backend service secret is still required separately by server.js.
function verifyContext(token, secret, scope, now = Math.floor(Date.now()/1000)) {
  if (typeof token !== 'string' || token.length > 2048) throw new Error('Invalid context');
  const parts = token.split('.');
  if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0]) || !/^[A-Za-z0-9_-]{43}$/.test(parts[1])) throw new Error('Invalid context');
  const expected = crypto.createHmac('sha256',secret).update(PREFIX+parts[0]).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(parts[1]))) throw new Error('Invalid context');
  const claims = JSON.parse(Buffer.from(parts[0],'base64url').toString('utf8'));
  if (!claims || claims.v !== 1 || claims.iss !== 'https://linguai.pl' || claims.aud !== 'linguai-memory' || claims.scope !== scope ||
      !Number.isSafeInteger(claims.sub) || claims.sub <= 0 || !LANGUAGES.has(claims.language) ||
      !Number.isSafeInteger(claims.iat) || !Number.isSafeInteger(claims.exp) ||
      claims.iat > now + 30 || claims.exp <= now || claims.exp <= claims.iat ||
      claims.exp - claims.iat > (scope === 'memory:get' ? 120 : 7200)) throw new Error('Invalid context');
  return claims;
}
module.exports = {verifyContext};
