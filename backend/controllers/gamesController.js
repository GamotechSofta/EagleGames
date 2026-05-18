import Game from '../models/games/games.js';
import axios from 'axios';
import dotenv from 'dotenv';
import { getPlayerGameBetHistory, getAdminGameBetHistory } from '../services/gameBetHistoryService.js';

dotenv.config();

/** CraftDigital partner session launch; override with `GAME_LAUNCH_URL` in `.env`. */
const DEFAULT_GAME_LAUNCH_URL = 'https://gamotechdashboardapi.craftdigital.in/api/partner/session/launch';

const resolveGameLaunchUrl = () => {
    const fromEnv = process.env.GAME_LAUNCH_URL && String(process.env.GAME_LAUNCH_URL).trim();
    return fromEnv || DEFAULT_GAME_LAUNCH_URL;
};

/** Prefer `GAME_LAUNCH_API_*` so `API_KEY` is not confused with Cloudinary etc. */
const getLaunchApiCredentials = () => {
    const apiKey = String(
        process.env.GAME_LAUNCH_API_KEY || process.env.GAME_API_KEY || process.env.API_KEY || ''
    ).trim();
    const apiSecret = String(
        process.env.GAME_LAUNCH_API_SECRET || process.env.GAME_API_SECRET || process.env.API_SECRET || ''
    ).trim();
    return { apiKey, apiSecret };
};

const extractLaunchUrl = (d) => {
    if (!d || typeof d !== 'object') return null;
    const nested = d.data;
    const deep = nested && typeof nested === 'object' ? nested.data : null;
    return (
        d.launchUrl
        || (nested && nested.launchUrl)
        || (deep && deep.launchUrl)
        || (d.result && d.result.launchUrl)
        || d.url
        || d.gameUrl
        || d.sessionUrl
        || d.redirectUrl
        || d.link
        || (nested && nested.url)
        || (nested && nested.sessionUrl)
        || (nested && nested.gameUrl)
        || (deep && deep.url)
        || null
    );
};

/** Partner may forbid embedding (X-Frame-Options / CSP); respect explicit flags when present. */
const deriveEmbedAllowed = (partnerBody) => {
    if (!partnerBody || typeof partnerBody !== 'object') return true;
    const d = partnerBody.data;
    const candidates = [
        partnerBody.embedAllowed,
        partnerBody.iframeAllowed,
        partnerBody.allowIframe,
        d && d.embedAllowed,
        d && d.iframeAllowed,
        partnerBody.game && partnerBody.game.embedAllowed,
    ];
    for (const v of candidates) {
        if (v === false || v === 'false' || v === 0 || v === '0') return false;
        if (v === true || v === 'true' || v === 1 || v === '1') return true;
    }
    return true;
};

/**
 * Maps your catalog `gameCode` → code CraftDigital expects in the session launch body.
 * Set in `.env` as JSON, e.g. GAME_PARTNER_CODE_MAP={"FUNTIMER":"FUN_TIMER","ROULETTE":"EURO_ROULETTE"}
 * (use exact strings from the Gamotech / CraftDigital dashboard for your tenant.)
 */
const getPartnerGameCodeFromEnvMap = (catalogCode) => {
    const raw = process.env.GAME_PARTNER_CODE_MAP;
    if (!raw || !String(raw).trim()) return '';
    try {
        const obj = JSON.parse(String(raw).trim());
        if (!obj || typeof obj !== 'object') return '';
        const k = String(catalogCode || '').trim().toUpperCase();
        const v = obj[k];
        return v != null && String(v).trim() ? String(v).trim() : '';
    } catch {
        return '';
    }
};

const toBoolean = (value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true') return true;
        if (normalized === 'false') return false;
    }
    return Boolean(value);
};

const pickGamePayload = (body = {}) => {
    const payload = {};

    if (body.name !== undefined) payload.name = String(body.name).trim();
    if (body.gameCode !== undefined) payload.gameCode = String(body.gameCode).trim().toUpperCase();
    if (body.image !== undefined) payload.image = String(body.image).trim();
    if (body.category !== undefined) payload.category = String(body.category).trim();
    if (body.provider !== undefined) payload.provider = String(body.provider).trim();
    if (body.partnerGameCode !== undefined) {
        const v = String(body.partnerGameCode).trim().toUpperCase();
        payload.partnerGameCode = v;
    }
    if (body.isActive !== undefined) payload.isActive = toBoolean(body.isActive);
    if (body.order !== undefined) payload.order = Number(body.order);

    return payload;
};

