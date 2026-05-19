const DEFAULT_PARTNER_TOKEN = 'partner-token';

const pickLaunchApiKey = () =>
    String(process.env.GAME_LAUNCH_API_KEY || process.env.GAME_API_KEY || process.env.API_KEY || '').trim();

const pickLaunchApiSecret = () =>
    String(
        process.env.GAME_LAUNCH_API_SECRET || process.env.GAME_API_SECRET || process.env.API_SECRET || ''
    ).trim();

/**
 * Fail fast in production when game launch / partner wallet env is unsafe or missing.
 */
export function validateProductionEnv() {
    const isProduction = process.env.NODE_ENV === 'production';
    if (!isProduction) {
        const token = String(process.env.PARTNER_TOKEN || '').trim();
        if (!token || token === DEFAULT_PARTNER_TOKEN) {
            console.warn(
                '[env] PARTNER_TOKEN is unset or default "partner-token". Set a strong token before production.'
            );
        }
        const apiKey = pickLaunchApiKey();
        const apiSecret = pickLaunchApiSecret();
        if (!apiKey || !apiSecret) {
            console.warn('[env] GAME_LAUNCH_API_KEY / GAME_LAUNCH_API_SECRET (or API_KEY / API_SECRET) not set.');
        }
        return;
    }

    const missing = [];
    if (!String(process.env.MONGODB_URI || process.env.MONGO_URI || '').trim()) {
        missing.push('MONGODB_URI');
    }
    if (!String(process.env.USER_JWT_SECRET || process.env.JWT_SECRET || '').trim()) {
        missing.push('USER_JWT_SECRET or JWT_SECRET');
    }
    if (!String(process.env.ALLOWED_ORIGINS || '').trim()) {
        missing.push('ALLOWED_ORIGINS');
    }
    if (!String(process.env.GAME_LAUNCH_URL || '').trim()) {
        missing.push('GAME_LAUNCH_URL');
    }
    if (!pickLaunchApiKey()) {
        missing.push('GAME_LAUNCH_API_KEY or API_KEY');
    }
    if (!pickLaunchApiSecret()) {
        missing.push('GAME_LAUNCH_API_SECRET or API_SECRET');
    }

    const partnerToken = String(process.env.PARTNER_TOKEN || '').trim();
    if (!partnerToken) {
        missing.push('PARTNER_TOKEN');
    } else if (partnerToken === DEFAULT_PARTNER_TOKEN) {
        throw new Error(
            'PARTNER_TOKEN must not be the default "partner-token" in production. Set a strong random value in backend/.env.'
        );
    }

    if (missing.length > 0) {
        throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
    }
}
