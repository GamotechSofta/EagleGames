import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { FaCloudUploadAlt, FaCheck, FaExclamationCircle } from 'react-icons/fa';
import { getAuthHeadersMultipart, clearAdminSession, fetchWithAuth } from '../lib/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3010/api/v1';

const PlatformPlayerDeposit = () => {
    const navigate = useNavigate();
    const [upi, setUpi] = useState('');
    const [name, setName] = useState('');
    const [existingQr, setExistingQr] = useState('');
    const [qrFile, setQrFile] = useState(null);
    const [qrPreview, setQrPreview] = useState(null);
    const [clearQr, setClearQr] = useState(false);
    const [effective, setEffective] = useState({ upiId: '', upiName: '', qrImageUrl: null });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');
    const [err, setErr] = useState(false);
    const fileRef = useRef(null);

    useEffect(() => {
        try {
            const a = JSON.parse(localStorage.getItem('admin') || '{}');
            if (a.role !== 'super_admin') {
                navigate('/dashboard', { replace: true });
            }
        } catch {
            navigate('/', { replace: true });
        }
    }, [navigate]);

    useEffect(() => {
        if (!qrFile) {
            setQrPreview(null);
            return;
        }
        const url = URL.createObjectURL(qrFile);
        setQrPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [qrFile]);

    const load = async () => {
        setLoading(true);
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/admin/platform/player-deposit-settings`);
            if (res.status === 401) return;
            const json = await res.json();
            if (json.success && json.data) {
                const { stored, effective: eff } = json.data;
                setUpi(stored.playerDepositUpiId || eff.upiId || '');
                setName(stored.playerDepositUpiName || eff.upiName || '');
                setExistingQr(stored.playerDepositQrImageUrl || '');
                setEffective(eff || {});
                setQrFile(null);
                if (fileRef.current) fileRef.current.value = '';
                setClearQr(false);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const handleLogout = () => {
        clearAdminSession();
        navigate('/');
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        setMsg('');
        setErr(false);
        const u = upi.trim();
        if (!u) {
            setMsg('UPI ID is required');
            setErr(true);
            return;
        }
        setSaving(true);
        try {
            const fd = new FormData();
            fd.append('playerDepositUpiId', u);
            fd.append('playerDepositUpiName', name.trim());
            if (qrFile) {
                fd.append('qrImage', qrFile);
            } else if (clearQr) {
                fd.append('playerDepositQrImageUrl', '');
            }
            const res = await fetch(`${API_BASE_URL}/admin/platform/player-deposit-settings`, {
                method: 'PATCH',
                headers: getAuthHeadersMultipart(),
                body: fd,
            });
            if (res.status === 401) {
                clearAdminSession();
                window.location.href = '/';
                return;
            }
            const json = await res.json();
            if (json.success) {
                setMsg(json.message || 'Saved');
                setErr(false);
                setExistingQr(json.data?.stored?.playerDepositQrImageUrl || '');
                setEffective(json.data?.effective || {});
                setQrFile(null);
                if (fileRef.current) fileRef.current.value = '';
                setClearQr(false);
            } else {
                setMsg(json.message || 'Failed to save');
                setErr(true);
            }
        } catch {
            setMsg('Network error');
            setErr(true);
        } finally {
            setSaving(false);
        }
    };

    return (
        <AdminLayout onLogout={handleLogout} title="Player deposit (UPI)">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Platform player Add Fund</h1>
            <p className="text-sm text-gray-500 mb-6 max-w-2xl">
                UPI and QR shown to <span className="font-semibold text-gray-700">admin-created</span> and{' '}
                <span className="font-semibold text-gray-700">self-signup</span> players. Bookie-referred players use
                each bookie&apos;s own settings. Values saved here override env when set.
            </p>

            {loading ? (
                <p className="text-gray-500">Loading…</p>
            ) : (
                <form onSubmit={onSubmit} className="max-w-xl space-y-5 bg-white rounded-xl border border-gray-200 p-5 sm:p-6 shadow-sm">
                    <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-900">
                        <p className="font-semibold mb-1">What players see now (resolved)</p>
                        <p>
                            <span className="text-gray-600">UPI:</span>{' '}
                            <span className="font-mono font-medium">{effective.upiId || '—'}</span>
                        </p>
                        {effective.upiName ? (
                            <p>
                                <span className="text-gray-600">Name:</span> {effective.upiName}
                            </p>
                        ) : null}
                        {effective.qrImageUrl ? (
                            <p className="mt-2">
                                <span className="text-gray-600">QR:</span>{' '}
                                <a href={effective.qrImageUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline text-xs break-all">
                                    {effective.qrImageUrl}
                                </a>
                            </p>
                        ) : (
                            <p className="text-xs text-amber-800/80 mt-1">No hosted QR — player app may use its bundled image as fallback.</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">UPI ID *</label>
                        <input
                            type="text"
                            value={upi}
                            onChange={(e) => setUpi(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            placeholder="name@upi"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Payee name (optional)</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            placeholder="Shown in UPI apps"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">QR code image</label>
                        {existingQr && !clearQr && !qrFile && (
                            <div className="mb-2 flex items-start gap-3">
                                <img src={existingQr} alt="Current QR" className="w-24 h-24 object-contain border rounded" />
                                <label className="flex items-center gap-2 text-sm text-red-600 cursor-pointer">
                                    <input type="checkbox" checked={clearQr} onChange={(e) => setClearQr(e.target.checked)} />
                                    Remove saved QR (use env or app default)
                                </label>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                id="qr-upload"
                                onChange={(e) => {
                                    setClearQr(false);
                                    setQrFile(e.target.files?.[0] || null);
                                }}
                            />
                            <label
                                htmlFor="qr-upload"
                                className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm cursor-pointer"
                            >
                                <FaCloudUploadAlt /> Choose image
                            </label>
                            {qrPreview && <img src={qrPreview} alt="New preview" className="w-20 h-20 object-contain border rounded" />}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">JPEG, PNG, or WebP · max 5 MB</p>
                    </div>

                    {msg && (
                        <div
                            className={`flex items-center gap-2 text-sm ${
                                err ? 'text-red-600' : 'text-green-600'
                            }`}
                        >
                            {err ? <FaExclamationCircle /> : <FaCheck />}
                            {msg}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full sm:w-auto px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg disabled:opacity-50"
                    >
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                </form>
            )}
        </AdminLayout>
    );
};

export default PlatformPlayerDeposit;
