import mongoose from 'mongoose';

/**
 * Singleton row (singletonKey: 'default') — super-admin managed UPI / QR for platform players
 * (admin-created & self-signup). Bookie players still use each bookie's Admin fields.
 */
const platformPaymentSettingsSchema = new mongoose.Schema(
    {
        singletonKey: {
            type: String,
            default: 'default',
            unique: true,
            immutable: true,
        },
        playerDepositUpiId: {
            type: String,
            trim: true,
            default: '',
        },
        playerDepositUpiName: {
            type: String,
            trim: true,
            default: '',
        },
        playerDepositQrImageUrl: {
            type: String,
            trim: true,
            default: null,
        },
    },
    { timestamps: true }
);

const PlatformPaymentSettings = mongoose.model('PlatformPaymentSettings', platformPaymentSettingsSchema);
export default PlatformPaymentSettings;
