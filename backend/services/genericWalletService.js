import mongoose from 'mongoose';
import User from '../models/user/user.js';
import { Wallet, WalletTransaction } from '../models/wallet/wallet.js';
import {
    recordPartnerGameDebit,
    recordPartnerGameCredit,
} from './gameBetHistoryRecordService.js';

const DEFAULT_START_BALANCE = 10000;

const isAutoCreateUsersEnabled = () => {
    const raw = String(process.env.AUTO_CREATE_USERS ?? 'true').trim().toLowerCase();
    return ['1', 'true', 'yes', 'y', 'on'].includes(raw);
};

const sanitizeEmailPart = (value) => value.toLowerCase().replace(/[^a-z0-9._-]/g, '-');

export async function ensureWalletForPlayer(playerId, { autoCreate = isAutoCreateUsersEnabled(), session } = {}) {
    const isObjectId = mongoose.Types.ObjectId.isValid(playerId);
    let user = null;

    if (isObjectId) {
        user = await User.findById(playerId).session(session || null);
    } else {
        user = await User.findOne({ username: playerId }).session(session || null);
    }

    if (!user && !autoCreate) {
        return { user: null, wallet: null };
    }

    if (!user) {
        const safeId = sanitizeEmailPart(playerId) || 'player';
        const uniqueEmail = `${safeId}-${Date.now()}@mock-wallet.local`;
        const created = await User.create(
            [
                {
                    username: playerId,
                    email: uniqueEmail,
                    password: `mock-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
                    role: 'user',
                },
            ],
            session ? { session } : {}
        );
        user = created[0];
    }

    let wallet = await Wallet.findOne({ userId: user._id }).session(session || null);
    if (!wallet) {
        const created = await Wallet.create(
            [{ userId: user._id, balance: DEFAULT_START_BALANCE }],
            session ? { session } : {}
        );
        wallet = created[0];
    }

    return { user, wallet };
}

/**
 * Atomic partner debit: balance + WalletTransaction + GameBetHistory (UI cache only).
 */
export async function executeGenericDebit({
    playerId,
    amount,
    transactionId,
    roundId,
    game,
    betNumber,
}) {
    const normalizedTransactionId = String(transactionId).trim();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { user, wallet } = await ensureWalletForPlayer(playerId, { session });
        if (!user || !wallet) {
            await session.abortTransaction();
            return { status: 404, body: { success: false, error: 'User not found' } };
        }

        const duplicateTxn = await WalletTransaction.findOne({
            userId: user._id,
            type: 'debit',
            referenceId: normalizedTransactionId,
        })
            .session(session)
            .lean();

        if (duplicateTxn) {
            await session.commitTransaction();
            return {
                status: 200,
                body: {
                    success: true,
                    duplicate: true,
                    data: {
                        playerId,
                        balance: wallet.balance,
                        transactionId: normalizedTransactionId,
                    },
                },
            };
        }

        if (wallet.balance < amount) {
            await session.abortTransaction();
            return {
                status: 400,
                body: {
                    success: false,
                    error: 'Insufficient balance',
                    data: { playerId, balance: wallet.balance },
                },
            };
        }

        wallet.balance -= amount;
        await wallet.save({ session });

        await WalletTransaction.create(
            [
                {
                    userId: user._id,
                    type: 'debit',
                    amount,
                    referenceId: normalizedTransactionId,
                    description: `Generic debit | roundId=${roundId || ''} | game=${game || ''} | betNumber=${betNumber || ''}`,
                },
            ],
            { session }
        );

        await recordPartnerGameDebit(
            {
                userId: user._id,
                roundId: roundId || normalizedTransactionId,
                gameCode: game,
                betNumber,
                betAmount: amount,
                debitTransactionId: normalizedTransactionId,
            },
            { session }
        );

        await session.commitTransaction();
        return {
            status: 200,
            body: {
                success: true,
                data: {
                    playerId,
                    balance: wallet.balance,
                    transactionId: normalizedTransactionId,
                },
            },
        };
    } catch (err) {
        await session.abortTransaction();
        throw err;
    } finally {
        session.endSession();
    }
}

/**
 * Atomic partner credit: balance + WalletTransaction + GameBetHistory (UI cache only).
 */
export async function executeGenericCredit({ playerId, amount, transactionId, roundId }) {
    const normalizedTransactionId = String(transactionId).trim();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { user, wallet } = await ensureWalletForPlayer(playerId, { session });
        if (!user || !wallet) {
            await session.abortTransaction();
            return { status: 404, body: { success: false, error: 'User not found' } };
        }

        const duplicateTxn = await WalletTransaction.findOne({
            userId: user._id,
            type: 'credit',
            referenceId: normalizedTransactionId,
        })
            .session(session)
            .lean();

        if (duplicateTxn) {
            await session.commitTransaction();
            return {
                status: 200,
                body: {
                    success: true,
                    duplicate: true,
                    data: {
                        playerId,
                        balance: wallet.balance,
                        transactionId: normalizedTransactionId,
                    },
                },
            };
        }

        wallet.balance += amount;
        await wallet.save({ session });

        await WalletTransaction.create(
            [
                {
                    userId: user._id,
                    type: 'credit',
                    amount,
                    referenceId: normalizedTransactionId,
                    description: `Generic credit | roundId=${roundId || ''}`,
                },
            ],
            { session }
        );

        await recordPartnerGameCredit(
            {
                userId: user._id,
                roundId,
                payout: amount,
                creditTransactionId: normalizedTransactionId,
            },
            { session }
        );

        await session.commitTransaction();
        return {
            status: 200,
            body: {
                success: true,
                data: {
                    playerId,
                    balance: wallet.balance,
                    transactionId: normalizedTransactionId,
                },
            },
        };
    } catch (err) {
        await session.abortTransaction();
        throw err;
    } finally {
        session.endSession();
    }
}
