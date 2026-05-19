import Game from '../models/games/games.js';

/** Fields removed from old schema; strip only via `node scripts/migrateGamesUnsetLegacyFields.js` (not on startup). */
export async function unsetLegacyGameSchemaFields() {
    try {
        const res = await Game.collection.updateMany(
            {
                $or: [{ launchMode: { $exists: true } }],
            },
            { $unset: { launchMode: '' } }
        );
        if (res.modifiedCount > 0) {
            console.log(`[games] Removed legacy launchMode from ${res.modifiedCount} document(s).`);
        }
    } catch (err) {
        console.error('[games] Legacy field $unset failed:', err.message);
    }
}

const FUNTIMER_TILE_IMAGE =
    'https://res.cloudinary.com/dzd47mpdo/image/upload/v1776326982/FUN_TIMER_6_irmgjz.png';
const LEGACY_FUNTIMER_TILE_IMAGE =
    'https://res.cloudinary.com/dwwt5xdsz/image/upload/q_auto/f_auto/v1775804008/singledice_dizkld.png';

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
        launchUrl: '',
        isActive: true,
        order: 1,
    },
    {
        name: 'Fun Timer',
        gameCode: 'FUNTIMER',
        image: FUNTIMER_TILE_IMAGE,
        category: 'arcade',
        provider: 'partner',
        launchUrl: '',
        embedAllowed: true,
        isActive: true,
        order: 2,
    },
    {
        name: 'Roulette',
        gameCode: 'ROULETTE',
        image: ROULETTE_TILE_IMAGE,
        category: 'casino',
        provider: 'partner',
        launchUrl: '',
        embedAllowed: true,
        isActive: true,
        order: 3,
    },
];

async function migrateFunTimerTileImageIfLegacy() {
    const res = await Game.updateMany(
        { gameCode: 'FUNTIMER', image: LEGACY_FUNTIMER_TILE_IMAGE },
        { $set: { image: FUNTIMER_TILE_IMAGE } }
    );
    if (res.modifiedCount > 0) {
        console.log('[games] Updated FUNTIMER catalog image.');
    }
}

async function migrateRouletteTileImageIfLegacy() {
    const res = await Game.updateMany(
        { gameCode: 'ROULETTE', image: LEGACY_ROULETTE_TILE_IMAGE },
        { $set: { image: ROULETTE_TILE_IMAGE } }
    );
    if (res.modifiedCount > 0) {
        console.log('[games] Updated ROULETTE catalog image.');
    }
}

/** Remove in-house static launchUrl; all games launch via GAME_LAUNCH_URL partner API. */
async function clearInHouseLaunchUrls() {
    const res = await Game.updateMany(
        { gameCode: { $in: ['ROULETTE', 'FUNTIMER', 'AVIATOR'] } },
        {
            $set: { provider: 'partner' },
            $unset: { launchUrl: '' },
        }
    );
    if (res.modifiedCount > 0) {
        console.log(`[games] Cleared in-house launchUrl on ${res.modifiedCount} game(s).`);
    }
}

export async function ensureDefaultGames() {
    if (process.env.DISABLE_GAME_SEED === 'true') {
        return;
    }
    try {
        let added = 0;
        for (const doc of DEFAULT_GAMES) {
            const exists = await Game.exists({ gameCode: doc.gameCode });
            if (!exists) {
                await Game.create({ ...doc });
                added += 1;
            }
        }
        if (added > 0) {
            console.log(`[games] Inserted ${added} missing default game(s).`);
        }
        await clearInHouseLaunchUrls();
        await migrateRouletteTileImageIfLegacy();
        await migrateFunTimerTileImageIfLegacy();

        const removed = await Game.deleteOne({ gameCode: 'CHICKEN_ROAD' });
        if (removed.deletedCount > 0) {
            console.log('[games] Removed legacy CHICKEN_ROAD.');
        }
    } catch (err) {
        console.error('[games] Default games ensure failed:', err.message);
    }
}
