import mongoose from 'mongoose';

const gameSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },

        gameCode: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
        },

        /** If set, sent to the partner session launch API as `gameCode`; otherwise `gameCode` above is used. */
        partnerGameCode: {
            type: String,
            default: '',
            trim: true,
        },

        image: {
            type: String,
            required: true,
        },

        category: {
            type: String,
            default: 'general', // e.g. crash, casino, card
        },

        provider: {
            type: String,
            default: 'gamezop',
        },

        /** Direct iframe URL template; `{playerId}` etc. substituted at launch. Takes priority over partner API. */
        launchUrl: {
            type: String,
            default: '',
            trim: true,
        },

        /** If false, client opens launch URL in a new tab (partner blocks iframe). */
        embedAllowed: {
            type: Boolean,
            default: true,
        },

        isActive: {
            type: Boolean,
            default: true,
        },

        order: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

const Game = mongoose.model('Game', gameSchema);

export default Game;