const validateGamePayload = (payload, { partial = false } = {}) => {
    const requiredFields = ['name', 'gameCode', 'image'];
    if (!partial) {
        for (const field of requiredFields) {
            if (!payload[field]) {
                return `${field} is required`;
            }
        }
    }

    if (payload.order !== undefined && !Number.isFinite(payload.order)) {
        return 'order must be a valid number';
    }

    return null;
};

export const getGames = async (req, res) => {
    try {
        const query = {};
        if ((req.query.includeInactive || '').toString() !== 'true') {
            query.isActive = { $ne: false };
        }

        const games = await Game.find(query).sort({ order: 1, name: 1 }).lean();
        return res.status(200).json({ success: true, data: games });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const getAllGamesForAdmin = async (_req, res) => {
    try {
        const games = await Game.find().sort({ order: 1, name: 1 }).lean();
        return res.status(200).json({ success: true, data: games });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const getGameByCode = async (req, res) => {
    try {
        const gameCode = String(req.params.gameCode || '').trim().toUpperCase();
        const includeInactive = (req.query.includeInactive || '').toString() === 'true';
        if (!gameCode) {
            return res.status(400).json({ success: false, message: 'gameCode is required' });
        }

        const query = includeInactive
            ? { gameCode }
            : { gameCode, isActive: { $ne: false } };
        const game = await Game.findOne(query).lean();
        if (!game) {
            return res.status(404).json({ success: false, message: 'Game not found' });
        }

        return res.status(200).json({ success: true, data: game });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const createGame = async (req, res) => {
    try {
        const payload = pickGamePayload(req.body);
        const validationError = validateGamePayload(payload);
        if (validationError) {
            return res.status(400).json({ success: false, message: validationError });
        }

        const game = await Game.create(payload);
        return res.status(201).json({ success: true, data: game });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: 'gameCode already exists' });
        }
        if (error.name === 'ValidationError') {
            return res.status(400).json({ success: false, message: error.message, errors: error.errors });
        }
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const updateGame = async (req, res) => {
    try {
        const payload = pickGamePayload(req.body);
        const validationError = validateGamePayload(payload, { partial: true });
        if (validationError) {
            return res.status(400).json({ success: false, message: validationError });
        }

        const game = await Game.findByIdAndUpdate(
            req.params.id,
            payload,
            { new: true, runValidators: true }
        );

        if (!game) {
            return res.status(404).json({ success: false, message: 'Game not found' });
        }

        return res.status(200).json({ success: true, data: game });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid game ID' });
        }
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: 'gameCode already exists' });
        }
        if (error.name === 'ValidationError') {
            return res.status(400).json({ success: false, message: error.message, errors: error.errors });
        }
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteGame = async (req, res) => {
    try {
        const game = await Game.findByIdAndDelete(req.params.id);
        if (!game) {
            return res.status(404).json({ success: false, message: 'Game not found' });
        }
        return res.status(200).json({ success: true, data: { id: game._id } });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid game ID' });
        }
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const launchGame = async (req, res) => {
    try {
        /**
         * Single launch path for every catalog game: POST CraftDigital session launch
         * (`GAME_LAUNCH_URL` / default). Only `gameCode` in the partner body changes
         * (via `partnerGameCode` / `GAME_PARTNER_CODE_MAP`). Response mirrors partner:
         * `data` is the raw partner JSON; `launchUrl` is duplicated at top level for the iframe.
         */
        const fromParams = String(req.params.gameCode || '').trim().toUpperCase();
        const fromBody =
            req.body?.gameCode != null ? String(req.body.gameCode).trim().toUpperCase() : '';
        if (fromBody && fromParams && fromBody !== fromParams) {
            return res.status(400).json({
                success: false,
                message: 'gameCode in the request body must match the gameCode in the URL',
            });
        }
        const gameCode = fromParams || fromBody;
        const externalPlayerId = String(
            req.userId || req.body?.externalPlayerId || req.body?.playerId || ''
        ).trim();

        if (!gameCode) {
            return res.status(400).json({ success: false, message: 'gameCode is required' });
        }
        if (!externalPlayerId) {
            return res.status(400).json({ success: false, message: 'externalPlayerId is required' });
        }

        const game = await Game.findOne({ gameCode, isActive: { $ne: false } }).lean();
        if (!game) {
            return res.status(404).json({ success: false, message: 'Game not found or inactive' });
        }

        const { apiKey, apiSecret } = getLaunchApiCredentials();
        if (!apiKey || !apiSecret) {
            return res.status(500).json({
                success: false,
                message: 'Game launch credentials are not configured',
            });
        }

        /** Code sent in partner payload: env map → Mongo `partnerGameCode` → catalog `gameCode`. */
        const partnerGameCode =
            getPartnerGameCodeFromEnvMap(gameCode)
            || String(game.partnerGameCode || '').trim().toUpperCase()
            || gameCode;
        const currency = String(req.body?.currency ?? process.env.CURRENCY ?? 'INR');
        const locale = String(req.body?.locale ?? 'en');
        const returnUrl =
            req.body && Object.prototype.hasOwnProperty.call(req.body, 'returnUrl')
                ? String(req.body.returnUrl)
                : (process.env.GAME_RETURN_URL !== undefined
                    ? String(process.env.GAME_RETURN_URL)
                    : '');

        const payload = {
            gameCode: partnerGameCode,
            externalPlayerId,
            currency,
            locale,
            returnUrl,
        };

        const launchUrlResolved = resolveGameLaunchUrl();
        const headers = {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'x-api-secret': apiSecret,
        };
        if (String(process.env.GAME_LAUNCH_BEARER || '').trim() === '1') {
            const partnerToken = String(process.env.PARTNER_TOKEN || '').trim();
            if (partnerToken) headers.Authorization = `Bearer ${partnerToken}`;
        }

        const response = await axios.post(launchUrlResolved, payload, {
            headers,
            timeout: 15000,
        });

        const partnerBody = response?.data;
        if (partnerBody && partnerBody.success === false) {
            return res.status(400).json({
                success: false,
                message: partnerBody.message || 'Partner rejected session launch',
                catalogGameCode: gameCode,
                partnerGameCodeSent: partnerGameCode,
                data: partnerBody,
            });
        }

        const launchUrl = extractLaunchUrl(partnerBody);
        if (!launchUrl) {
            return res.status(502).json({
                success: false,
                message:
                    'Partner API did not return a playable launch URL. '
                    + 'FUNTIMER / ROULETTE often use different codes than your Mongo `gameCode`. '
                    + 'Set `partnerGameCode` on each Game in admin, or `GAME_PARTNER_CODE_MAP` in .env (JSON catalogKey → partner code).',
                catalogGameCode: gameCode,
                partnerGameCodeSent: partnerGameCode,
                data: partnerBody,
            });
        }

        return res.status(200).json({
            success: true,
            gameCode,
            launchUrl,
            embedAllowed: deriveEmbedAllowed(partnerBody),
            data: partnerBody,
        });
    } catch (error) {
        const partnerError = error?.response?.data;
        const status = error?.response?.status || 500;
        return res.status(status).json({
            success: false,
            message: partnerError?.message || error.message || 'Game launch failed',
            error: partnerError || null,
        });
    }
};

/**
 * GET /games/my-bet-history?limit=100 — logged-in player's game bets (partner + roulette).
 */
export async function getMyGameBetHistory(req, res) {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const limit = Math.min(Number(req.query?.limit) || 100, 500);
        const gameCode = String(req.query?.gameCode || req.query?.game || '').trim();
        const data = await getPlayerGameBetHistory(userId, { limit, gameCode });
        return res.status(200).json({ success: true, data });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message || 'Failed to load game bet history' });
    }
}

/**
 * GET /games/admin-bet-history?userId=&limit=&page= — all players' game bets (admin).
 */
export async function getAdminGameBetHistoryHandler(req, res) {
    try {
        const limit = Number(req.query?.limit) || 50;
        const page = Number(req.query?.page) || 1;
        const userId = req.query?.userId ? String(req.query.userId).trim() : '';
        const gameCode = req.query?.gameCode ? String(req.query.gameCode).trim() : '';
        const status = req.query?.status ? String(req.query.status).trim().toLowerCase() : '';
        const startDate = req.query?.startDate ? String(req.query.startDate).trim() : '';
        const endDate = req.query?.endDate ? String(req.query.endDate).trim() : '';
        const result = await getAdminGameBetHistory({
            userId: userId || undefined,
            limit,
            page,
            gameCode: gameCode || undefined,
            status: status || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
        });
        return res.status(200).json({ success: true, ...result });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message || 'Failed to load admin game bet history' });
    }
}
