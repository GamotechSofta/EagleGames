import mongoose from 'mongoose';
import { Wallet, WalletTransaction } from '../models/wallet/wallet.js';
import User from '../models/user/user.js';
import Bet from '../models/bet/bet.js';
import Admin from '../models/admin/admin.js';
import { getBookieUserIds } from '../utils/bookieFilter.js';
import { logActivity, getClientIp } from '../utils/activityLogger.js';

function httpError(status, message) {
    const err = new Error(message);
    err.status = status;
    return err;
}

/**
 * Shared admin wallet mutation (credit/debit). `amount` must be a validated positive finite number.
 */
async function applyWalletAdjustment(req, { userId, amount: numAmount, type, description }) {
    const bookieUserIds = await getBookieUserIds(req.admin);
    if (bookieUserIds !== null && !bookieUserIds.some((id) => String(id) === String(userId))) {
        throw httpError(403, 'You can only adjust wallet for your assigned players');
    }

    if (type === 'credit' && req.admin?.role === 'bookie') {
        const updatedBookie = await Admin.findOneAndUpdate(
            { _id: req.admin._id, balance: { $gte: numAmount } },
            { $inc: { balance: -numAmount } },
            { new: true }
        ).select('balance');

        if (!updatedBookie) {
            throw httpError(400, 'Insufficient bookie balance');
        }
    }

    let wallet = await Wallet.findOne({ userId });
    if (!wallet) {
        wallet = new Wallet({ userId, balance: 0 });
    }

    if (type === 'credit') {
        wallet.balance += numAmount;
    } else if (type === 'debit') {
        if (wallet.balance < numAmount) {
            throw httpError(400, 'Insufficient balance');
        }
        wallet.balance -= numAmount;
    } else {
        throw httpError(400, 'type must be credit or debit');
    }

    await wallet.save();

    if (type === 'debit' && req.admin?.role === 'bookie') {
        await Admin.updateOne({ _id: req.admin._id }, { $inc: { balance: numAmount } });
    }

    const desc =
        typeof description === 'string' && description.trim()
            ? description.trim()
            : `Admin ${type}: ₹${numAmount}`;

    await WalletTransaction.create({
        userId,
        type,
        amount: numAmount,
        description: desc,
    });

    const player = await User.findById(userId).select('username').lean();
    if (req.admin) {
        await logActivity({
            action: 'wallet_adjust',
            performedBy: req.admin.username,
            performedByType: req.admin.role || 'admin',
            targetType: 'wallet',
            targetId: String(userId),
            details: `Wallet ${type} ₹${numAmount} for player "${player?.username || userId}"`,
            meta: { userId, amount: numAmount, type },
            ip: getClientIp(req),
        });
    }

    return wallet;
}

