import express from 'express';
import multer from 'multer';
import { bookieLogin, bookieHeartbeat, getReferralLink, getProfile, updateTheme, updatePlayerDepositDetails } from '../../controllers/bookieController.js';
import { verifyAdmin, requireBookie } from '../../middleware/adminAuth.js';

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
    limits: { fileSize: 5 * 1024 * 1024 },
});

const router = express.Router();

router.post('/login', bookieLogin);
router.post('/heartbeat', verifyAdmin, requireBookie, bookieHeartbeat);
router.get('/referral-link', verifyAdmin, requireBookie, getReferralLink);
router.get('/profile', verifyAdmin, requireBookie, getProfile);
router.patch('/theme', verifyAdmin, requireBookie, updateTheme);
router.patch(
    '/player-deposit-details',
    verifyAdmin,
    requireBookie,
    upload.single('qrImage'),
    updatePlayerDepositDetails
);

export default router;
