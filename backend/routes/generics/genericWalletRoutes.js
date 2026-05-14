import express from 'express';
import {
    verifyGenericPartnerAuth,
    getGenericWalletBalance,
    genericWalletDebit,
    genericWalletCredit,
} from '../../controllers/genericsController/genericWalletController.js';

const router = express.Router();

router.use(verifyGenericPartnerAuth);

router.post('/balance', getGenericWalletBalance);
router.get('/:playerId/balance', getGenericWalletBalance);
router.post('/debit', genericWalletDebit);
router.post('/credit', genericWalletCredit);

export default router;
