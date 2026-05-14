import express from 'express';
import {
    verifyGenericPartnerAuth,
    getGenericWalletBalance,
    genericWalletDebit,
    genericWalletCredit,
} from '../../controllers/genericsController/genericWalletController.js';

/**
 * Mock / partner wallet contract (POST + JSON body), e.g. Aviator control plane.
 * Mount at `/wallet` → POST /wallet/balance, /wallet/debit, /wallet/credit
 */
const router = express.Router();

router.use(verifyGenericPartnerAuth);

router.post('/balance', getGenericWalletBalance);
router.post('/debit', genericWalletDebit);
router.post('/credit', genericWalletCredit);

export default router;
