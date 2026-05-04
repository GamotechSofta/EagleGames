import express from 'express';
import multer from 'multer';
import {
    getPaymentConfig,
    createDepositRequest,
    createWithdrawalRequest,
    getMyDeposits,
    getMyWithdrawals,
    getPayments,
    getPendingCount,
    approvePayment,
    rejectPayment,
    updatePaymentStatus,
    getPaymentScreenshot,
    startUpiDepositIntent,
    finishUpiDepositIntent,
    cancelUpiDepositIntent,
} from '../../controllers/paymentController.js';
import { verifyAdmin, verifySuperAdmin } from '../../middleware/adminAuth.js';
import { verifyUser, optionalVerifyUser } from '../../middleware/userAuth.js';

// Configure multer with memory storage for database storage
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const router = express.Router();

// ===== Public API (optional player JWT returns bookie-specific deposit UPI/QR when applicable) =====
router.get('/config', optionalVerifyUser, getPaymentConfig);

// ===== User APIs (player JWT required; userId from token) =====
router.post('/deposit', verifyUser, upload.single('screenshot'), createDepositRequest);
router.post('/upi-intent/start', verifyUser, startUpiDepositIntent);
router.post('/upi-intent/finish', verifyUser, finishUpiDepositIntent);
router.post('/upi-intent/cancel', verifyUser, cancelUpiDepositIntent);
router.post('/withdraw', verifyUser, createWithdrawalRequest);
router.get('/my-deposits', verifyUser, getMyDeposits);
router.get('/my-withdrawals', verifyUser, getMyWithdrawals);
router.get('/my-screenshot/:id', verifyUser, getPaymentScreenshot);

// ===== Admin APIs =====
router.get('/', verifyAdmin, getPayments);
router.get('/pending-count', verifyAdmin, getPendingCount);
router.get('/:id/screenshot', verifyAdmin, getPaymentScreenshot);
router.post('/:id/approve', verifyAdmin, approvePayment);
router.post('/:id/reject', verifyAdmin, rejectPayment);
router.patch('/:id/status', verifySuperAdmin, updatePaymentStatus);

export default router;
