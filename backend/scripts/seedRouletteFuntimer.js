/**
 * Upsert ROULETTE + FUNTIMER catalog entries (partner launch via GAME_LAUNCH_URL only).
 * Run: node backend/scripts/seedRouletteFuntimer.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Game from '../models/games/games.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

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

    const games = [
        {
            gameCode: 'ROULETTE',
            name: 'Roulette',
            image: ROULETTE_IMG,
            category: 'casino',
            provider: 'partner',
            launchUrl: '',
            embedAllowed: true,
            isActive: true,
            order: 10,
        },
        {
            gameCode: 'FUNTIMER',
            name: 'Fun Timer',
            image: FUNTIMER_IMG,
            category: 'arcade',
            provider: 'partner',
            launchUrl: '',
            embedAllowed: true,
            isActive: true,
            order: 11,
        },
    ];

    let inserted = 0;
    let updated = 0;

    for (const doc of games) {
        const res = await Game.findOneAndUpdate(
            { gameCode: doc.gameCode },
            { $set: doc, $unset: { launchUrl: '' } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        if (res) {
            const wasNew = res.createdAt?.getTime() === res.updatedAt?.getTime();
            if (wasNew) inserted += 1;
            else updated += 1;
        }
    }

    console.log(`Done. inserted≈${inserted}, updated≈${updated}`);
    await mongoose.disconnect();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
