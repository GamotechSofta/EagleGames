import mongoose from 'mongoose';

const gameBetHistorySchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        source: { type: String, enum: ['partner', 'roulette'], required: true },
        gameCode: { type: String, required: true, trim: true, uppercase: true, index: true },
        gameName: { type: String, trim: true },
        betId: { type: String, required: true, trim: true },
        roundId: { type: String, trim: true },
        betAmount: { type: Number, required: true, min: 0 },
        payout: { type: Number, default: 0, min: 0 },
        status: { type: String, enum: ['won', 'lost', 'pending'], default: 'lost' },
        betNumber: { type: String, trim: true },
        winningNumber: { type: Number },
        bets: { type: mongoose.Schema.Types.Mixed },
        debitTransactionId: { type: String, trim: true },
        creditTransactionId: { type: String, trim: true },
    },
    { timestamps: true }
);

gameBetHistorySchema.index({ user: 1, createdAt: -1 });
gameBetHistorySchema.index({ user: 1, gameCode: 1, createdAt: -1 });
gameBetHistorySchema.index({ user: 1, source: 1, betId: 1 }, { unique: true });

const GameBetHistory = mongoose.model('GameBetHistory', gameBetHistorySchema);
export default GameBetHistory;
