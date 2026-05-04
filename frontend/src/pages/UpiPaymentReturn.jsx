import React, { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import UpiOutcomeModal from '../components/UpiOutcomeModal';

/**
 * Optional landing when UPI passes `url=https://yoursite/upi-return?ref=...` or user opens link manually.
 */
const UpiPaymentReturn = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const ref = searchParams.get('ref') || '';
    const gatewayStatus = (searchParams.get('status') || '').toLowerCase();

    const autoSubmitOutcome = useMemo(() => {
        if (gatewayStatus === 'success') return 'success';
        if (gatewayStatus === 'failure' || gatewayStatus === 'failed') return 'failed';
        return null;
    }, [gatewayStatus]);

    const amountFromSession = useMemo(() => {
        try {
            const raw = sessionStorage.getItem('upi_intent_pending_v2');
            if (!raw) return '';
            const { amount } = JSON.parse(raw);
            if (amount == null) return '';
            return `₹${Number(amount).toLocaleString('en-IN')}`;
        } catch {
            return '';
        }
    }, []);

    if (!ref) {
        return (
            <div className="min-h-[50vh] flex flex-col items-center justify-center px-4 text-center">
                <p className="text-gray-300 mb-4">Missing payment reference. Open Add Fund and try again.</p>
                <button
                    type="button"
                    onClick={() => navigate('/funds?tab=add-fund', { replace: true })}
                    className="px-6 py-3 rounded-xl bg-[#1a74e5] text-white font-semibold"
                >
                    Add Fund
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-[40vh] flex flex-col items-center justify-center px-4">
            <UpiOutcomeModal
                open
                intentRef={ref}
                amountLabel={amountFromSession}
                autoSubmitOutcome={autoSubmitOutcome}
                onClose={() => {}}
                onSuccess={() => {}}
                onFailed={() => {}}
                onResultAck={() => navigate('/passbook', { replace: true })}
            />
        </div>
    );
};

export default UpiPaymentReturn;
