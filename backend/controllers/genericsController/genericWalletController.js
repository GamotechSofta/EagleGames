import dotenv from 'dotenv';
import {
    ensureWalletForPlayer,
    executeGenericDebit,
    executeGenericCredit,
} from '../../services/genericWalletService.js';

dotenv.config();

const DEFAULT_PARTNER_TOKEN = 'partner-token';
const DEFAULT_CURRENCY = 'INR';

const getPartnerToken = () =>
    String(process.env.PARTNER_TOKEN || DEFAULT_PARTNER_TOKEN).trim();

const parseBearerToken = (authorizationHeader) => {
    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
        return '';
    }
    return authorizationHeader.slice(7).trim();
};

const parsePositiveAmount = (amount) => {
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return null;
    }
    return parsed;
};

const readPlayerIdFromRequest = (req) => {
    const fromParams = req.params?.playerId;
    const fromBody = req.body?.playerId;
    const fromQuery = req.query?.playerId;
    const raw = fromParams || fromBody || fromQuery || '';
    return String(raw).trim();
};

export const verifyGenericPartnerAuth = (req, res, next) => {
    const expected = getPartnerToken();
    const token = parseBearerToken(req.headers.authorization);
    if (!token || token !== expected) {
        const body = { success: false, error: 'Unauthorized' };
        if (process.env.NODE_ENV !== 'production') {
            body.hint =
                'Send header: Authorization: Bearer <exact PARTNER_TOKEN from backend .env>. Browser address bar cannot send this header.';
        }
        return res.status(401).json(body);
    }
    next();
};

export const getGenericWalletBalance = async (req, res) => {
    try {
        const playerId = readPlayerIdFromRequest(req);
        if (!playerId) {
            return res.status(400).json({
                success: false,
                error: 'playerId is required',
            });
        }

        const { user, wallet } = await ensureWalletForPlayer(playerId);

        if (!wallet) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                playerId,
                balance: wallet.balance,
                currency: DEFAULT_CURRENCY,
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error',
        });
    }
};

export const genericWalletDebit = async (req, res) => {
    try {
        const { amount, transactionId, roundId, game, betNumber } = req.body || {};
        const playerId = readPlayerIdFromRequest(req);
        const validAmount = parsePositiveAmount(amount);

        if (!playerId || !transactionId || !String(transactionId).trim() || !validAmount) {
            return res.status(400).json({
                success: false,
                error: 'playerId, transactionId, and valid amount are required',
            });
        }

        const result = await executeGenericDebit({
            playerId,
            amount: validAmount,
            transactionId,
            roundId,
            game,
            betNumber,
        });
        return res.status(result.status).json(result.body);
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error',
        });
    }
};

export const genericWalletCredit = async (req, res) => {
    try {
        const { amount, transactionId, roundId } = req.body || {};
        const playerId = readPlayerIdFromRequest(req);
        const validAmount = parsePositiveAmount(amount);

        if (!playerId || !transactionId || !String(transactionId).trim() || !validAmount) {
            return res.status(400).json({
                success: false,
                error: 'playerId, transactionId, and valid amount are required',
            });
        }

        const result = await executeGenericCredit({
            playerId,
            amount: validAmount,
            transactionId,
            roundId,
        });
        return res.status(result.status).json(result.body);
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error',
        });
    }
};
