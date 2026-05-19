/**
 * Partner Bearer token from backend/.env — never expose to the frontend.
 */
export function getPartnerToken() {
    return String(process.env.PARTNER_TOKEN || '').trim();
}

/** Tokens accepted on /api/v1/generics/wallet/* (full value + comma-separated parts). */
export function getAllowedPartnerTokens() {
    const raw = getPartnerToken();
    const set = new Set();
    if (!raw) return set;
    set.add(raw);
    for (const part of raw.split(',')) {
        const t = part.trim();
        if (t) set.add(t);
    }
    return set;
}

export function isPartnerTokenValid(received) {
    const token = String(received || '').trim();
    if (!token) return false;
    return getAllowedPartnerTokens().has(token);
}
