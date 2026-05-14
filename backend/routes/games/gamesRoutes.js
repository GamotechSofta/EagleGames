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

router.post('/launch/:gameCode', verifyUser, launchGame);

router.get('/', getGames);
router.get('/:gameCode', getGameByCode);

export default router;
