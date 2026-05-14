import Game from '../models/games/games.js';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

/** CraftDigital partner session launch (override with GAME_LAUNCH_URL in .env). */
const DEFAULT_GAME_LAUNCH_URL = 'https://gamotechdashboardapi.craftdigital.in/api/partner/session/launch';

const resolveGameLaunchUrl = () => {
    const fromEnv = process.env.GAME_LAUNCH_URL && String(process.env.GAME_LAUNCH_URL).trim();
    return fromEnv || DEFAULT_GAME_LAUNCH_URL;
};

/** Replace placeholders in catalog `launchUrl` (in-house static games). */
const resolveCatalogLaunchUrl = (template, externalPlayerId) => {
    const id = encodeURIComponent(String(externalPlayerId || '').trim());
    return String(template || '')
        .replace(/\{playerId\}/gi, id)
        .replace(/\{externalPlayerId\}/gi, id)
        .replace(/\{player\}/gi, id);
};

/**
 * Bundled static HTML under `GET /games-static/*` (see `backend/index.js`).
 * Keys must match Mongo `gameCode` for those rows. If you rename Fun Timer in DB (e.g. `FUN_TIMER`),
 * either add that key here or set `launchUrl` on the game document — the catalog’s `gameCode` is authoritative.
 */
const INHOUSE_STATIC_PATH = {
    ROULETTE: '/games-static/roulette/index.html?player={playerId}',
    FUNTIMER: '/games-static/funtimer/index.html?player={playerId}',
};

const apiOriginFromRequest = (req) => {
    try {
        const host = (req.get('x-forwarded-host') || req.get('host') || '').trim();
        if (!host) return '';
        const rawProto = (req.get('x-forwarded-proto') || req.protocol || 'https').split(',')[0].trim();
        const proto = rawProto.replace(/:$/, '');
        return `${proto}://${host}`;
    } catch {
        return '';
    }
};

/** When Mongo `launchUrl` is empty, use bundled static only if `gameCode` matches `INHOUSE_STATIC_PATH`. */
const inhouseCatalogTemplateForCode = (gameCode, req) => {
    const rel = INHOUSE_STATIC_PATH[gameCode];
    if (!rel) return '';
    const fromEnv = (process.env.PUBLIC_GAME_BASE_URL || '').trim().replace(/\/$/, '');
    const base = fromEnv || apiOriginFromRequest(req);
    if (base) return `${base}${rel}`;
    const port = Number(process.env.PORT) || 3010;
    return `http://127.0.0.1:${port}${rel}`;
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
            // Include docs created via manual DB insert where isActive may be missing.
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
        const gameCode = String(req.params.gameCode || req.body?.gameCode || '').trim().toUpperCase();
        const externalPlayerId = String(req.body?.externalPlayerId || req.body?.playerId || req.userId || '').trim();

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

        let catalogTemplate = game.launchUrl && String(game.launchUrl).trim();
        if (!catalogTemplate) {
            catalogTemplate = inhouseCatalogTemplateForCode(gameCode, req);
        }
        if (catalogTemplate) {
            const launchUrl = resolveCatalogLaunchUrl(catalogTemplate, externalPlayerId);
            return res.status(200).json({
                success: true,
                gameCode,
                launchUrl,
                embedAllowed: game.embedAllowed !== false,
                data: { source: 'catalog' },
            });
        }

        const launchEndpoint = resolveGameLaunchUrl();

        const partnerToken = process.env.PARTNER_TOKEN;
        const apiKey = process.env.API_KEY;
        const apiSecret = process.env.API_SECRET;
        if (!partnerToken || !apiKey || !apiSecret) {
            return res.status(500).json({
                success: false,
                message: 'Game launch credentials are not configured',
            });
        }

        const partnerGameCode = String(game.partnerCode || '').trim().toUpperCase() || gameCode;

        const payload = {
            gameCode: partnerGameCode,
            externalPlayerId,
            currency: String(req.body?.currency || process.env.CURRENCY || 'INR'),
            locale: String(req.body?.locale || 'en'),
            returnUrl: req.body?.returnUrl != null
                ? String(req.body.returnUrl)
                : String(process.env.GAME_RETURN_URL || 'https://singlepana.in'),
        };

        const headers = {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'x-api-secret': apiSecret,
        };
        if (String(process.env.GAME_LAUNCH_BEARER || '').trim() === '1') {
            headers.Authorization = `Bearer ${String(partnerToken).trim()}`;
        }

        const response = await axios.post(
            launchEndpoint,
            payload,
            {
                headers,
                timeout: 15000,
            }
        );

        const d = response?.data;
        const nested = d && typeof d === 'object' ? d.data : null;
        const launchUrl =
            (d && d.launchUrl)
            || (nested && nested.launchUrl)
            || (d && d.result && d.result.launchUrl)
            || (d && d.url)
            || (d && d.gameUrl)
            || (d && d.sessionUrl)
            || (d && d.redirectUrl)
            || (d && d.link)
            || (nested && nested.url)
            || (nested && nested.sessionUrl)
            || (nested && nested.gameUrl)
            || null;

        return res.status(200).json({
            success: true,
            gameCode,
            launchUrl,
            embedAllowed: game.embedAllowed !== false,
            data: response.data,
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

