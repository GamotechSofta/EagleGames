import GameBetHistory from '../models/gameBetHistory/gameBetHistory.js';
import Game from '../models/games/games.js';

const prettifyGameCode = (code) => {
    const s = String(code || '').trim();
    if (!s) return 'Game';
    return s.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

const gameNameCache = new Map();

export const resolveGameName = async (gameCode) => {
    const code = String(gameCode || '').trim().toUpperCase();
    if (!code) return 'Game';
    if (gameNameCache.has(code)) return gameNameCache.get(code);
    const game = await Game.findOne({ gameCode: code }).select('name').lean();
    const name = game?.name || prettifyGameCode(code);
    gameNameCache.set(code, name);
    return name;
};

export const toApiEntry = (doc) => {
    if (!doc) return null;
    const payout = Number(doc.payout) || 0;
    const betAmount = Number(doc.betAmount) || 0;
    const status =
        doc.status === 'pending'
            ? payout > 0
                ? 'won'
                : 'lost'
            : doc.status || (payout > 0 ? 'won' : 'lost');
    return {
        id: doc._id?.toString() || doc.betId,
        betId: doc.betId,
        source: doc.source,
        gameCode: doc.gameCode,
        gameName: doc.gameName || prettifyGameCode(doc.gameCode),
        betAmount,
        payout,
        status,
        betNumber: doc.betNumber || null,
        roundId: doc.roundId || null,
        winningNumber: doc.winningNumber,
        bets: doc.bets,
        createdAt: doc.createdAt,
        user: doc.user,
    };
};

/** Partner game bet placed (wallet debit). */
export async function recordPartnerGameDebit({
    userId,
    roundId,
    gameCode,
    betNumber,
    betAmount,
    debitTransactionId,
}) {
    const roundKey = String(roundId || debitTransactionId || '').trim();
    if (!userId || !roundKey) return null;

    const code = String(gameCode || 'GAME').trim().toUpperCase();
    const gameName = await resolveGameName(code);
    const amount = Number(betAmount) || 0;

    return GameBetHistory.findOneAndUpdate(
        { user: userId, source: 'partner', betId: roundKey },
        {
            $set: {
                gameCode: code,
                gameName,
                roundId: roundKey,
                betAmount: amount,
                betNumber: betNumber ? String(betNumber).trim() : undefined,
                debitTransactionId: debitTransactionId ? String(debitTransactionId).trim() : undefined,
            },
            $setOnInsert: {
                user: userId,
                source: 'partner',
                betId: roundKey,
                payout: 0,
                status: 'pending',
            },
        },
        { upsert: true, new: true }
    ).lean();
}

/** Partner game settled (wallet credit). */
export async function recordPartnerGameCredit({ userId, roundId, payout, creditTransactionId }) {
    const roundKey = String(roundId || '').trim();
    if (!userId || !roundKey) return null;

    const payoutNum = Number(payout) || 0;
    const status = payoutNum > 0 ? 'won' : 'lost';

    const updated = await GameBetHistory.findOneAndUpdate(
        { user: userId, source: 'partner', betId: roundKey },
        {
            $set: {
                payout: payoutNum,
                status,
                roundId: roundKey,
                creditTransactionId: creditTransactionId ? String(creditTransactionId).trim() : undefined,
            },
        },
        { new: true }
    ).lean();

    if (updated) return updated;

    return GameBetHistory.findOneAndUpdate(
        { user: userId, source: 'partner', betId: roundKey },
        {
            $setOnInsert: {
                user: userId,
                source: 'partner',
                betId: roundKey,
                roundId: roundKey,
                gameCode: 'GAME',
                gameName: 'Game',
                betAmount: 0,
                payout: payoutNum,
                status,
                creditTransactionId: creditTransactionId ? String(creditTransactionId).trim() : undefined,
            },
        },
        { upsert: true, new: true }
    ).lean();
}

/** In-house roulette spin completed. */
export async function recordRouletteSpin(
    { userId, spinId, betAmount, payout, winningNumber, bets },
    session = null
) {
    const spinKey = String(spinId || '').trim();
    if (!userId || !spinKey) return null;

    const amount = Number(betAmount) || 0;
    const payoutNum = Number(payout) || 0;
    const gameName = await resolveGameName('ROULETTE');

    const doc = {
        user: userId,
        source: 'roulette',
        gameCode: 'ROULETTE',
        gameName,
        betId: spinKey,
        roundId: spinKey,
        betAmount: amount,
        payout: payoutNum,
        status: payoutNum > 0 ? 'won' : 'lost',
        winningNumber,
        bets,
    };

    if (session) {
        const [created] = await GameBetHistory.create([doc], { session });
        return created;
    }

    try {
        return await GameBetHistory.create(doc);
    } catch (err) {
        if (err?.code === 11000) {
            return GameBetHistory.findOne({ user: userId, source: 'roulette', betId: spinKey }).lean();
        }
        throw err;
    }
}
