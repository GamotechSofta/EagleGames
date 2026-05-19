import express from 'express';
import { embedGameFrame } from '../../controllers/gameEmbedController.js';
import {
    getGames,
    getGameByCode,
    launchGame,
    getAllGamesForAdmin,
    createGame,
    updateGame,
    deleteGame,
    getMyGameBetHistory,
    getAdminGameBetHistoryHandler,
} from '../../controllers/gamesController.js';
import { verifyUser } from '../../middleware/userAuth.js';
import { verifyAdmin, verifySuperAdmin } from '../../middleware/adminAuth.js';

const router = express.Router();

router.get('/admin/all', verifyAdmin, getAllGamesForAdmin);
router.get('/admin-bet-history', verifyAdmin, getAdminGameBetHistoryHandler);
router.get('/my-bet-history', verifyUser, getMyGameBetHistory);
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
router.get('/embed/frame', embedGameFrame);
router.post('/launch/:gameCode', verifyUser, launchGame);
router.get('/:gameCode', getGameByCode);

export default router;
