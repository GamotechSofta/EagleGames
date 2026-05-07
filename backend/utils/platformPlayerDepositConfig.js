import PlatformPaymentSettings from '../models/platformPaymentSettings/platformPaymentSettings.js';

export const DEFAULT_PLATFORM_UPI = 'neelamkarande23@okicici';
export const DEFAULT_PLATFORM_UPAYEE = 'Neelam Karande';

/**
 * Resolved UPI / display name / QR URL for platform (non-bookie) Add Fund.
 * Priority: database (super admin UI) → env → code defaults.
 */
export async function getPlatformPlayerDepositResolved() {
    const doc = await PlatformPaymentSettings.findOne({ singletonKey: 'default' }).lean();

    const dbUpi = doc?.playerDepositUpiId && String(doc.playerDepositUpiId).trim();
    const dbName = doc?.playerDepositUpiName && String(doc.playerDepositUpiName).trim();
    const dbQr = doc?.playerDepositQrImageUrl && String(doc.playerDepositQrImageUrl).trim();

    const envUpi = process.env.UPI_ID?.trim();
    const envName = process.env.UPI_NAME?.trim();
    const envQr = process.env.PLAYER_DEPOSIT_QR_URL?.trim() || null;

    return {
        upiId: dbUpi || envUpi || DEFAULT_PLATFORM_UPI,
        upiName: dbName || envName || DEFAULT_PLATFORM_UPAYEE,
        qrImageUrl: dbQr || envQr || null,
    };
}
