/**
 * One-shot: remove launchUrl, partnerCode, embedAllowed from all Game documents.
 * Run from backend: node scripts/migrateGamesUnsetLegacyFields.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { unsetLegacyGameSchemaFields } from '../utils/seedGames.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function main() {
    if (!MONGODB_URI) {
        console.error('Missing MONGODB_URI (or MONGO_URI) in backend/.env');
        process.exit(1);
    }
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected');
    await unsetLegacyGameSchemaFields();
    await mongoose.disconnect();
    console.log('Done.');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
