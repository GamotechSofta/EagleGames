import { verifyUserToken } from '../utils/userJwt.js';

/**
 * Bearer from Authorization header, or `token` / `accessToken` in JSON body (some proxies strip headers).
 */
export function extractUserBearerToken(req) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const fromHeader = authHeader.slice(7).trim();
        if (fromHeader) return fromHeader;
    }
    const body = req.body;
    if (body && typeof body === 'object') {
        const fromBody = body.token ?? body.accessToken ?? body.playerToken;
        if (fromBody != null && String(fromBody).trim()) {
            return String(fromBody).trim();
        }
    }
    return '';
}

/**
 * Middleware to verify player authentication via JWT.
 * Expects: Authorization: Bearer <token> (or token in POST body as fallback).
 * On success sets req.userId and calls next(). On failure returns 401.
 */
export const verifyUser = async (req, res, next) => {
    try {
        const token = extractUserBearerToken(req);
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required. Please log in.',
                code: 'AUTH_REQUIRED',
            });
        }
        const payload = verifyUserToken(token);
        const userId = payload.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token.',
                code: 'AUTH_REQUIRED',
            });
        }
        req.userId = userId;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Session expired. Please log in again.',
                code: 'TOKEN_EXPIRED',
            });
        }
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token. Please log in again.',
            code: 'AUTH_REQUIRED',
        });
    }
};

/**
 * If Authorization Bearer is a valid user JWT, sets req.userId; otherwise continues without it.
 * Use for routes that behave differently for logged-in users (e.g. payment config).
 */
export const optionalVerifyUser = async (req, res, next) => {
    try {
        const token = extractUserBearerToken(req);
        if (!token) {
            return next();
        }
        try {
            const payload = verifyUserToken(token);
            if (payload.userId) {
                req.userId = payload.userId;
            }
        } catch {
            // ignore invalid token for optional auth
        }
        next();
    } catch {
        next();
    }
};
