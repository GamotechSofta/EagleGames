import Game from '../models/games/games.js';
import { AVIATOR_LAUNCH_DEFAULT, resolveEffectiveLaunchTemplate } from './gameLaunchUrl.js';

/** Fun Timer tile (square promo art). */
const FUNTIMER_TILE_IMAGE =
    'https://res.cloudinary.com/dzd47mpdo/image/upload/v1776326982/FUN_TIMER_6_irmgjz.png';
const LEGACY_FUNTIMER_TILE_IMAGE =
    'https://res.cloudinary.com/dwwt5xdsz/image/upload/q_auto/f_auto/v1775804008/singledice_dizkld.png';

/** Roulette tile (square promo art). */
const ROULETTE_TILE_IMAGE =
    'https://res.cloudinary.com/dzd47mpdo/image/upload/v1776326983/FUN_TIMER_5_xn87ir.png';
const LEGACY_ROULETTE_TILE_IMAGE =
    'https://res.cloudinary.com/dwwt5xdsz/image/upload/v1775804007/roulletGame_a719um.jpg';

const DEFAULT_GAMES = [
    {
        name: 'Aviator',
        gameCode: 'AVIATOR',
        image: 'https://res.cloudinary.com/dwwt5xdsz/image/upload/v1775804006/aviatorGame_qfug5k.jpg',
        category: 'instant',
        provider: 'partner',
        launchUrl: AVIATOR_LAUNCH_DEFAULT,
        isActive: true,
        order: 1,
    },
    {
        name: 'Fun Timer',
        gameCode: 'FUNTIMER',
        image: FUNTIMER_TILE_IMAGE,
        category: 'instant',
        provider: 'partner',
        launchUrl: '',
        isActive: true,
        order: 2,
    },
    {
        name: 'Roulette',
        gameCode: 'ROULETTE',
        image: ROULETTE_TILE_IMAGE,
        category: 'instant',
        provider: 'partner',
        launchUrl: '',
        isActive: true,
        order: 3,
    },
];

function buildDocsWithEnv() {
    return DEFAULT_GAMES.map((g) => ({
        ...g,
        launchUrl: resolveEffectiveLaunchTemplate(g.gameCode, g.launchUrl),
    }));
}

/** Migrate legacy Fun Timer thumbnail (dice placeholder) to branded tile. */
async function migrateFunTimerTileImageIfLegacy() {
    const res = await Game.updateMany(
        { gameCode: 'FUNTIMER', image: LEGACY_FUNTIMER_TILE_IMAGE },
        { $set: { image: FUNTIMER_TILE_IMAGE } }
    );
    if (res.modifiedCount > 0) {
        console.log('[games] Updated FUNTIMER catalog image to FUN_TIMER_6 tile.');
    }
}

/** One-time style migration: swap legacy Roulette thumbnail only if DB still has old Cloudinary id. */
async function migrateRouletteTileImageIfLegacy() {
    const res = await Game.updateMany(
        { gameCode: 'ROULETTE', image: LEGACY_ROULETTE_TILE_IMAGE },
        { $set: { image: ROULETTE_TILE_IMAGE } }
    );
    if (res.modifiedCount > 0) {
        console.log('[games] Updated ROULETTE catalog image to FUN_TIMER tile.');
    }
}

async function syncLaunchUrlsFromEnv() {
    const aviatorUrl = process.env.AVIATOR_LAUNCH_URL?.trim();
    if (aviatorUrl) {
        await Game.updateOne({ gameCode: 'AVIATOR' }, { $set: { launchUrl: aviatorUrl } });
    }
    const rouletteUrl =
        process.env.ROULETTE_LAUNCH_URL?.trim() || process.env.GAMEZOP_ROULETTE_LAUNCH_URL?.trim();
    if (rouletteUrl) {
        await Game.updateOne({ gameCode: 'ROULETTE' }, { $set: { launchUrl: rouletteUrl } });
    }
    const funtimerUrl = process.env.FUNTIMER_LAUNCH_URL?.trim();
    if (funtimerUrl) {
        await Game.updateOne({ gameCode: 'FUNTIMER' }, { $set: { launchUrl: funtimerUrl } });
    }
}

/**
 * Ensures each default row exists (by gameCode). Inserts only missing games.
 * Set DISABLE_GAME_SEED=true to skip ensure + sync.
 *
 * Env (Roulette same pattern as Aviator — app merges these even if Mongo launchUrl is empty):
 *   AVIATOR_LAUNCH_URL=...
 *   ROULETTE_LAUNCH_URL=https://www.gamezop.com/g/<ID>?uid={playerId}
 *   FUNTIMER_LAUNCH_URL=https://www.gamezop.com/g/<ID>?uid={playerId}
 */
export async function ensureDefaultGames() {
    if (process.env.DISABLE_GAME_SEED === 'true') {
        return;
    }
    try {
        const docs = buildDocsWithEnv();
        let added = 0;
        for (const doc of docs) {
            const exists = await Game.exists({ gameCode: doc.gameCode });
            if (!exists) {
                await Game.create(doc);
                added += 1;
            }
        }
        if (added > 0) {
            console.log(`[games] Inserted ${added} missing default game(s) (by gameCode).`);
        }
        await syncLaunchUrlsFromEnv();
        await migrateRouletteTileImageIfLegacy();
        await migrateFunTimerTileImageIfLegacy();

        const removed = await Game.deleteOne({ gameCode: 'CHICKEN_ROAD' });
        if (removed.deletedCount > 0) {
            console.log('[games] Removed legacy CHICKEN_ROAD (replaced by FUNTIMER).');
        }
    } catch (err) {
        console.error('[games] Default games ensure failed:', err.message);
    }
}
