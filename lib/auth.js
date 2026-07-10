// Shared auth helpers for the admin API (signed, HttpOnly session cookie).
import crypto from 'node:crypto';

const COOKIE = 'admin_session';
const MAX_AGE = 60 * 60 * 8; // 8 hours

function secret() {
    // ADMIN_SECRET is preferred; fall back to the password so a single env var works.
    return process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || '';
}

function expectedToken() {
    return crypto.createHmac('sha256', secret()).update('admin-v1').digest('base64url');
}

export function makeSetCookie() {
    const token = expectedToken();
    return `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${MAX_AGE}`;
}

export function clearCookie() {
    return `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export function isAuthed(req) {
    const raw = req.headers.cookie || '';
    const match = raw.split(/;\s*/).find((c) => c.startsWith(COOKIE + '='));
    if (!match) return false;
    const token = match.slice(COOKIE.length + 1);
    const expected = expectedToken();
    if (token.length !== expected.length) return false;
    try {
        return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
    } catch (_) {
        return false;
    }
}

export function passwordMatches(candidate) {
    const real = process.env.ADMIN_PASSWORD || '';
    if (!real) return false;
    const a = Buffer.from(String(candidate));
    const b = Buffer.from(real);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
}

// Read a JSON body whether or not the runtime pre-parsed it.
export async function readJson(req) {
    if (req.body && typeof req.body === 'object') return req.body;
    if (typeof req.body === 'string') {
        try { return JSON.parse(req.body); } catch (_) { return {}; }
    }
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    if (!chunks.length) return {};
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch (_) { return {}; }
}
