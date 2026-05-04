import crypto from 'crypto';
import Payment from '../models/payment/payment.js';
import BankDetail from '../models/bankDetail/bankDetail.js';
import { Wallet, WalletTransaction } from '../models/wallet/wallet.js';
import Admin from '../models/admin/admin.js';
import User from '../models/user/user.js';
import bcrypt from 'bcryptjs';
import { getBookieUserIds } from '../utils/bookieFilter.js';
import { logActivity, getClientIp } from '../utils/activityLogger.js';
import { uploadToCloudinary } from '../config/cloudinary.js';

// ============ CONFIG API ============

/**
 * Get payment configuration (UPI details, limits).
 * Optional Bearer (player JWT): if the user belongs to a bookie with canManageOwnDepositQr and
 * playerDepositUpiId set, returns that bookie's UPI/QR for add-fund; otherwise platform defaults.
 */
export const getPaymentConfig = async (req, res) => {
    try {
        const minDeposit = parseInt(process.env.MIN_DEPOSIT, 10) || 1;
        const maxDeposit = parseInt(process.env.MAX_DEPOSIT, 10) || 50000;
        const minWithdrawal = parseInt(process.env.MIN_WITHDRAWAL, 10) || 500;
        const maxWithdrawal = parseInt(process.env.MAX_WITHDRAWAL, 10) || 25000;

        let data = {
            upiId: process.env.UPI_ID || 'mahajananurag629@oksbi',
            upiName: process.env.UPI_NAME || 'Golden Games',
            qrImageUrl: process.env.PLAYER_DEPOSIT_QR_URL?.trim() || null,
            minDeposit,
            maxDeposit,
            minWithdrawal,
            maxWithdrawal,
            depositSource: 'platform',
        };

        if (req.userId) {
            const user = await User.findById(req.userId).select('referredBy').lean();
            const bookieId = user?.referredBy;
            if (bookieId) {
                const bookie = await Admin.findById(bookieId)
                    .select('role canManageOwnDepositQr playerDepositUpiId playerDepositUpiName playerDepositQrImageUrl username')
                    .lean();
                const upi = bookie?.playerDepositUpiId && String(bookie.playerDepositUpiId).trim();
                if (
                    bookie &&
                    bookie.role === 'bookie' &&
                    bookie.canManageOwnDepositQr === true &&
                    upi
                ) {
                    const name =
                        (bookie.playerDepositUpiName && String(bookie.playerDepositUpiName).trim()) ||
                        bookie.username ||
                        data.upiName;
                    const qr =
                        bookie.playerDepositQrImageUrl && String(bookie.playerDepositQrImageUrl).trim();
                    data = {
                        ...data,
                        upiId: upi,
                        upiName: name,
                        qrImageUrl: qr || null,
                        depositSource: 'bookie',
                    };
                }
            }
        }

        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============ USER APIs ============

/**
 * User: Create deposit request with screenshot
 */
export const createDepositRequest = async (req, res) => {
    try {
        const { amount, upiTransactionId, userNote } = req.body;
        const userId = req.userId;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }

        const minDeposit = parseInt(process.env.MIN_DEPOSIT, 10) || 1;
        const maxDeposit = parseInt(process.env.MAX_DEPOSIT) || 50000;

        // Parse amount as number
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount)) {
            console.error('❌ Invalid amount:', amount);
            return res.status(400).json({
                success: false,
                message: 'Invalid amount. Please enter a valid number.',
            });
        }

        if (!numAmount || numAmount < minDeposit || numAmount > maxDeposit) {
            console.error('❌ Amount out of range:', numAmount);
            return res.status(400).json({
                success: false,
                message: `Amount must be between ₹${minDeposit} and ₹${maxDeposit}`,
            });
        }

        // Upload screenshot to Cloudinary
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Screenshot is required for deposit requests.',
            });
        }

        if (!req.file.buffer) {
            return res.status(400).json({
                success: false,
                message: 'Invalid file. Please upload a valid image file.',
            });
        }

        // Upload screenshot to Cloudinary
        let screenshotUrl = null;
        try {
            // Check if Cloudinary is configured
            const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
            const apiKey = process.env.CLOUDINARY_API_KEY;
            const apiSecret = process.env.CLOUDINARY_API_SECRET;
            
            if (!cloudName || !apiKey || !apiSecret) {
                console.error('❌ Cloudinary credentials not configured');
                console.error('Missing variables:');
                if (!cloudName) console.error('  - CLOUDINARY_CLOUD_NAME');
                if (!apiKey) console.error('  - CLOUDINARY_API_KEY');
                if (!apiSecret) console.error('  - CLOUDINARY_API_SECRET');
                console.error('\n💡 Solution: Create Games/backend/.env with Cloudinary credentials from https://console.cloudinary.com/');
                console.error('   CLOUDINARY_CLOUD_NAME=your_cloud_name');
                console.error('   CLOUDINARY_API_KEY=your_api_key');
                console.error('   CLOUDINARY_API_SECRET=your_api_secret');
                console.error('\n   Then restart the backend server.\n');
                
                return res.status(500).json({
                    success: false,
                    message: 'Server configuration error: Cloudinary credentials not set. Please check backend .env file and restart server.',
                });
            }

            console.log('☁️ Uploading to Cloudinary...');
            const uploadResult = await uploadToCloudinary(req.file.buffer, 'payments');
            screenshotUrl = uploadResult.secure_url;
        } catch (uploadError) {
            console.error('❌ Cloudinary upload error:', uploadError);
            console.error('Error details:', {
                message: uploadError.message,
                name: uploadError.name,
                stack: uploadError.stack
            });
            return res.status(500).json({
                success: false,
                message: uploadError.message || 'Failed to upload screenshot. Please try again.',
            });
        }

        console.log('💾 Creating payment record...');
        const payment = await Payment.create({
            userId,
            type: 'deposit',
            amount: numAmount,
            method: 'upi',
            status: 'pending',
            depositChannel: 'screenshot',
            screenshotUrl: screenshotUrl,
            upiTransactionId: upiTransactionId || '',
            userNote: userNote || '',
        });
        console.log('✅ Payment created:', payment._id);

        await logActivity({
            action: 'deposit_request_created',
            performedBy: userId,
            performedByType: 'user',
            targetType: 'payment',
            targetId: payment._id.toString(),
            details: `Deposit request ₹${amount} created`,
            ip: getClientIp(req),
        });

        console.log('✅ Deposit request completed successfully');
        res.status(201).json({
            success: true,
            message: 'Deposit request submitted successfully. Please wait for admin approval.',
            data: payment,
        });
    } catch (error) {
        console.error('❌ Deposit request error:', error);
        console.error('Error stack:', error.stack);
        console.error('Error details:', {
            message: error.message,
            name: error.name,
            code: error.code
        });
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Internal server error. Please try again later.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * User: Start UPI in-app deposit — creates pending payment and returns intent ref for `tr=` in UPI URL.
 */
export const startUpiDepositIntent = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }

        const minDeposit = parseInt(process.env.MIN_DEPOSIT, 10) || 1;
        const maxDeposit = parseInt(process.env.MAX_DEPOSIT, 10) || 50000;
        const numAmount = parseFloat(req.body?.amount);
        if (!Number.isFinite(numAmount) || numAmount < minDeposit || numAmount > maxDeposit) {
            return res.status(400).json({
                success: false,
                message: `Amount must be between ₹${minDeposit} and ₹${maxDeposit}`,
            });
        }

        await Payment.deleteMany({
            userId,
            type: 'deposit',
            depositChannel: 'upi_intent',
            status: 'pending',
        });

        const upiIntentRef = crypto.randomBytes(10).toString('hex');

        const payment = await Payment.create({
            userId,
            type: 'deposit',
            amount: numAmount,
            method: 'upi',
            status: 'pending',
            depositChannel: 'upi_intent',
            upiIntentRef,
            upiTransactionId: '',
        });

        return res.status(201).json({
            success: true,
            data: { intentRef: upiIntentRef, paymentId: payment._id, amount: numAmount },
        });
    } catch (error) {
        console.error('startUpiDepositIntent:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * User: After returning from UPI app, confirm success or failure (no screenshot).
 * Success: credits wallet + passbook entry (same bookie-balance rules as admin approve).
 */
export const finishUpiDepositIntent = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }

        const intentRef = String(req.body?.intentRef || '').trim();
        const outcome = String(req.body?.outcome || '').toLowerCase();
        if (!intentRef) {
            return res.status(400).json({ success: false, message: 'intentRef is required' });
        }
        if (outcome !== 'success' && outcome !== 'failed') {
            return res.status(400).json({ success: false, message: 'outcome must be success or failed' });
        }

        const payment = await Payment.findOne({
            userId,
            upiIntentRef: intentRef,
            depositChannel: 'upi_intent',
            status: 'pending',
            type: 'deposit',
        }).populate('userId');

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'No pending payment found for this session. Start add fund again.',
            });
        }

        if (outcome === 'failed') {
            payment.status = 'rejected';
            payment.adminRemarks = 'UPI payment failed or cancelled (reported after return)';
            payment.processedAt = new Date();
            await payment.save();

            await WalletTransaction.create({
                userId,
                type: 'credit',
                amount: 0,
                description: 'UPI add fund — failed / cancelled (not credited)',
                referenceId: String(payment._id),
            });

            await logActivity({
                action: 'payment_deposit_upi_intent_failed',
                performedBy: userId,
                performedByType: 'user',
                targetType: 'payment',
                targetId: String(payment._id),
                details: `UPI intent deposit marked failed ₹${payment.amount}`,
                ip: getClientIp(req),
            });

            return res.status(200).json({
                success: true,
                data: { status: 'rejected', payment },
            });
        }

        let updatedBookieBalance = null;

        if (payment.type === 'deposit') {
            const ownerBookieId = payment.userId?.referredBy;
            if (ownerBookieId) {
                const ownerBookie = await Admin.findById(ownerBookieId).select('role canManagePayments');
                if (ownerBookie && ownerBookie.role === 'bookie' && ownerBookie.canManagePayments) {
                    const updatedBookie = await Admin.findOneAndUpdate(
                        { _id: ownerBookie._id, balance: { $gte: payment.amount } },
                        { $inc: { balance: -payment.amount } },
                        { new: true }
                    ).select('balance');

                    if (!updatedBookie) {
                        return res.status(400).json({
                            success: false,
                            message:
                                'Agent wallet is insufficient to credit this deposit. Please contact support.',
                        });
                    }
                    updatedBookieBalance = Number(updatedBookie.balance || 0);
                }
            }
        }

        payment.status = 'approved';
        payment.adminRemarks = 'Credited via UPI (confirmed after app return)';
        payment.processedAt = new Date();
        await payment.save();

        let wallet = await Wallet.findOne({ userId: payment.userId._id });
        if (!wallet) {
            wallet = new Wallet({ userId: payment.userId._id, balance: 0 });
        }
        wallet.balance += payment.amount;
        await wallet.save();

        await WalletTransaction.create({
            userId: payment.userId._id,
            type: 'credit',
            amount: payment.amount,
            description: 'Add fund (UPI)',
            referenceId: String(payment._id),
        });

        await logActivity({
            action: 'payment_deposit_upi_intent_credited',
            performedBy: userId,
            performedByType: 'user',
            targetType: 'payment',
            targetId: String(payment._id),
            details: `UPI intent deposit credited ₹${payment.amount}`,
            ip: getClientIp(req),
        });

        return res.status(200).json({
            success: true,
            data: {
                status: 'approved',
                payment,
                walletBalance: wallet.balance,
                ...(updatedBookieBalance !== null ? { bookieBalance: updatedBookieBalance } : {}),
            },
        });
    } catch (error) {
        console.error('finishUpiDepositIntent:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * User: Cancel pending UPI intent (e.g. closed pay picker without paying).
 */
export const cancelUpiDepositIntent = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const intentRef = String(req.body?.intentRef || '').trim();
        if (!intentRef) {
            return res.status(400).json({ success: false, message: 'intentRef is required' });
        }

        const result = await Payment.deleteOne({
            userId,
            upiIntentRef: intentRef,
            depositChannel: 'upi_intent',
            status: 'pending',
            type: 'deposit',
        });

        return res.status(200).json({ success: true, data: { deleted: result.deletedCount > 0 } });
    } catch (error) {
        console.error('cancelUpiDepositIntent:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * User: Create withdrawal request
 */
export const createWithdrawalRequest = async (req, res) => {
    try {
        const userId = req.userId;
        const { amount, bankDetailId, userNote } = req.body;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }

        const minWithdrawal = parseInt(process.env.MIN_WITHDRAWAL) || 500;
        const maxWithdrawal = parseInt(process.env.MAX_WITHDRAWAL) || 25000;

        if (!amount || amount < minWithdrawal || amount > maxWithdrawal) {
            return res.status(400).json({
                success: false,
                message: `Amount must be between ₹${minWithdrawal} and ₹${maxWithdrawal}`,
            });
        }

        // Check wallet balance
        const wallet = await Wallet.findOne({ userId });
        if (!wallet || wallet.balance < amount) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient wallet balance',
            });
        }

        // Validate bank detail if provided
        if (bankDetailId) {
            const bankDetail = await BankDetail.findOne({ _id: bankDetailId, userId, isActive: true });
            if (!bankDetail) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid bank account selected',
                });
            }
        }

        // Check for pending withdrawal
        const pendingWithdrawal = await Payment.findOne({
            userId,
            type: 'withdrawal',
            status: 'pending',
        });

        if (pendingWithdrawal) {
            return res.status(400).json({
                success: false,
                message: 'You already have a pending withdrawal request. Please wait for it to be processed.',
            });
        }

        const payment = await Payment.create({
            userId,
            type: 'withdrawal',
            amount,
            method: 'bank_transfer',
            status: 'pending',
            bankDetailId: bankDetailId || null,
            userNote: userNote || '',
        });

        await logActivity({
            action: 'withdrawal_request_created',
            performedBy: userId,
            performedByType: 'user',
            targetType: 'payment',
            targetId: payment._id.toString(),
            details: `Withdrawal request ₹${amount} created`,
            ip: getClientIp(req),
        });

        res.status(201).json({
            success: true,
            message: 'Withdrawal request submitted successfully. Please wait for admin approval.',
            data: payment,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * User: Get my deposit history. Requires verifyUser (JWT).
 */
export const getMyDeposits = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }

        const deposits = await Payment.find({ userId, type: 'deposit' })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        // Process deposits - use Cloudinary URL if available, otherwise fallback to buffer endpoint
        const depositsWithScreenshotUrl = deposits.map(deposit => {
            const depositObj = { ...deposit };
            // If screenshotUrl exists (Cloudinary), use it directly
            // Otherwise, if old buffer exists, use the endpoint
            if (!depositObj.screenshotUrl && deposit.screenshot && deposit.screenshot.data) {
                depositObj.screenshotUrl = `/api/v1/payments/my-screenshot/${deposit._id}`;
            }
            // Remove the actual buffer data from response
            if (depositObj.screenshot) {
                delete depositObj.screenshot.data;
            }
            return depositObj;
        });

        res.status(200).json({ success: true, data: depositsWithScreenshotUrl });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * User: Get my withdrawal history. Requires verifyUser (JWT).
 */
export const getMyWithdrawals = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }

        const withdrawals = await Payment.find({ userId, type: 'withdrawal' })
            .populate('bankDetailId', 'accountHolderName bankName accountNumber upiId')
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        res.status(200).json({ success: true, data: withdrawals });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============ ADMIN APIs ============

