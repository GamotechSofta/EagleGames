/**
 * Player game history reads GameBetHistory (UI cache). Backfill rebuilds from WalletTransaction.
 * Money / revenue: always WalletTransaction — see gameWiseRevenueService.
 */
import { WalletTransaction } from '../models/wallet/wallet.js';
import RouletteGame from '../models/rouletteGame/rouletteGame.js';
import Game from '../models/games/games.js';
import GameBetHistory from '../models/gameBetHistory/gameBetHistory.js';
import { toApiEntry } from './gameBetHistoryRecordService.js';

const parsePipeKv = (description) => {
    const out = {};
    if (!description || typeof description !== 'string') return out;
    const parts = description.split(' | ').slice(1);
    for (const part of parts) {
        const idx = part.indexOf('=');
        if (idx > 0) out[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
    }
    return out;
};

const prettifyGameCode = (code) => {
    const s = String(code || '').trim();
    if (!s) return 'Game';
    return s.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

const buildGameNameMap = async () => {
    const games = await Game.find({}).select('gameCode name').lean();
    const map = new Map();
    for (const g of games || []) {
        const code = String(g?.gameCode || '').trim().toUpperCase();
        if (code) map.set(code, g?.name || prettifyGameCode(code));
    }
    return map;
};

const resolveGameName = (gameCode, nameMap) => {
    const code = String(gameCode || '').trim().toUpperCase();
    if (code && nameMap.has(code)) return nameMap.get(code);
    return prettifyGameCode(code) || 'Game';
};

const isFunTimerGame = (gameRaw) => {
    const g = String(gameRaw || '').toLowerCase().replace(/\s+/g, '');
    return g.includes('funtimer') || g.includes('fun_timer');
};

/** Partner wallet debits/credits (legacy reconstruction). FunTimer: one row per roundId. */
const historyFromWalletTransactions = (transactions, nameMap) => {
    const debits = [];
    const creditsByRound = new Map();
    const funTimerDebitsByRound = new Map();

    for (const tx of transactions || []) {
        const desc = String(tx?.description || '');
        const descLower = desc.toLowerCase();
        if (descLower.startsWith('generic debit')) {
            const meta = parsePipeKv(desc);
            const roundKey = (meta.roundId || '').trim() || String(tx._id);
            const game = (meta.game || '').trim();
            const row = {
                roundKey,
                amount: Number(tx.amount) || 0,
                game,
                betNumber: (meta.betNumber || '').trim(),
                createdAt: tx.createdAt,
                debitId: String(tx._id),
            };
            if (isFunTimerGame(game)) {
                const prev = funTimerDebitsByRound.get(roundKey) || {
                    roundKey,
                    amount: 0,
                    game,
                    betNumbers: [],
                    createdAt: tx.createdAt,
                    debitId: String(tx._id),
                };
                prev.amount += row.amount;
                if (row.betNumber) prev.betNumbers.push(row.betNumber);
                if (new Date(row.createdAt) < new Date(prev.createdAt)) {
                    prev.createdAt = row.createdAt;
                }
                funTimerDebitsByRound.set(roundKey, prev);
            } else {
                debits.push(row);
            }
        } else if (descLower.startsWith('generic credit')) {
            const meta = parsePipeKv(desc);
            const roundKey = (meta.roundId || '').trim();
            if (!roundKey) continue;
            const prev = creditsByRound.get(roundKey) || 0;
            creditsByRound.set(roundKey, prev + (Number(tx.amount) || 0));
        }
    }

    const mapDebitToEntry = (d) => {
        const payout = creditsByRound.get(d.roundKey) || 0;
        const betAmount = d.amount;
        const status = payout > 0 ? 'won' : 'lost';
        const gameCode = String(d.game || '').trim().toUpperCase() || 'GAME';
        const betNumber =
            Array.isArray(d.betNumbers) && d.betNumbers.length
                ? d.betNumbers.join(',')
                : d.betNumber || null;
        return {
            betId: d.roundKey,
            source: 'partner',
            gameCode,
            gameName: resolveGameName(gameCode, nameMap),
            betAmount,
            payout,
            status,
            betNumber,
            roundId: d.roundKey,
            createdAt: d.createdAt,
            debitTransactionId: d.debitId,
        };
    };

    return [
        ...debits.map(mapDebitToEntry),
        ...[...funTimerDebitsByRound.values()].map(mapDebitToEntry),
    ];
};

/** In-house roulette spins (legacy reconstruction). */
const historyFromRouletteGames = (spins, nameMap) =>
    (spins || []).map((spin) => {
        const betAmount = Number(spin.totalBet) || 0;
        const payout = Number(spin.payout) || 0;
        const spinId = spin.spinId || spin._id?.toString();
        return {
            betId: spinId,
            source: 'roulette',
            gameCode: 'ROULETTE',
            gameName: resolveGameName('ROULETTE', nameMap),
            betAmount,
            payout,
            status: payout > 0 ? 'won' : 'lost',
            winningNumber: spin.winningNumber,
            bets: spin.bets,
            roundId: spinId,
            createdAt: spin.createdAt,
        };
    });

const buildLegacyEntries = async (userId) => {
    const nameMap = await buildGameNameMap();
    const [walletTxns, rouletteSpins] = await Promise.all([
        WalletTransaction.find({ userId })
            .select('type amount description referenceId createdAt')
            .sort({ createdAt: -1 })
            .limit(2000)
            .lean(),
        RouletteGame.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(500)
            .select('spinId winningNumber totalBet payout bets createdAt')
            .lean(),
    ]);

    const gameTxns = (walletTxns || []).filter((t) => {
        const d = String(t?.description || '').toLowerCase();
        return d.startsWith('generic debit') || d.startsWith('generic credit');
    });

    const partnerEntries = historyFromWalletTransactions(gameTxns, nameMap);
    const rouletteEntries = historyFromRouletteGames(rouletteSpins, nameMap);
    return [...partnerEntries, ...rouletteEntries];
};

/** Sync older wallet/roulette rows into GameBetHistory (upsert, no overwrite of newer DB rows). */
const backfillUserHistory = async (userId) => {
    const legacy = await buildLegacyEntries(userId);
    if (!legacy.length) return;

    const ops = legacy.map((entry) => ({
        updateOne: {
            filter: {
                user: userId,
                source: entry.source,
                betId: entry.betId,
            },
            update: {
                $setOnInsert: {
                    user: userId,
                    source: entry.source,
                    gameCode: entry.gameCode,
                    gameName: entry.gameName,
                    betId: entry.betId,
                    roundId: entry.roundId,
                    betAmount: entry.betAmount,
                    payout: entry.payout,
                    status: entry.status,
                    betNumber: entry.betNumber,
                    winningNumber: entry.winningNumber,
                    bets: entry.bets,
                    debitTransactionId: entry.debitTransactionId,
                    createdAt: entry.createdAt,
                },
            },
            upsert: true,
        },
    }));

    try {
        await GameBetHistory.bulkWrite(ops, { ordered: false });
    } catch {
        // ignore duplicate key races
    }
};

/**
 * Player game bet history from GameBetHistory collection (DB).
 * Backfills legacy wallet/roulette data once per user if collection is empty.
 */
export async function getPlayerGameBetHistory(userId, { limit = 100, gameCode = '' } = {}) {
    const cap = Math.min(Math.max(Number(limit) || 100, 1), 500);
    await backfillUserHistory(userId);

    const query = { user: userId };
    const codeFilter = String(gameCode || '').trim().toUpperCase();
    if (codeFilter) query.gameCode = codeFilter;

    const docs = await GameBetHistory.find(query)
        .sort({ createdAt: -1 })
        .limit(cap)
        .lean();

    return docs.map((d) => toApiEntry(d));
}

/**
 * Admin game bet history from GameBetHistory collection (DB).
 */
export async function getAdminGameBetHistory({
    userId,
    limit = 50,
    page = 1,
    gameCode,
    status,
    startDate,
    endDate,
} = {}) {
    const cap = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const pg = Math.max(Number(page) || 1, 1);
    const skip = (pg - 1) * cap;

    if (userId) await backfillUserHistory(userId);

    const query = {};
    if (userId) query.user = userId;
    const code = String(gameCode || '').trim().toUpperCase();
    if (code && code !== 'ALL') query.gameCode = code;
    if (status === 'won') query.status = 'won';
    if (status === 'lost') query.status = 'lost';
    if (status === 'pending') query.status = 'pending';
    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) {
            const d = new Date(startDate);
            if (!Number.isNaN(d.getTime())) query.createdAt.$gte = d;
        }
        if (endDate) {
            const d = new Date(endDate);
            if (!Number.isNaN(d.getTime())) {
                d.setHours(23, 59, 59, 999);
                query.createdAt.$lte = d;
            }
        }
    }

    const [docs, total] = await Promise.all([
        GameBetHistory.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(cap)
            .populate('user', 'username phone email')
            .lean(),
        GameBetHistory.countDocuments(query),
    ]);

    return {
        data: docs.map((d) => toApiEntry(d)),
        total,
        page: pg,
        limit: cap,
    };
}
