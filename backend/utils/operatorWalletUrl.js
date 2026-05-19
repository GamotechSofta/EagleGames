/**
 * Public base URL CraftDigital calls for player validation (balance/debit/credit).
 * Configure in Gamotech dashboard AND set OPERATOR_WALLET_BASE_URL in .env.
 */
export function getOperatorWalletBaseUrl() {
    const explicit = String(process.env.OPERATOR_WALLET_BASE_URL || '').trim();
    if (explicit) return explicit.replace(/\/$/, '');

    const apiPublic = String(process.env.PUBLIC_GAME_BASE_URL || process.env.API_PUBLIC_URL || '').trim();
    if (apiPublic) return `${apiPublic.replace(/\/$/, '')}/api/v1/generics`;

    const port = Number(process.env.PORT) || 3010;
    return `http://localhost:${port}/api/v1/generics`;
}

/** Paths partner uses for wallet (document in CraftDigital / Gamotech). */
export function getOperatorWalletEndpoints() {
    const base = getOperatorWalletBaseUrl();
    return {
        base,
        balance: `${base}/wallet/balance`,
        debit: `${base}/wallet/debit`,
        credit: `${base}/wallet/credit`,
        legacyPartnerBalance: `${base.replace(/\/generics$/, '')}/partner/wallet`,
    };
}
