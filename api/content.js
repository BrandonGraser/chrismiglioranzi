import { kv } from '@vercel/kv';
import { isAuthed, readJson } from '../lib/auth.js';

const KEY = 'site:content';

// Fields the client is allowed to change, with per-field limits.
const ALLOWED = {
    nameFirst: { type: 'text', max: 80 },
    nameLast: { type: 'text', max: 80 },
    bio: { type: 'html', max: 2000 },
    stat1Value: { type: 'text', max: 24 },
    stat1Label: { type: 'text', max: 60 },
    stat2Value: { type: 'text', max: 24 },
    stat2Label: { type: 'text', max: 60 },
    stat3Value: { type: 'text', max: 24 },
    stat3Label: { type: 'text', max: 60 },
    email: { type: 'text', max: 160 },
};

const BIO_TAGS = ['strong', 'b', 'em', 'i', 'br'];

// Keep a tiny set of formatting tags for the bio; strip everything else
// (attributes, scripts, event handlers) so stored HTML is safe to inject.
function sanitizeBio(value) {
    return String(value)
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<(\/?)([a-zA-Z0-9]+)[^>]*?>/g, (full, slash, tag) => {
            const t = tag.toLowerCase();
            if (!BIO_TAGS.includes(t)) return '';
            return `<${slash}${t}>`;
        });
}

function sanitizeText(value) {
    return String(value).replace(/<[^>]*>/g, '');
}

export default async function handler(req, res) {
    if (req.method === 'GET') {
        res.setHeader('Cache-Control', 'no-store');
        try {
            const data = (await kv.get(KEY)) || {};
            return res.status(200).json(data);
        } catch (_) {
            // storage not configured yet — site falls back to its built-in defaults
            return res.status(200).json({});
        }
    }

    if (req.method === 'POST') {
        if (!isAuthed(req)) return res.status(401).json({ error: 'Not authorized' });

        const body = await readJson(req);
        const clean = {};
        for (const [key, rule] of Object.entries(ALLOWED)) {
            if (!(key in body)) continue;
            let val = rule.type === 'html' ? sanitizeBio(body[key]) : sanitizeText(body[key]);
            val = val.slice(0, rule.max).trim();
            clean[key] = val;
        }

        try {
            const existing = (await kv.get(KEY)) || {};
            const merged = { ...existing, ...clean };
            await kv.set(KEY, merged);
            return res.status(200).json({ ok: true, content: merged });
        } catch (_) {
            return res.status(503).send('Storage is not configured. Connect a Vercel KV store.');
        }
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
}
