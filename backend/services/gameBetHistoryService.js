import { WalletTransaction } from '../models/wallet/wallet.js';
import RouletteGame from '../models/rouletteGame/rouletteGame.js';
import Game from '../models/games/games.js';

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

/** Partner wallet debits/credits (Aviator, Fun Timer, external Roulette, etc.) */
const historyFromWalletTransactions = (transactions, nameMap) => {
    const debits = [];
    const creditsByRound = new Map();

    for (const tx of transactions || []) {
        const desc = String(tx?.description || '');
        const descLower = desc.toLowerCase();
        if (descLower.startsWith('generic debit')) {
            const meta = parsePipeKv(desc);
            const roundKey = (meta.roundId || '').trim() || String(tx._id);
            debits.push({
                roundKey,
                amount: Number(tx.amount) || 0,
                game: (meta.game || '').trim(),
                betNumber: (meta.betNumber || '').trim(),
                createdAt: tx.createdAt,
                debitId: String(tx._id),
            });
        } else if (descLower.startsWith('generic credit')) {
            const meta = parsePipeKv(desc);
            const roundKey = (meta.roundId || '').trim();
            if (!roundKey) continue;
            const prev = creditsByRound.get(roundKey) || 0;
            creditsByRound.set(roundKey, prev + (Number(tx.amount) || 0));
        }
    }

    return debits.map((d) => {
        const payout = creditsByRound.get(d.roundKey) || 0;
        const betAmount = d.amount;
        const status = payout > 0 ? 'won' : 'lost';
        const gameCode = d.game.toUpperCase();
        return {
            id: `partner-${d.debitId}`,
            betId: d.roundKey,
            source: 'partner',
            gameCode: gameCode || 'GAME',
            gameName: resolveGameName(gameCode, nameMap),
            betAmount,
            payout,
            status,
            betNumber: d.betNumber || null,
            roundId: d.roundKey,
            createdAt: d.createdAt,
        };
    });
};

/** In-house roulette spins */
const historyFromRouletteGames = (spins, nameMap) =>
    (spins || []).map((spin) => {
        const betAmount = Number(spin.totalBet) || 0;
        const payout = Number(spin.payout) || 0;
        return {
            id: spin._id?.toString() || spin.spinId || `roulette-${spin.createdAt}`,
            betId: spin.spinId || spin._id?.toString(),
            source: 'roulette',
            gameCode: 'ROULETTE',
            gameName: resolveGameName('ROULETTE', nameMap),
            betAmount,
            payout,
            status: payout > 0 ? 'won' : 'lost',
            winningNumber: spin.winningNumber,
            bets: spin.bets,
            roundId: spin.spinId || null,
            createdAt: spin.createdAt,
        };
    });

const mergeAndSort = (entries) =>
    [...entries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

/**
 * Player game bet history: partner wallet rounds + in-house roulette.
 */
export async function getPlayerGameBetHistory(userId, { limit = 100, gameCode = '' } = {}) {
    const cap = Math.min(Math.max(Number(limit) || 100, 1), 500);
    const nameMap = await buildGameNameMap();

    const [walletTxns, rouletteSpins] = await Promise.all([
        WalletTransaction.find({ userId })
            .select('type amount description referenceId createdAt')
            .sort({ createdAt: -1 })
            .limit(2000)
            .lean(),
        RouletteGame.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(cap)
            .select('spinId winningNumber totalBet payout bets createdAt')
            .lean(),
    ]);

    const gameTxns = (walletTxns || []).filter((t) => {
        const d = String(t?.description || '').toLowerCase();
        return d.startsWith('generic debit') || d.startsWith('generic credit');
    });

    const partnerEntries = historyFromWalletTransactions(gameTxns, nameMap);
    const rouletteEntries = historyFromRouletteGames(rouletteSpins, nameMap);
    let merged = mergeAndSort([...partnerEntries, ...rouletteEntries]);
    const codeFilter = String(gameCode || '').trim().toUpperCase();
    if (codeFilter) {
        merged = merged.filter((e) => String(e.gameCode || '').toUpperCase() === codeFilter);
    }
    return merged.slice(0, cap);
}

/**
 * Admin game bet history with optional user filter and pagination.
 */
export async function getAdminGameBetHistory({ userId, limit = 50, page = 1 } = {}) {
    const cap = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const pg = Math.max(Number(page) || 1, 1);
    const skip = (pg - 1) * cap;
    const nameMap = await buildGameNameMap();

    const walletQuery = {};
    const rouletteQuery = {};
    if (userId) {
        walletQuery.userId = userId;
        rouletteQuery.user = userId;
    }

    const [walletTxns, rouletteSpins, walletCount, rouletteCount] = await Promise.all([
        WalletTransaction.find(walletQuery)
            .select('type amount description referenceId createdAt userId')
            .sort({ createdAt: -1 })
            .limit(userId ? 2000 : 5000)
            .populate('userId', 'username phone email')
            .lean(),
        RouletteGame.find(rouletteQuery)
            .sort({ createdAt: -1 })
            .limit(userId ? 500 : 1000)
            .populate('user', 'username phone email')
            .select('spinId winningNumber totalBet payout bets createdAt user')
            .lean(),
        WalletTransaction.countDocuments({
            ...walletQuery,
            description: /^Generic debit/,
        }),
        RouletteGame.countDocuments(rouletteQuery),
    ]);

    const gameTxns = (walletTxns || []).filter((t) => {
        const d = String(t?.description || '').toLowerCase();
        return d.startsWith('generic debit') || d.startsWith('generic credit');
    });

    const partnerByUser = new Map();
    for (const tx of gameTxns) {
        const uid = String(tx.userId?._id || tx.userId || '');
        if (!uid) continue;
        if (!partnerByUser.has(uid)) partnerByUser.set(uid, []);
        partnerByUser.get(uid).push(tx);
    }

    let partnerEntries = [];
    for (const [, txns] of partnerByUser) {
        partnerEntries = partnerEntries.concat(historyFromWalletTransactions(txns, nameMap));
    }

    const rouletteEntries = (rouletteSpins || []).map((spin) => {
        const base = historyFromRouletteGames([spin], nameMap)[0];
        return {
            ...base,
            user: spin.user,
        };
    });

    const all = mergeAndSort([...partnerEntries, ...rouletteEntries]);
    const total = walletCount + rouletteCount;
    const data = all.slice(skip, skip + cap);

    return { data, total, page: pg, limit: cap };
}