export const getAllWallets = async (req, res) => {
    try {
        const query = {};
        const bookieUserIds = await getBookieUserIds(req.admin);
        if (bookieUserIds !== null) {
            query.userId = { $in: bookieUserIds };
        }
        const wallets = await Wallet.find(query)
            .populate('userId', 'username email')
            .sort({ balance: -1 });

        res.status(200).json({ success: true, data: wallets });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getTransactions = async (req, res) => {
    try {
        const { userId, includeBet } = req.query;
        const query = {};
        const bookieUserIds = await getBookieUserIds(req.admin);
        if (bookieUserIds !== null) {
            query.userId = { $in: bookieUserIds };
        }
        if (userId) {
            query.userId = userId;
        }
        const transactions = await WalletTransaction.find(query)
            .populate('userId', 'username email')
            .sort({ createdAt: -1 })
            .limit(1000)
            .lean();

        const includeBetData = ['1', 'true', 'yes', 'y'].includes(String(includeBet || '').toLowerCase());
        
        if (!includeBetData || !Array.isArray(transactions) || transactions.length === 0) {
            return res.status(200).json({ success: true, data: transactions });
        }

        const isObjectIdLike = (v) => typeof v === 'string' && /^[a-f\d]{24}$/i.test(v.trim());
        const refIds = Array.from(
            new Set(transactions.map((t) => String(t?.referenceId || '').trim()).filter(isObjectIdLike))
        );

        if (refIds.length === 0) {
            return res.status(200).json({ success: true, data: transactions });
        }

        const bets = await Bet.find({ _id: { $in: refIds } })
            .populate('marketId', 'marketName')
            .select('betType betNumber marketId')
            .lean();

        const betMap = new Map((bets || []).map((b) => [String(b._id), b]));
        const enriched = transactions.map((t) => {
            const ref = String(t?.referenceId || '').trim();
            const b = betMap.get(ref);
            if (!b) return t;
            return {
                ...t,
                bet: {
                    betType: b?.betType,
                    betNumber: b?.betNumber,
                    marketId: b?.marketId?._id || b?.marketId,
                    marketName: b?.marketId?.marketName || '',
                },
            };
        });

        res.status(200).json({ success: true, data: enriched });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * User-facing: get wallet transactions for the authenticated player.
 * Requires verifyUser (JWT). Query/body: { limit? }.
 * Returns latest transactions (most recent first).
 */
export const getMyTransactions = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const limitRaw = req.query?.limit ?? req.body?.limit;
        let limit = Number(limitRaw);
        if (!Number.isFinite(limit) || limit <= 0) limit = 200;
        limit = Math.min(limit, 1000);

        const includeBetRaw = req.query?.includeBet ?? req.body?.includeBet;
        const includeBet = ['1', 'true', 'yes', 'y'].includes(String(includeBetRaw || '').toLowerCase());

        const transactions = await WalletTransaction.find({ userId })
            .select('type amount description referenceId createdAt')
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        if (!includeBet || !Array.isArray(transactions) || transactions.length === 0) {
            return res.status(200).json({ success: true, data: transactions });
        }

        const isObjectIdLike = (v) => typeof v === 'string' && /^[a-f\d]{24}$/i.test(v.trim());
        const refIds = Array.from(
            new Set(transactions.map((t) => String(t?.referenceId || '').trim()).filter(isObjectIdLike))
        );

        if (refIds.length === 0) {
            return res.status(200).json({ success: true, data: transactions });
        }

        const bets = await Bet.find({ _id: { $in: refIds }, userId })
            .populate('marketId', 'marketName')
            .select('betType betNumber marketId')
            .lean();

        const betMap = new Map((bets || []).map((b) => [String(b._id), b]));
        const enriched = transactions.map((t) => {
            const ref = String(t?.referenceId || '').trim();
            const b = betMap.get(ref);
            if (!b) return t;
            return {
                ...t,
                bet: {
                    betType: b?.betType,
                    betNumber: b?.betNumber,
                    marketId: b?.marketId?._id || b?.marketId,
                    marketName: b?.marketId?.marketName || '',
                },
            };
        });

        return res.status(200).json({ success: true, data: enriched });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const adjustBalance = async (req, res) => {
    try {
        const { userId, amount, type } = req.body;

        if (!userId || amount == null || amount === '' || !type) {
            return res.status(400).json({
                success: false,
                message: 'userId, amount and type are required',
            });
        }

        if (type !== 'credit' && type !== 'debit') {
            return res.status(400).json({
                success: false,
                message: 'type must be credit or debit',
            });
        }

        const numAmount = Number(amount);
        if (!Number.isFinite(numAmount) || numAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Amount must be a positive number',
            });
        }

        const wallet = await applyWalletAdjustment(req, { userId, amount: numAmount, type });
        res.status(200).json({ success: true, data: wallet });
    } catch (error) {
        const status = typeof error.status === 'number' ? error.status : 500;
        res.status(status).json({ success: false, message: error.message });
    }
};

/** Admin: credit player wallet. Body: { userId, amount, description? } */
export const creditWallet = async (req, res) => {
    try {
        const { userId, amount, description } = req.body;

        if (!userId || amount == null || amount === '') {
            return res.status(400).json({
                success: false,
                message: 'userId and amount are required',
            });
        }

        const numAmount = Number(amount);
        if (!Number.isFinite(numAmount) || numAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Amount must be a positive number',
            });
        }

        const wallet = await applyWalletAdjustment(req, {
            userId,
            amount: numAmount,
            type: 'credit',
            description,
        });
        res.status(200).json({ success: true, data: wallet });
    } catch (error) {
        const status = typeof error.status === 'number' ? error.status : 500;
        res.status(status).json({ success: false, message: error.message });
    }
};

