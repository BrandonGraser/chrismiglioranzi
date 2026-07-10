import { passwordMatches, makeSetCookie, readJson } from '../lib/auth.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!process.env.ADMIN_PASSWORD) {
        return res.status(500).send('ADMIN_PASSWORD is not set in the environment.');
    }

    const { password } = await readJson(req);
    if (!passwordMatches(password)) {
        return res.status(401).json({ error: 'Incorrect password' });
    }

    res.setHeader('Set-Cookie', makeSetCookie());
    return res.status(200).json({ ok: true });
}
