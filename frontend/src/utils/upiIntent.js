/** Session flag: user opened a UPI app and may return without hitting /upi-return */
export const UPI_INTENT_SESSION_KEY = 'upi_intent_pending_v2';

/**
 * NPCI-style UPI intent. Optional `tr` matches server payment intent; `url` may open in browser after pay (app-dependent).
 */
export function buildUpiPayUri(pa, payeeName, amount, { tr, returnUrl } = {}) {
    const am = Number(amount);
    if (!pa || !Number.isFinite(am) || am <= 0) return '';
    const parts = [];
    parts.push(`pa=${encodeURIComponent(pa)}`);
    const pn = String(payeeName || '').trim();
    if (pn) parts.push(`pn=${encodeURIComponent(pn)}`);
    if (tr) parts.push(`tr=${encodeURIComponent(tr)}`);
    parts.push(`am=${encodeURIComponent(am.toFixed(2))}`);
    parts.push('cu=INR');
    if (returnUrl) parts.push(`url=${encodeURIComponent(returnUrl)}`);
    return `upi://pay?${parts.join('&')}`;
}

export function getUpiPayQueryString(upiPayUri) {
    if (!upiPayUri || !upiPayUri.startsWith('upi://pay')) return '';
    const q = upiPayUri.indexOf('?');
    return q === -1 ? '' : upiPayUri.slice(q + 1);
}

export const UPI_APP_DEEP_LINKS = [
    { id: 'gpay', label: 'Google Pay', build: (qs) => `tez://upi/pay?${qs}` },
    { id: 'phonepe', label: 'PhonePe', build: (qs) => `phonepe://pay?${qs}` },
    { id: 'paytm', label: 'Paytm', build: (qs) => `paytmmp://pay?${qs}` },
];