/** Admin: debit player wallet. Body: { userId, amount, description? } */
export const debitWallet = async (req, res) => {
    try {
        const { userId, amount, description } = req.body;

        if (!userId || amount == null || amount === '') {
            return res.status(400).json({
                success: false,
                message: 'userId and amount are required',
            });
        }

        const numAmount = Number(amount);
        if (!Number.isFinite(numAmount) || numAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Amount must be a positive number',
            });
        }

        const wallet = await applyWalletAdjustment(req, {
            userId,
            amount: numAmount,
            type: 'debit',
            description,
        });
        res.status(200).json({ success: true, data: wallet });
    } catch (error) {
        const status = typeof error.status === 'number' ? error.status : 500;
        res.status(status).json({ success: false, message: error.message });
    }
};

async function assertCanAccessPlayerWallet(req, userId) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw httpError(400, 'Invalid player id');
    }
    const bookieUserIds = await getBookieUserIds(req.admin);
    if (bookieUserIds !== null && !bookieUserIds.some((id) => String(id) === String(userId))) {
        throw httpError(403, 'You can only view wallets for your assigned players');
    }
}

/** Admin: player id + profile + wallet balance */
export const getPlayerWallet = async (req, res) => {
    try {
        const { userId } = req.params;
        await assertCanAccessPlayerWallet(req, userId);

        const user = await User.findById(userId).select('username email').lean();
        if (!user) {
            return res.status(404).json({ success: false, message: 'Player not found' });
        }

        let wallet = await Wallet.findOne({ userId }).lean();
        const balance = wallet?.balance ?? 0;

        res.status(200).json({
            success: true,
            data: {
                userId,
                username: user.username,
                email: user.email,
                balance,
            },
        });
    } catch (error) {
        const status = typeof error.status === 'number' ? error.status : 500;
        res.status(status).json({ success: false, message: error.message });
    }
};

/** Admin: generic amount (balance) for a player id */
export const getPlayerAmount = async (req, res) => {
    try {
        const { userId } = req.params;
        await assertCanAccessPlayerWallet(req, userId);

        const exists = await User.exists({ _id: userId });
        if (!exists) {
            return res.status(404).json({ success: false, message: 'Player not found' });
        }

        let wallet = await Wallet.findOne({ userId }).lean();
        const amount = wallet?.balance ?? 0;

        res.status(200).json({
            success: true,
            data: { userId, amount },
        });
    } catch (error) {
        const status = typeof error.status === 'number' ? error.status : 500;
        res.status(status).json({ success: false, message: error.message });
    }
};

/**
 * Admin: set a user's wallet balance to an exact value.
 * Body: { userId, balance } (balance >= 0)
 */
export const setBalance = async (req, res) => {
    try {
        const { userId, balance } = req.body;

        if (!userId || balance == null || balance === '') {
            return res.status(400).json({
                success: false,
                message: 'userId and balance are required',
            });
        }

        const newBalance = Number(balance);
        if (!Number.isFinite(newBalance) || newBalance < 0) {
            return res.status(400).json({
                success: false,
                message: 'Balance must be a non-negative number',
            });
        }

        const bookieUserIds = await getBookieUserIds(req.admin);
        if (bookieUserIds !== null && !bookieUserIds.some((id) => String(id) === String(userId))) {
            return res.status(403).json({
                success: false,
                message: 'You can only set wallet for your assigned players',
            });
        }

        let wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            wallet = new Wallet({ userId, balance: 0 });
        }

        const previousBalance = wallet.balance;
        wallet.balance = newBalance;
        await wallet.save();

        const diff = newBalance - previousBalance;
        const type = diff >= 0 ? 'credit' : 'debit';
        await WalletTransaction.create({
            userId,
            type,
            amount: Math.abs(diff),
            description: `Admin set balance to ₹${newBalance} (was ₹${previousBalance})`,
        });

        const player = await User.findById(userId).select('username').lean();
        if (req.admin) {
            await logActivity({
                action: 'wallet_set_balance',
                performedBy: req.admin.username,
                performedByType: req.admin.role || 'admin',
                targetType: 'wallet',
                targetId: String(userId),
                details: `Wallet set to ₹${newBalance} for player "${player?.username || userId}"`,
                meta: { userId, balance: newBalance, previousBalance },
                ip: getClientIp(req),
            });
        }

        res.status(200).json({ success: true, data: wallet });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * User-facing: get current wallet balance for the authenticated player.
 * Requires verifyUser (JWT).
 */
export const getBalance = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
        }

        let wallet = await Wallet.findOne({ userId }).lean();
        if (!wallet) {
            wallet = { balance: 0 };
        }
        const balance = wallet.balance ?? 0;
        res.status(200).json({ success: true, data: { balance } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
