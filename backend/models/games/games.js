import mongoose from 'mongoose';

const gameSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        gameCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
        image: { type: String, required: true },
        category: { type: String, default: 'general' },
        provider: { type: String, default: 'gamezop' },
        launchUrl: { type: String, default: '', trim: true },
        /** Partner's catalog id when different from gameCode (sent in partner launch payload). */
        partnerCode: { type: String, default: '', trim: true, uppercase: true },
        /** If false, client should open launchUrl in a new tab (iframe blocked partners). */
        embedAllowed: { type: Boolean, default: true },
        isActive: { type: Boolean, default: true },
        order: { type: Number, default: 0 },
    },
    { timestamps: true }
);

const Game = mongoose.model('Game', gameSchema);
export default Game;
