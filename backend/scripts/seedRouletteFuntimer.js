/**
 * Upsert ROULETTE + FUNTIMER with in-house static launch URLs.
 * Run: node backend/scripts/seedRouletteFuntimer.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Game from '../models/games/games.js';
import { getPublicGameBaseUrl } from '../utils/gameLaunchUrl.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const base = getPublicGameBaseUrl();

const ROULETTE_IMG =
    'https://res.cloudinary.com/dzd47mpdo/image/upload/v1776326983/FUN_TIMER_5_xn87ir.png';
const FUNTIMER_IMG =
    'https://res.cloudinary.com/dzd47mpdo/image/upload/v1776326982/FUN_TIMER_6_irmgjz.png';

async function main() {
    if (!MONGODB_URI) {
        console.error('Missing MONGODB_URI (or MONGO_URI) in backend/.env');
        process.exit(1);
    }
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected');
    console.log('Launch base:', base);

    const games = [
        {
            gameCode: 'ROULETTE',
            name: 'Roulette',
            image: ROULETTE_IMG,
            category: 'casino',
            provider: 'in-house',
            launchUrl: `${base}/games-static/roulette/index.html?player={playerId}`,
            embedAllowed: true,
            isActive: true,
            order: 10,
        },
        {
            gameCode: 'FUNTIMER',
            name: 'Fun Timer',
            image: FUNTIMER_IMG,
            category: 'arcade',
            provider: 'in-house',
            launchUrl: `${base}/games-static/funtimer/index.html?player={playerId}`,
            embedAllowed: true,
            isActive: true,
            order: 11,
        },
    ];

    let inserted = 0;
    let updated = 0;

    for (const doc of games) {
        const existing = await Game.findOne({ gameCode: doc.gameCode }).lean();
        await Game.findOneAndUpdate(
            { gameCode: doc.gameCode },
            { $set: doc },
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
        );
        if (existing) updated += 1;
        else inserted += 1;
    }

    console.log(`Done. Upserts — inserted: ${inserted}, updated: ${updated}`);
    await mongoose.disconnect();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