/**
 * Admin: Get all payments with filters
 */
export const getPayments = async (req, res) => {
    try {
        const { status, type } = req.query;
        const query = {};

        const bookieUserIds = await getBookieUserIds(req.admin);
        if (bookieUserIds !== null) {
            query.userId = { $in: bookieUserIds };
        }
        if (status) query.status = status;
        if (type) query.type = type;

        const payments = await Payment.find(query)
            .populate('userId', 'username email phone')
            .populate('bankDetailId', 'accountHolderName bankName accountNumber upiId ifscCode')
            .populate('processedBy', 'username')
            .sort({ createdAt: -1 })
            .limit(1000)
            .lean();

        // Process payments - use Cloudinary URL if available, otherwise fallback to buffer endpoint
        const paymentsWithScreenshotUrl = payments.map(payment => {
            const paymentObj = { ...payment };
            // If screenshotUrl exists (Cloudinary), use it directly
            // Otherwise, if old buffer exists, use the endpoint
            if (!paymentObj.screenshotUrl && payment.screenshot && payment.screenshot.data) {
                paymentObj.screenshotUrl = `/api/v1/payments/${payment._id}/screenshot`;
            }
            // Remove the actual buffer data from response
            if (paymentObj.screenshot) {
                delete paymentObj.screenshot.data;
            }
            return paymentObj;
        });

        res.status(200).json({ success: true, data: paymentsWithScreenshotUrl });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get payment screenshot image
 * For admin: can view any screenshot (via /:id/screenshot)
 * For users: can only view their own screenshots (via /my-screenshot/:id with userId query)
 * 
 * Note: New payments use Cloudinary URLs (screenshotUrl), old payments may have buffer data
 */
export const getPaymentScreenshot = async (req, res) => {
    try {
        const { id } = req.params;
        const payment = await Payment.findById(id).select('screenshot screenshotUrl userId');

        // If not admin (req.admin is undefined), user route: require ownership via req.userId
        if (!req.admin) {
            const userId = req.userId;
            if (!userId || !payment || payment.userId.toString() !== userId) {
                return res.status(403).json({ success: false, message: 'Access denied' });
            }
        }

        // If Cloudinary URL exists, redirect to it
        if (payment && payment.screenshotUrl) {
            return res.redirect(payment.screenshotUrl);
        }

        // Fallback to buffer data for old payments
        if (!payment || !payment.screenshot || !payment.screenshot.data) {
            return res.status(404).json({ success: false, message: 'Screenshot not found' });
        }

        res.set('Content-Type', payment.screenshot.contentType || 'image/jpeg');
        res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
        res.send(payment.screenshot.data);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Admin: Get pending payments count
 */
export const getPendingCount = async (req, res) => {
    try {
        const query = { status: 'pending' };
        
        const bookieUserIds = await getBookieUserIds(req.admin);
        if (bookieUserIds !== null) {
            query.userId = { $in: bookieUserIds };
        }

        const depositCount = await Payment.countDocuments({ ...query, type: 'deposit' });
        const withdrawalCount = await Payment.countDocuments({ ...query, type: 'withdrawal' });

        res.status(200).json({
            success: true,
            data: {
                deposits: depositCount,
                withdrawals: withdrawalCount,
                total: depositCount + withdrawalCount,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Admin: Approve payment
 * Body: { adminRemarks?: string, secretDeclarePassword?: string } – secret required if admin has it set
 * Access: Super admin always allowed, bookie allowed if canManagePayments is true
 */
export const approvePayment = async (req, res) => {
    try {
        // Check if admin has permission to manage payments
        const admin = await Admin.findById(req.admin._id);
        if (!admin) {
            return res.status(403).json({ success: false, message: 'Admin not found' });
        }

        // Super admin always has permission, bookie needs canManagePayments
        if (admin.role === 'bookie' && !admin.canManagePayments) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to manage payments. Please contact super admin.',
            });
        }

        const adminWithSecret = await Admin.findById(req.admin._id).select('+secretDeclarePassword').lean();
        if (adminWithSecret?.secretDeclarePassword) {
            const provided = (req.body.secretDeclarePassword ?? '').toString().trim();
            const isValid = await bcrypt.compare(provided, adminWithSecret.secretDeclarePassword);
            if (!isValid) {
                return res.status(403).json({
                    success: false,
                    message: 'Invalid secret declare password',
                    code: 'INVALID_SECRET_DECLARE_PASSWORD',
                });
            }
        }

        const { id } = req.params;
        const { adminRemarks } = req.body;

        const payment = await Payment.findById(id).populate('userId');
        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        if (payment.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Payment is not pending' });
        }

        // Bookie can only process their own players' payment requests.
        if (
            admin.role === 'bookie' &&
            String(payment.userId?.referredBy || '') !== String(admin._id)
        ) {
            return res.status(403).json({
                success: false,
                message: 'You can only process payments for your own players',
            });
        }

        let updatedBookieBalance = null;
        let deductedBookieId = null;

        // Deduct from the owner bookie when payment management is enabled for that bookie.
        // This keeps behavior correct even if approval comes via different admin route.
        if (payment.type === 'deposit') {
            const ownerBookieId = payment.userId?.referredBy;
            if (ownerBookieId) {
                const ownerBookie = await Admin.findById(ownerBookieId).select('role canManagePayments');
                if (ownerBookie && ownerBookie.role === 'bookie' && ownerBookie.canManagePayments) {
                    const updatedBookie = await Admin.findOneAndUpdate(
                        { _id: ownerBookie._id, balance: { $gte: payment.amount } },
                        { $inc: { balance: -payment.amount } },
                        { new: true }
                    ).select('balance');

                    if (!updatedBookie) {
                        return res.status(400).json({
                            success: false,
                            message: 'Insufficient bookie balance to approve this add-fund request',
                        });
                    }
                    deductedBookieId = String(ownerBookie._id);
                    updatedBookieBalance = Number(updatedBookie.balance || 0);
                }
            }
        }

        // For withdrawals, check balance again
        if (payment.type === 'withdrawal') {
            const wallet = await Wallet.findOne({ userId: payment.userId._id });
            if (!wallet || wallet.balance < payment.amount) {
                return res.status(400).json({
                    success: false,
                    message: 'User has insufficient balance for this withdrawal',
                });
            }
        }

        // Update payment status
        payment.status = 'approved';
        payment.adminRemarks = adminRemarks || 'Approved';
        payment.processedBy = req.admin._id;
        payment.processedAt = new Date();
        await payment.save();

        // Update wallet
        let wallet = await Wallet.findOne({ userId: payment.userId._id });
        if (!wallet) {
            wallet = new Wallet({ userId: payment.userId._id, balance: 0 });
        }

        if (payment.type === 'deposit') {
            wallet.balance += payment.amount;
        } else if (payment.type === 'withdrawal') {
            wallet.balance -= payment.amount;
        }
        await wallet.save();

        await logActivity({
            action: `payment_${payment.type}_approved`,
            performedBy: req.admin?.username || 'Admin',
            performedByType: req.admin?.role || 'admin',
            targetType: 'payment',
            targetId: id,
            details: `${payment.type === 'deposit' ? 'Deposit' : 'Withdrawal'} ₹${payment.amount} approved for "${payment.userId?.username}"`,
            meta: {
                paymentId: id,
                type: payment.type,
                amount: payment.amount,
                bookieDeducted: deductedBookieId !== null,
                deductedBookieId,
            },
            ip: getClientIp(req),
        });

        res.status(200).json({
            success: true,
            message: `${payment.type === 'deposit' ? 'Deposit' : 'Withdrawal'} approved successfully`,
            data: payment,
            ...(updatedBookieBalance !== null ? { bookieBalance: updatedBookieBalance } : {}),
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Admin: Reject payment
 * Access: Super admin always allowed, bookie allowed if canManagePayments is true
 */
export const rejectPayment = async (req, res) => {
    try {
        // Check if admin has permission to manage payments
        const admin = await Admin.findById(req.admin._id);
        if (!admin) {
            return res.status(403).json({ success: false, message: 'Admin not found' });
        }

        // Super admin always has permission, bookie needs canManagePayments
        if (admin.role === 'bookie' && !admin.canManagePayments) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to manage payments. Please contact super admin.',
            });
        }

        const { id } = req.params;
        const { adminRemarks } = req.body;

        const payment = await Payment.findById(id).populate('userId');
        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        if (payment.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Payment is not pending' });
        }

        if (
            admin.role === 'bookie' &&
            String(payment.userId?.referredBy || '') !== String(admin._id)
        ) {
            return res.status(403).json({
                success: false,
                message: 'You can only process payments for your own players',
            });
        }

        payment.status = 'rejected';
        payment.adminRemarks = adminRemarks || 'Rejected';
        payment.processedBy = req.admin._id;
        payment.processedAt = new Date();
        await payment.save();

        await logActivity({
            action: `payment_${payment.type}_rejected`,
            performedBy: req.admin?.username || 'Admin',
            performedByType: req.admin?.role || 'admin',
            targetType: 'payment',
            targetId: id,
            details: `${payment.type === 'deposit' ? 'Deposit' : 'Withdrawal'} ₹${payment.amount} rejected for "${payment.userId?.username}"`,
            meta: { paymentId: id, type: payment.type, amount: payment.amount, reason: adminRemarks },
            ip: getClientIp(req),
        });

        res.status(200).json({
            success: true,
            message: `${payment.type === 'deposit' ? 'Deposit' : 'Withdrawal'} rejected`,
            data: payment,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Legacy: Update payment status (kept for backward compatibility)
 */
export const updatePaymentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, adminRemarks } = req.body;

        if (status === 'approved') {
            req.body.adminRemarks = adminRemarks;
            return approvePayment(req, res);
        } else if (status === 'rejected') {
            req.body.adminRemarks = adminRemarks;
            return rejectPayment(req, res);
        }

        const payment = await Payment.findById(id).populate('userId');
        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        payment.status = status;
        if (adminRemarks) payment.adminRemarks = adminRemarks;
        payment.processedBy = req.admin._id;
        payment.processedAt = new Date();
        await payment.save();

        res.status(200).json({ success: true, data: payment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
