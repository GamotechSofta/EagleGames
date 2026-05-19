import express from 'express';
import {
    genericWalletCredit,
    genericWalletDebit,
    getGenericWalletBalance,
    verifyGenericPartnerAuth,
} from '../../controllers/genericsController/genericWalletController.js';

const genericRouter = express.Router();

/** Public — CraftDigital / nginx can verify this URL is reachable (no auth). */
genericRouter.get('/health', (_req, res) => {
    res.status(200).json({
        success: true,
        service: 'eaglegames-generics-wallet',
        walletBalancePath: '/api/v1/generics/wallet/balance',
    });
});

genericRouter.use(verifyGenericPartnerAuth);

genericRouter.post('/wallet/balance', getGenericWalletBalance);
genericRouter.post('/wallet/balance/:playerId', getGenericWalletBalance);
genericRouter.post('/wallet/debit', genericWalletDebit);
genericRouter.post('/wallet/debit/:playerId', genericWalletDebit);
genericRouter.post('/wallet/credit', genericWalletCredit);
genericRouter.post('/wallet/credit/:playerId', genericWalletCredit);

export default genericRouter;
