import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { FaLink } from 'react-icons/fa';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL, getBookieAuthHeaders, getReferralUrl } from '../utils/api';

const ReferralLinkPage = () => {
    const { t } = useLanguage();
    const { bookie } = useAuth();
    const [copied, setCopied] = useState(false);
    const [displayUrl, setDisplayUrl] = useState('');

    useEffect(() => {
        const fallback = bookie?.id ? getReferralUrl(bookie.id) : '';
        setDisplayUrl(fallback);

        let cancelled = false;
        const load = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/bookie/referral-link`, {
                    headers: getBookieAuthHeaders(),
                });
                const data = await res.json();
                if (cancelled || !data.success || !data.data) return;
                const serverUrl = data.data.referralUrl;
                if (typeof serverUrl === 'string' && serverUrl.startsWith('http')) {
                    setDisplayUrl(serverUrl);
                }
            } catch {
                /* keep fallback */
            }
        };
        load();
        return () => {
            cancelled = true;
        };
    }, [bookie?.id]);

    const copy = () => {
        if (!displayUrl) return;
        navigator.clipboard?.writeText(displayUrl).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <Layout title={t('referralLink')}>
            <div className="max-w-3xl">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{t('referralLinkTitle')}</h1>
                <p className="text-gray-600 text-sm sm:text-base mb-6">{t('referralLinkBlurb')}</p>

                <div className="rounded-xl border border-orange-200 bg-orange-50/90 p-4 sm:p-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white">
                            <FaLink className="w-6 h-6" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold uppercase tracking-wider text-orange-800/80 mb-2">
                                {t('referralLink')}
                            </p>
                            {displayUrl ? (
                                <p className="break-all font-mono text-sm text-gray-900 leading-relaxed">{displayUrl}</p>
                            ) : (
                                <p className="text-sm text-gray-600">{t('referralLinkUnavailable')}</p>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={copy}
                            disabled={!displayUrl}
                            className="shrink-0 rounded-lg bg-[#1B3150] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#152642] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {copied ? t('linkCopied') : t('copyLink')}
                        </button>
                    </div>
                </div>

                <p className="mt-4 text-xs text-gray-500">{t('referralLinkEnvHint')}</p>
            </div>
        </Layout>
    );
};

export default ReferralLinkPage;
