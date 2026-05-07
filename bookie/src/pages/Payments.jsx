import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { API_BASE_URL, getBookieAuthHeaders, getBookieAuthHeadersMultipart } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { FaEye, FaTimes, FaCheck, FaTimesCircle, FaCloudUploadAlt } from 'react-icons/fa';

const Payments = () => {
    const { t } = useLanguage();
    const { updateBookie } = useAuth();
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ status: '', type: '' });
    const [selectedScreenshot, setSelectedScreenshot] = useState(null);
    const [canManagePayments, setCanManagePayments] = useState(false);
    const [canManageOwnDepositQr, setCanManageOwnDepositQr] = useState(false);
    const [pdUpi, setPdUpi] = useState('');
    const [pdName, setPdName] = useState('');
    const [pdExistingQr, setPdExistingQr] = useState('');
    const [pdQrFile, setPdQrFile] = useState(null);
    const [pdNewQrPreview, setPdNewQrPreview] = useState(null);
    const [pdClearQr, setPdClearQr] = useState(false);
    const pdQrInputRef = useRef(null);
    const [pdSaving, setPdSaving] = useState(false);
    const [pdMsg, setPdMsg] = useState('');
    const [pdErr, setPdErr] = useState(false);
    const [actionModal, setActionModal] = useState({ show: false, payment: null, action: '' });
    const [adminRemarks, setAdminRemarks] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchProfile();
        fetchPayments();
    }, [filters]);

    useEffect(() => {
        if (!pdQrFile) {
            setPdNewQrPreview(null);
            return;
        }
        const url = URL.createObjectURL(pdQrFile);
        setPdNewQrPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [pdQrFile]);

    const fetchProfile = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/bookie/profile`, { headers: getBookieAuthHeaders() });
            const data = await response.json();
            if (data.success) {
                setCanManagePayments(data.data.canManagePayments || false);
                setCanManageOwnDepositQr(data.data.canManageOwnDepositQr || false);
                setPdUpi(data.data.playerDepositUpiId || '');
                setPdName(data.data.playerDepositUpiName || '');
                setPdExistingQr(data.data.playerDepositQrImageUrl || '');
                setPdQrFile(null);
                if (pdQrInputRef.current) pdQrInputRef.current.value = '';
                setPdClearQr(false);
                setPdMsg('');
                setPdErr(false);
            }
        } catch (err) {
            console.error('Failed to fetch profile:', err);
        }
    };

    const fetchPayments = async () => {
        try {
            setLoading(true);
            const q = new URLSearchParams();
            if (filters.status) q.append('status', filters.status);
            if (filters.type) q.append('type', filters.type);
            const response = await fetch(`${API_BASE_URL}/payments?${q}`, { headers: getBookieAuthHeaders() });
            const data = await response.json();
            if (data.success) setPayments(data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!actionModal.payment) return;
        setProcessing(true);
        try {
            const response = await fetch(`${API_BASE_URL}/payments/${actionModal.payment._id}/approve`, {
                method: 'POST',
                headers: getBookieAuthHeaders(),
                body: JSON.stringify({ adminRemarks }),
            });
            const data = await response.json();
            if (data.success) {
                if (data.bookieBalance != null) {
                    updateBookie({ balance: Number(data.bookieBalance) });
                }
                setActionModal({ show: false, payment: null, action: '' });
                setAdminRemarks('');
                fetchProfile();
                fetchPayments();
            } else {
                alert(data.message || 'Failed to approve payment');
            }
        } catch (err) {
            alert('Failed to approve payment');
        } finally {
            setProcessing(false);
        }
    };

    const handleSavePlayerDeposit = async (e) => {
        e.preventDefault();
        setPdMsg('');
        setPdErr(false);
        const upi = pdUpi.trim();
        if (!upi) {
            setPdMsg(t('playerDepositSaveFailed'));
            setPdErr(true);
            return;
        }
        setPdSaving(true);
        try {
            const fd = new FormData();
            fd.append('playerDepositUpiId', upi);
            fd.append('playerDepositUpiName', pdName.trim());
            if (pdQrFile) {
                fd.append('qrImage', pdQrFile);
            } else if (pdClearQr) {
                fd.append('playerDepositQrImageUrl', '');
            }
            const response = await fetch(`${API_BASE_URL}/bookie/player-deposit-details`, {
                method: 'PATCH',
                headers: getBookieAuthHeadersMultipart(),
                body: fd,
            });
            const data = await response.json();
            if (data.success) {
                setPdMsg(t('playerDepositSaved'));
                setPdErr(false);
                setPdExistingQr(data.data?.playerDepositQrImageUrl || '');
                setPdQrFile(null);
                if (pdQrInputRef.current) pdQrInputRef.current.value = '';
                setPdClearQr(false);
            } else {
                setPdMsg(data.message || t('playerDepositSaveFailed'));
                setPdErr(true);
            }
        } catch {
            setPdMsg(t('playerDepositSaveFailed'));
            setPdErr(true);
        } finally {
            setPdSaving(false);
        }
    };

    const handleReject = async () => {
        if (!actionModal.payment) return;
        setProcessing(true);
        try {
            const response = await fetch(`${API_BASE_URL}/payments/${actionModal.payment._id}/reject`, {
                method: 'POST',
                headers: getBookieAuthHeaders(),
                body: JSON.stringify({ adminRemarks }),
            });
            const data = await response.json();
            if (data.success) {
                setActionModal({ show: false, payment: null, action: '' });
                setAdminRemarks('');
                fetchPayments();
            } else {
                alert(data.message || 'Failed to reject payment');
            }
        } catch (err) {
            alert('Failed to reject payment');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <Layout title={t('payments')}>
            <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">
                {canManagePayments ? t('payments') : t('paymentsViewOnly')}
            </h1>
            {canManageOwnDepositQr && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 sm:p-5 mb-4 sm:mb-6">
                    <h2 className="text-lg font-bold text-emerald-900 mb-2">{t('playerDepositSettingsTitle')}</h2>
                    <p className="text-sm text-emerald-800 mb-4">{t('playerDepositSettingsHelp')}</p>
                    <form onSubmit={handleSavePlayerDeposit} className="space-y-3 max-w-lg">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('playerDepositUpiLabel')}</label>
                            <input
                                type="text"
                                value={pdUpi}
                                onChange={(e) => setPdUpi(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                                placeholder="name@upi"
                                autoComplete="off"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('playerDepositNameLabel')}</label>
                            <input
                                type="text"
                                value={pdName}
                                onChange={(e) => setPdName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                                placeholder=""
                                autoComplete="off"
                            />
                        </div>
                        <div>
                            <span className="block text-sm font-medium text-gray-700 mb-0.5">{t('playerDepositQrLabel')}</span>
                            <p className="text-xs text-gray-600 mb-3">{t('playerDepositQrHint')}</p>
                            <input
                                ref={pdQrInputRef}
                                id="pd-qr-upload"
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,image/webp"
                                className="hidden"
                                onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f && f.size > 5 * 1024 * 1024) {
                                        setPdMsg(t('playerDepositQrTooLarge'));
                                        setPdErr(true);
                                        e.target.value = '';
                                        return;
                                    }
                                    setPdQrFile(f || null);
                                    if (f) setPdClearQr(false);
                                }}
                            />
                            <div className="flex flex-col sm:flex-row gap-4 items-start">
                                <div className="shrink-0 w-[148px] h-[148px] rounded-xl border-2 border-dashed border-emerald-300 bg-white flex items-center justify-center overflow-hidden shadow-sm">
                                    {pdNewQrPreview ? (
                                        <img src={pdNewQrPreview} alt="" className="w-full h-full object-contain p-1" />
                                    ) : pdExistingQr && !pdClearQr ? (
                                        <img src={pdExistingQr} alt="" className="w-full h-full object-contain p-1" />
                                    ) : (
                                        <div className="text-center px-2 py-3 text-gray-500 text-xs leading-snug">
                                            {t('playerDepositQrNoImageYet')}
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col gap-2 min-w-0 flex-1">
                                    <label
                                        htmlFor="pd-qr-upload"
                                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold cursor-pointer transition-colors shadow-sm"
                                    >
                                        <FaCloudUploadAlt className="w-4 h-4 shrink-0" />
                                        {pdNewQrPreview || (pdExistingQr && !pdClearQr) ? t('playerDepositQrChange') : t('playerDepositQrUpload')}
                                    </label>
                                    {pdQrFile && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setPdQrFile(null);
                                                if (pdQrInputRef.current) pdQrInputRef.current.value = '';
                                            }}
                                            className="text-left text-sm text-amber-800 hover:text-amber-950 font-medium underline-offset-2 hover:underline"
                                        >
                                            {t('playerDepositQrDiscardNew')}
                                        </button>
                                    )}
                                    {pdExistingQr && !pdQrFile && (
                                        <label className="flex items-start gap-2.5 cursor-pointer text-sm text-gray-700 mt-1">
                                            <input
                                                type="checkbox"
                                                checked={pdClearQr}
                                                onChange={(e) => setPdClearQr(e.target.checked)}
                                                className="mt-1 w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                            />
                                            <span>{t('playerDepositClearQr')}</span>
                                        </label>
                                    )}
                                </div>
                            </div>
                        </div>
                        {pdMsg && <p className={`text-sm ${pdErr ? 'text-red-600' : 'text-green-700'}`}>{pdMsg}</p>}
                        <button
                            type="submit"
                            disabled={pdSaving}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium disabled:opacity-50"
                        >
                            {pdSaving ? '…' : t('playerDepositSave')}
                        </button>
                    </form>
                </div>
            )}
            <div className="bg-white rounded-lg p-4 mb-4 sm:mb-6 flex flex-wrap gap-3 items-center border border-gray-200">
                <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-800">
                    <option value="">{t('allStatus')}</option>
                    <option value="pending">{t('pending')}</option>
                    <option value="approved">{t('approved')}</option>
                    <option value="rejected">{t('rejected')}</option>
                    <option value="completed">{t('completed')}</option>
                </select>
                <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} className="px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-800">
                    <option value="">{t('allTypes')}</option>
                    <option value="deposit">{t('deposit')}</option>
                    <option value="withdrawal">{t('withdrawal')}</option>
                </select>
            </div>
            {loading ? (
                <p className="text-gray-400 py-12 text-center">{t('loading')}</p>
            ) : (
                <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">{t('player')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">{t('type')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">{t('amount')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">{t('method')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">{t('status')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Screenshot</th>
                                    {canManagePayments && <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Actions</th>}
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">{t('date')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {payments.length === 0 ? (
                                    <tr><td colSpan={canManagePayments ? 9 : 8} className="px-6 py-4 text-center text-gray-400">{t('noPaymentsFound')}</td></tr>
                                ) : (
                                    payments.map((p) => (
                                        <tr key={p._id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-sm">{p._id?.slice(-8)}</td>
                                            <td className="px-6 py-4 text-sm">{p.userId?.username || p.userId}</td>
                                            <td className="px-6 py-4 text-sm"><span className={`px-2 py-1 rounded text-xs text-white ${p.type === 'deposit' ? 'bg-green-600' : 'bg-blue-600'}`}>{p.type}</span></td>
                                            <td className="px-6 py-4 text-sm font-semibold">₹{p.amount?.toLocaleString('en-IN')}</td>
                                            <td className="px-6 py-4 text-sm">{p.method || 'N/A'}</td>
                                            <td className="px-6 py-4 text-sm"><span className={`px-2 py-1 rounded text-xs text-white ${p.status === 'approved' || p.status === 'completed' ? 'bg-green-600' : p.status === 'pending' ? 'bg-orange-600' : 'bg-red-600'}`}>{p.status}</span></td>
                                            <td className="px-6 py-4 text-sm">
                                                {p.screenshotUrl ? (
                                                    <button
                                                        onClick={() => {
                                                            const screenshotUrl = p.screenshotUrl.startsWith('http') 
                                                                ? p.screenshotUrl 
                                                                : `${API_BASE_URL}${p.screenshotUrl}`;
                                                            setSelectedScreenshot(screenshotUrl);
                                                        }}
                                                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-medium transition-colors"
                                                    >
                                                        <FaEye className="w-3 h-3" />
                                                        View
                                                    </button>
                                                ) : (
                                                    <span className="text-gray-400 text-xs">No screenshot</span>
                                                )}
                                            </td>
                                            {canManagePayments && (
                                                <td className="px-6 py-4 text-sm">
                                                    {p.status === 'pending' ? (
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => setActionModal({ show: true, payment: p, action: 'approve' })}
                                                                className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-medium transition-colors"
                                                            >
                                                                <FaCheck className="w-3 h-3" />
                                                                Approve
                                                            </button>
                                                            <button
                                                                onClick={() => setActionModal({ show: true, payment: p, action: 'reject' })}
                                                                className="flex items-center gap-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium transition-colors"
                                                            >
                                                                <FaTimesCircle className="w-3 h-3" />
                                                                Reject
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400 text-xs">-</span>
                                                    )}
                                                </td>
                                            )}
                                            <td className="px-6 py-4 text-sm">{new Date(p.createdAt).toLocaleString()}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Screenshot Modal */}
            {selectedScreenshot && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4" onClick={() => setSelectedScreenshot(null)}>
                    <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => setSelectedScreenshot(null)}
                            className="absolute top-4 right-4 z-10 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                        >
                            <FaTimes className="w-5 h-5" />
                        </button>
                        <img
                            src={selectedScreenshot}
                            alt="Payment Screenshot"
                            className="w-full h-auto max-h-[90vh] object-contain"
                            onError={(e) => {
                                e.target.src = 'https://via.placeholder.com/600x400?text=Image+Not+Found';
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Action Modal */}
            {actionModal.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4" onClick={() => !processing && setActionModal({ show: false, payment: null, action: '' })}>
                    <div className="relative bg-white rounded-lg p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-xl font-bold mb-4">
                            {actionModal.action === 'approve' ? 'Approve Payment' : 'Reject Payment'}
                        </h2>
                        <div className="mb-4">
                            <p className="text-sm text-gray-600 mb-2">
                                <strong>Player:</strong> {actionModal.payment?.userId?.username || 'N/A'}<br />
                                <strong>Type:</strong> {actionModal.payment?.type}<br />
                                <strong>Amount:</strong> ₹{actionModal.payment?.amount?.toLocaleString('en-IN')}
                            </p>
                        </div>
                        {/* Show screenshot for deposits */}
                        {actionModal.payment?.type === 'deposit' && actionModal.payment?.screenshotUrl && (
                            <div className="mb-4">
                                <p className="text-gray-600 text-sm mb-2 font-medium">Payment Screenshot:</p>
                                <div className="relative">
                                    <img
                                        src={actionModal.payment.screenshotUrl.startsWith('http') 
                                            ? actionModal.payment.screenshotUrl 
                                            : `${API_BASE_URL}${actionModal.payment.screenshotUrl}`}
                                        alt="Payment proof"
                                        className="w-full max-h-48 object-contain rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                                        onClick={() => {
                                            const screenshotUrl = actionModal.payment.screenshotUrl.startsWith('http') 
                                                ? actionModal.payment.screenshotUrl 
                                                : `${API_BASE_URL}${actionModal.payment.screenshotUrl}`;
                                            setSelectedScreenshot(screenshotUrl);
                                        }}
                                        onError={(e) => {
                                            e.target.src = 'https://via.placeholder.com/600x400?text=Image+Not+Found';
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Remarks (Optional)</label>
                            <textarea
                                value={adminRemarks}
                                onChange={(e) => setAdminRemarks(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                rows="3"
                                placeholder="Add remarks..."
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={actionModal.action === 'approve' ? handleApprove : handleReject}
                                disabled={processing}
                                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                                    actionModal.action === 'approve'
                                        ? 'bg-green-500 hover:bg-green-600 text-white'
                                        : 'bg-red-500 hover:bg-red-600 text-white'
                                } disabled:opacity-50`}
                            >
                                {processing ? 'Processing...' : actionModal.action === 'approve' ? 'Approve' : 'Reject'}
                            </button>
                            <button
                                onClick={() => {
                                    setActionModal({ show: false, payment: null, action: '' });
                                    setAdminRemarks('');
                                }}
                                disabled={processing}
                                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default Payments;
