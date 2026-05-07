import Admin from '../models/admin/admin.js';
import { logActivity, getClientIp } from '../utils/activityLogger.js';
import { signAdminToken } from '../utils/adminJwt.js';
import { uploadToCloudinary } from '../config/cloudinary.js';

/**
 * Bookie login - only allows users with role 'bookie' and status 'active'
 * Body: { phone, password } or { username, password } (phone preferred; bookies log in with phone + password)
 */
export const bookieLogin = async (req, res) => {
    try {
        const { username, phone, password } = req.body;

        const loginIdentifier = phone || username;
        if (!loginIdentifier || !password) {
            return res.status(400).json({
                success: false,
                message: 'Phone number (or username) and password are required',
            });
        }

        const normalizedPhone = phone ? String(phone).replace(/\D/g, '').slice(0, 10) : '';

        let bookie = null;
        // Try to find by phone first (if phone is provided and valid)
        if (normalizedPhone.length >= 10) {
            // Try exact match first
            bookie = await Admin.findOne({ phone: normalizedPhone, role: 'bookie' });
            // If not found, try finding by any phone format (in case stored differently)
            if (!bookie) {
                const allBookies = await Admin.find({ role: 'bookie' }).select('phone username').lean();
                const matched = allBookies.find((b) => {
                    if (!b.phone) return false;
                    const storedPhone = String(b.phone).replace(/\D/g, '').slice(0, 10);
                    return storedPhone === normalizedPhone;
                });
                if (matched) {
                    bookie = await Admin.findOne({ _id: matched._id, role: 'bookie' });
                }
            }
        }
        // If still not found and username provided, try username
        if (!bookie && username) {
            bookie = await Admin.findOne({ username: String(username).trim(), role: 'bookie' });
        }
        if (!bookie) {
            // Check if any bookie accounts exist at all (for debugging)
            const bookieCount = await Admin.countDocuments({ role: 'bookie' });
            return res.status(401).json({
                success: false,
                message: bookieCount === 0 
                    ? 'No bookie accounts found. Please contact admin to create your account.'
                    : 'Invalid credentials. Please check your phone number and password. If you don\'t have an account, contact admin.',
            });
        }

        // Check if bookie account is active
        if (bookie.status === 'inactive') {
            return res.status(403).json({
                success: false,
                message: 'Your account has been suspended. Please contact admin for assistance.',
                code: 'ACCOUNT_SUSPENDED',
            });
        }

        const isPasswordValid = await bookie.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials. Please check your phone number and password.',
            });
        }

        await logActivity({
            action: 'bookie_login',
            performedBy: bookie.username,
            performedByType: 'bookie',
            targetType: 'admin',
            targetId: bookie._id.toString(),
            details: `Bookie "${bookie.username}" logged in (Bookie Panel)`,
            ip: getClientIp(req),
        });

        const token = signAdminToken(bookie);
        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                id: bookie._id,
                username: bookie.username,
                role: bookie.role,
                email: bookie.email,
                phone: bookie.phone,
                balance: bookie.balance || 0,
                uiTheme: bookie.uiTheme || { themeId: 'default' },
                token,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Bookie heartbeat - checks if account is still active (for auto-logout when suspended)
 * Requires verifyAdmin (bookie Basic Auth)
 */
