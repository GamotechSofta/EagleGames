import PlatformPaymentSettings from '../models/platformPaymentSettings/platformPaymentSettings.js';
import { uploadToCloudinary } from '../config/cloudinary.js';
import { logActivity, getClientIp } from '../utils/activityLogger.js';
import {
    getPlatformPlayerDepositResolved,
    DEFAULT_PLATFORM_UPI,
    DEFAULT_PLATFORM_UPAYEE,
} from '../utils/platformPlayerDepositConfig.js';

/**
 * Super admin: current platform player deposit settings (stored + effective).
 */
export const getPlatformPlayerDepositSettings = async (req, res) => {
    try {
        const doc = await PlatformPaymentSettings.findOne({ singletonKey: 'default' }).lean();
        const effective = await getPlatformPlayerDepositResolved();
        res.status(200).json({
            success: true,
            data: {
                stored: {
                    playerDepositUpiId: doc?.playerDepositUpiId?.trim() || '',
                    playerDepositUpiName: doc?.playerDepositUpiName?.trim() || '',
                    playerDepositQrImageUrl: doc?.playerDepositQrImageUrl?.trim() || '',
                },
                effective,
                defaults: {
                    upiId: DEFAULT_PLATFORM_UPI,
                    upiName: DEFAULT_PLATFORM_UPAYEE,
                },
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Super admin: save platform UPI / optional QR for admin & self-signup players.
 */
export const updatePlatformPlayerDepositSettings = async (req, res) => {
    try {
        const upiRaw = req.body.playerDepositUpiId;
        const nameRaw = req.body.playerDepositUpiName;
        const urlRaw = req.body.playerDepositQrImageUrl;

        const upiId = upiRaw != null ? String(upiRaw).trim() : '';
        const upiName = nameRaw != null ? String(nameRaw).trim() : '';

        if (!upiId) {
            return res.status(400).json({ success: false, message: 'UPI ID is required' });
        }

        let qrUrl = undefined;
        if (req.file?.buffer) {
            const uploadResult = await uploadToCloudinary(req.file.buffer, 'platform-deposit-qr');
            qrUrl = uploadResult.secure_url;
        } else if (urlRaw !== undefined) {
            const v = urlRaw === null || urlRaw === '' ? '' : String(urlRaw).trim();
            qrUrl = v === '' ? null : v;
        }

        const update = {
            playerDepositUpiId: upiId,
            playerDepositUpiName: upiName,
            ...(qrUrl !== undefined ? { playerDepositQrImageUrl: qrUrl } : {}),
        };

        const doc = await PlatformPaymentSettings.findOneAndUpdate(
            { singletonKey: 'default' },
            { $set: update },
            { upsert: true, new: true }
        ).lean();

        await logActivity({
            action: 'platform_player_deposit_settings_updated',
            performedBy: req.admin?.username || 'super_admin',
            performedByType: 'admin',
            targetType: 'platform',
            targetId: 'default',
            details: 'Platform player add-fund UPI/QR updated',
            ip: getClientIp(req),
        });

        const effective = await getPlatformPlayerDepositResolved();

        res.status(200).json({
            success: true,
            message: 'Platform payment details saved',
            data: {
                stored: {
                    playerDepositUpiId: doc.playerDepositUpiId || '',
                    playerDepositUpiName: doc.playerDepositUpiName || '',
                    playerDepositQrImageUrl: doc.playerDepositQrImageUrl || '',
                },
                effective,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
