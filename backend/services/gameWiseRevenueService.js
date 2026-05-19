import { WalletTransaction } from '../models/wallet/wallet.js';

const GAME_BUCKETS = [
    { key: 'aviator', patterns: ['aviator'] },
    { key: 'funTimer', patterns: ['funtimer', 'fun timer', 'fun_timer'] },
    { key: 'roulette', patterns: ['roulette'] },
];

const classifyGameBucket = (description) => {
    const d = String(description || '').toLowerCase();
    if (!d.startsWith('generic debit') && !d.startsWith('generic credit')) {
        return null;
    }
    for (const bucket of GAME_BUCKETS) {
        if (bucket.patterns.some((p) => d.includes(p))) return bucket.key;
    }
    const gameMatch = d.match(/\bgame=([^|\s]+)/);
    if (gameMatch) {
        const g = gameMatch[1].toLowerCase();
        for (const bucket of GAME_BUCKETS) {
            if (bucket.patterns.some((p) => g.includes(p.replace(/\s/g, '')) || g.includes(p))) {
                return bucket.key;
            }
        }
    }
    return null;
};

/**
 * Partner game revenue from WalletTransaction descriptions (financial source of truth).
 * @param {{ userIds?: import('mongoose').Types.ObjectId[], start?: Date, end?: Date }} opts
 */
export async function aggregateGameWiseRevenue({ userIds = null, start = null, end = null } = {}) {
    if (Array.isArray(userIds) && userIds.length === 0) {
        const empty = { revenue: 0, payout: 0, profit: 0, debits: 0, credits: 0 };
        return {
            gameWiseRevenue: {
                aviator: { ...empty },
                funTimer: { ...empty },
                roulette: { ...empty },
            },
            gamesTotal: { revenue: 0, payout: 0, profit: 0 },
        };
    }

    const match = {};
    if (userIds?.length) match.userId = { $in: userIds };
    if (start || end) {
        match.createdAt = {};
        if (start) match.createdAt.$gte = start;
        if (end) match.createdAt.$lte = end;
    }

    const txns = await WalletTransaction.find(match)
        .select('type amount description createdAt')
        .lean();

    const buckets = {
        aviator: { revenue: 0, payout: 0, debits: 0, credits: 0 },
        funTimer: { revenue: 0, payout: 0, debits: 0, credits: 0 },
        roulette: { revenue: 0, payout: 0, debits: 0, credits: 0 },
    };

    for (const tx of txns) {
        const bucket = classifyGameBucket(tx.description);
        if (!bucket || !buckets[bucket]) continue;
        const amount = Number(tx.amount) || 0;
        if (tx.type === 'debit') {
            buckets[bucket].revenue += amount;
            buckets[bucket].debits += 1;
        } else if (tx.type === 'credit') {
            buckets[bucket].payout += amount;
            buckets[bucket].credits += 1;
        }
    }

    const gameWiseRevenue = {};
    let totalRevenue = 0;
    let totalPayout = 0;

    for (const [key, row] of Object.entries(buckets)) {
        const profit = row.revenue - row.payout;
        gameWiseRevenue[key] = {
            revenue: row.revenue,
            payout: row.payout,
            profit,
            debits: row.debits,
            credits: row.credits,
        };
        totalRevenue += row.revenue;
        totalPayout += row.payout;
    }

    return {
        gameWiseRevenue,
        gamesTotal: {
            revenue: totalRevenue,
            payout: totalPayout,
            profit: totalRevenue - totalPayout,
        },
    };
}
