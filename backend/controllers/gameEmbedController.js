import axios from 'axios';
import { verifyEmbedSessionToken } from '../utils/gameEmbedFrame.js';

const STRIP_RESPONSE_HEADERS = new Set([
    'x-frame-options',
    'content-security-policy',
    'content-security-policy-report-only',
    'cross-origin-opener-policy',
    'cross-origin-embedder-policy',
]);

/**
 * GET /api/v1/games/embed/frame?url=&sessionToken=
 * Reverse-proxy partner game HTML so it can load in our iframe (whitelisted hosts only).
 */
export const embedGameFrame = async (req, res) => {
    try {
        const targetUrl = String(req.query.url || '').trim();
        const sessionToken = String(req.query.sessionToken || '').trim();

        if (!targetUrl || !sessionToken) {
            return res.status(400).json({
                success: false,
                message: 'url and sessionToken query parameters are required',
            });
        }

        const verified = verifyEmbedSessionToken(sessionToken, targetUrl);
        if (!verified.ok) {
            return res.status(401).json({
                success: false,
                message: verified.error || 'Invalid embed session',
            });
        }

        const upstream = await axios.get(targetUrl, {
            responseType: 'stream',
            timeout: 20000,
            maxRedirects: 5,
            validateStatus: (s) => s >= 200 && s < 400,
            headers: {
                'User-Agent': 'EagleGames-EmbedProxy/1.0',
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
        });

        res.status(upstream.status);
        for (const [key, value] of Object.entries(upstream.headers)) {
            if (STRIP_RESPONSE_HEADERS.has(key.toLowerCase())) continue;
            if (key.toLowerCase() === 'transfer-encoding') continue;
            res.setHeader(key, value);
        }
        res.removeHeader('X-Frame-Options');
        res.setHeader(
            'Content-Security-Policy',
            "frame-ancestors *; default-src * 'unsafe-inline' 'unsafe-eval' data: blob: https: http:;"
        );

        upstream.data.pipe(res);
    } catch (error) {
        const status = error?.response?.status || 502;
        return res.status(status).json({
            success: false,
            message: error.message || 'Failed to load game frame',
        });
    }
};
