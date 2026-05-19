import jwt from 'jsonwebtoken';

const DEFAULT_EMBED_HOSTS = [
    'roulettegame.craftdigital.in',
    'aviatorgame.craftdigital.in',
    'funtimergame.craftdigital.in',
];

export function getEmbedJwtSecret() {
    return (
        process.env.EMBED_FRAME_SECRET ||
        process.env.USER_JWT_SECRET ||
        process.env.JWT_SECRET ||
        ''
    ).trim();
}

export function getAllowedEmbedHosts() {
    const raw = process.env.GAME_EMBED_HOST_WHITELIST || '';
    const fromEnv = raw
        .split(',')
        .map((h) => h.trim().toLowerCase())
        .filter(Boolean);
    return new Set([...DEFAULT_EMBED_HOSTS, ...fromEnv]);
}

export function isHostAllowedForEmbed(url) {
    try {
        const host = new URL(String(url).trim()).hostname.toLowerCase();
        const allowed = getAllowedEmbedHosts();
        if (allowed.has(host)) return true;
        for (const entry of allowed) {
            if (host === entry || host.endsWith(`.${entry}`)) return true;
        }
        return false;
    } catch {
        return false;
    }
}

export function hostRequiresEmbedProxy(url) {
    return isHostAllowedForEmbed(url);
}

/** Short-lived token for GET /games/embed/frame (player must match launch). */
export function signEmbedSessionToken(userId, targetUrl) {
    const secret = getEmbedJwtSecret();
    if (!secret) throw new Error('EMBED_FRAME_SECRET or USER_JWT_SECRET is required');
    return jwt.sign(
        {
            sub: String(userId),
            url: String(targetUrl).trim(),
        },
        secret,
        { expiresIn: '20m' }
    );
}

export function verifyEmbedSessionToken(token, targetUrl) {
    const secret = getEmbedJwtSecret();
    if (!secret) return { ok: false, error: 'Embed secret not configured' };
    try {
        const payload = jwt.verify(String(token).trim(), secret);
        const url = String(targetUrl || '').trim();
        if (payload.url !== url) {
            return { ok: false, error: 'URL does not match session token' };
        }
        if (!isHostAllowedForEmbed(url)) {
            return { ok: false, error: 'Host not allowed for embed proxy' };
        }
        return { ok: true, userId: payload.sub };
    } catch (err) {
        return { ok: false, error: err.message || 'Invalid session token' };
    }
}

export function buildEmbedProxyPath(targetUrl, sessionToken) {
    const q = new URLSearchParams({
        url: String(targetUrl).trim(),
        sessionToken: String(sessionToken).trim(),
    });
    return `/api/v1/games/embed/frame?${q.toString()}`;
}