export const bookieHeartbeat = async (req, res) => {
    try {
        const bookie = req.admin;
        if (!bookie || bookie.role !== 'bookie') {
            return res.status(403).json({ success: false, message: 'Bookie access required', code: 'ACCOUNT_SUSPENDED' });
        }
        if (bookie.status === 'inactive') {
            return res.status(403).json({
                success: false,
                message: 'Your account has been suspended.',
                code: 'ACCOUNT_SUSPENDED',
            });
        }
        res.status(200).json({ success: true, message: 'OK' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get bookie's referral link - requires bookie auth via verifyAdmin
 * Returns bookieId for frontend to construct URL
 */
export const getReferralLink = async (req, res) => {
    try {
        const bookie = await Admin.findOne({ _id: req.admin._id, role: 'bookie' });
        if (!bookie) {
            return res.status(403).json({
                success: false,
                message: 'Bookie access required',
            });
        }
        /** Public URL of the player app (e.g. https://www.eaglegames.fun). Optional; bookie UI builds links via VITE_FRONTEND_URL too. */
        const playerAppBase = (process.env.PLAYER_APP_URL || '').replace(/\/$/, '');
        res.status(200).json({
            success: true,
            data: {
                bookieId: bookie._id,
                username: bookie.username,
                /** Full player-app URL when PLAYER_APP_URL is set in backend env */
                referralUrl: playerAppBase ? `${playerAppBase}/login?ref=${bookie._id}` : null,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get bookie profile (including uiTheme) - requires bookie auth
 */
export const getProfile = async (req, res) => {
    try {
        const bookie = await Admin.findOne({ _id: req.admin._id, role: 'bookie' })
            .select('-password')
            .lean();
        if (!bookie) {
            return res.status(403).json({ success: false, message: 'Bookie access required' });
        }
        res.status(200).json({
            success: true,
            data: {
                id: bookie._id,
                username: bookie.username,
                email: bookie.email,
                phone: bookie.phone,
                role: bookie.role,
                balance: bookie.balance || 0,
                uiTheme: bookie.uiTheme || { themeId: 'default' },
                canManagePayments: bookie.canManagePayments || false,
                canManageOwnDepositQr: bookie.canManageOwnDepositQr || false,
                playerDepositUpiId: bookie.playerDepositUpiId || '',
                playerDepositUpiName: bookie.playerDepositUpiName || '',
                playerDepositQrImageUrl: bookie.playerDepositQrImageUrl || '',
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Bookie: set UPI / display name / QR for their players' add-fund screen.
 * Requires canManageOwnDepositQr (super admin must enable). QR image optional (file or existing URL).
 */
export const updatePlayerDepositDetails = async (req, res) => {
    try {
        const bookie = await Admin.findOne({ _id: req.admin._id, role: 'bookie' });
        if (!bookie) {
            return res.status(403).json({ success: false, message: 'Bookie access required' });
        }
        if (!bookie.canManageOwnDepositQr) {
            return res.status(403).json({
                success: false,
                message: 'Own deposit UPI/QR is not enabled for your account. Ask super admin to enable it.',
            });
        }

        const upiRaw = req.body.playerDepositUpiId;
        const nameRaw = req.body.playerDepositUpiName;
        const urlRaw = req.body.playerDepositQrImageUrl;

        const upiId = upiRaw != null ? String(upiRaw).trim() : '';
        const upiName = nameRaw != null ? String(nameRaw).trim() : '';

        let qrUrl = bookie.playerDepositQrImageUrl || null;
        if (req.file?.buffer) {
            const uploadResult = await uploadToCloudinary(req.file.buffer, 'bookie-deposit-qr');
            qrUrl = uploadResult.secure_url;
        } else if (urlRaw !== undefined) {
            const v = urlRaw === null || urlRaw === '' ? '' : String(urlRaw).trim();
            qrUrl = v || null;
        }

        bookie.playerDepositUpiId = upiId || null;
        bookie.playerDepositUpiName = upiName || null;
        bookie.playerDepositQrImageUrl = qrUrl;
        await bookie.save();

        await logActivity({
            action: 'bookie_player_deposit_details_updated',
            performedBy: bookie.username,
            performedByType: 'bookie',
            targetType: 'admin',
            targetId: bookie._id.toString(),
            details: 'Player add-fund UPI/QR updated',
            ip: getClientIp(req),
        });

        res.status(200).json({
            success: true,
            message: 'Player payment details saved',
            data: {
                playerDepositUpiId: bookie.playerDepositUpiId || '',
                playerDepositUpiName: bookie.playerDepositUpiName || '',
                playerDepositQrImageUrl: bookie.playerDepositQrImageUrl || '',
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Update bookie's UI theme (for their users' panel) - requires bookie auth
 * Body: { themeId?, primaryColor?, accentColor? }
 */
export const updateTheme = async (req, res) => {
    try {
        const bookie = await Admin.findOne({ _id: req.admin._id, role: 'bookie' });
        if (!bookie) {
            return res.status(403).json({ success: false, message: 'Bookie access required' });
        }
        const { themeId, primaryColor, accentColor } = req.body;
        const validThemeIds = ['default', 'gold', 'blue', 'green', 'red', 'purple'];
        if (!bookie.uiTheme) bookie.uiTheme = { themeId: 'default' };
        if (themeId && validThemeIds.includes(themeId)) bookie.uiTheme.themeId = themeId;
        if (primaryColor !== undefined) bookie.uiTheme.primaryColor = primaryColor ? String(primaryColor).trim() : undefined;
        if (accentColor !== undefined) bookie.uiTheme.accentColor = accentColor ? String(accentColor).trim() : undefined;
        await bookie.save();
        res.status(200).json({
            success: true,
            message: 'Theme updated',
            data: { uiTheme: bookie.uiTheme },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
