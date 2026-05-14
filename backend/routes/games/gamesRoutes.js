import express from 'express';
import {
    getGames,
    getGameByCode,
    launchGame,
    getAllGamesForAdmin,
    createGame,
    updateGame,
    deleteGame,
} from '../../controllers/gamesController.js';
import { verifyUser } from '../../middleware/userAuth.js';
import { verifyAdmin, verifySuperAdmin } from '../../middleware/adminAuth.js';

const router = express.Router();

router.get('/admin/all', verifyAdmin, getAllGamesForAdmin);
router.post('/create-game', verifySuperAdmin, createGame);
router.patch('/update-game/:id', verifySuperAdmin, updateGame);
router.delete('/delete-game/:id', verifySuperAdmin, deleteGame);

/**
 * Player catalog (mounted at app `/api/v1/games`).
 *
 * Full list:     GET  /api/v1/games
 * One by code:   GET  /api/v1/games/:gameCode   — use the exact `gameCode` from the list (Mongo), not a hardcoded UI constant.
 * Launch: POST /api/v1/games/launch/:gameCode (auth) → CraftDigital session API
 * (`GAME_LAUNCH_URL`, `GAME_LAUNCH_API_KEY` / `GAME_LAUNCH_API_SECRET`).
 *
 * Route order: register `GET /` before `GET /:gameCode` so the list handler runs for the catalog root.
 */
router.get('/', getGames);
router.get('/:gameCode', getGameByCode);
router.post('/launch/:gameCode', verifyUser, launchGame);

export default router;
