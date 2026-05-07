import React, { useState, useEffect } from 'react';
import { API_BASE_URL, getAuthHeaders, fetchWithAuth } from '../../config/api';
import { useLanguage } from '../../context/LanguageContext';

const BankDetail = () => {
    const { t } = useLanguage();
    const [bankAccounts, setBankAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState({ title: '', subtitle: '' });
    
    // Form state
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        accountHolderName: '',
        accountNumber: '',
        ifscCode: '',
        bankName: '',
        upiId: '',
        accountType: 'savings',
    });
    const [submitting, setSubmitting] = useState(false);

    const user = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => {
        fetchBankAccounts();
    }, []);

    const fetchBankAccounts = async () => {
        if (!user.id) return;
        try {
            setLoading(true);
            const res = await fetchWithAuth(`${API_BASE_URL}/bank-details`, { headers: getAuthHeaders() });
            if (res.status === 401) return;
            const data = await res.json();
            if (data.success) {
                setBankAccounts(data.data || []);
            }
        } catch (err) {
            setError(t('bank_err_fetch'));
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            accountHolderName: '',
            accountNumber: '',
            ifscCode: '',
            bankName: '',
            upiId: '',
            accountType: 'savings',
        });
        setEditingId(null);
        setShowForm(false);
    };

    const handleEdit = (acc) => {
        setFormData({
            accountHolderName: acc.accountHolderName || '',
            accountNumber: acc.accountNumber || '',
            ifscCode: acc.ifscCode || '',
            bankName: acc.bankName || '',
            upiId: acc.upiId || '',
            accountType: acc.accountType || 'savings',
        });
        setEditingId(acc._id);
        setShowForm(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!formData.accountHolderName) {
            setError(t('bank_err_holder'));
            return;
        }

        if (!formData.upiId && (!formData.accountNumber || !formData.ifscCode)) {
            setError(t('bank_err_upiOrBank'));
            return;
        }

        setSubmitting(true);

        try {
            const url = editingId 
                ? `${API_BASE_URL}/bank-details/${editingId}`
                : `${API_BASE_URL}/bank-details`;
            
            const method = editingId ? 'PUT' : 'POST';

            const res = await fetchWithAuth(url, {
                method,
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify(formData),
            });
            if (res.status === 401) return;
            const data = await res.json();
            if (data.success) {
                setSuccessMessage({
                    title: editingId ? t('bank_successUpdateTitle') : t('bank_successAddTitle'),
                    subtitle: editingId ? t('bank_successUpdateSub') : t('bank_successAddSub'),
                });
                setShowSuccessModal(true);
                resetForm();
                fetchBankAccounts();
            } else {
                setError(data.message || t('bank_err_save'));
            }
        } catch (err) {
            setError(t('bank_err_network'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm(t('bank_confirmDelete'))) return;

        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/bank-details/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify({}),
            });
            if (res.status === 401) return;
            const data = await res.json();
            if (data.success) {
                setSuccess(t('bank_deleted'));
                fetchBankAccounts();
            } else {
                setError(data.message || t('bank_err_delete'));
            }
        } catch (err) {
            setError(t('bank_err_networkShort'));
        }
    };

    const handleSetDefault = async (id) => {
        try {
            const res = await fetchWithAuth(`${API_BASE_URL}/bank-details/${id}/set-default`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify({}),
            });
            if (res.status === 401) return;
            const data = await res.json();
            if (data.success) {
                setSuccess(t('bank_defaultUpdated'));
                fetchBankAccounts();
            }
        } catch (err) {
            setError(t('bank_err_setDefault'));
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-white">{t('bank_accountsTitle')}</h3>
                    <p className="text-gray-300 text-sm">{t('bank_accountsCount', { count: bankAccounts.length })}</p>
                </div>
                {bankAccounts.length < 5 && !showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="px-4 py-2 bg-[#1a74e5] hover:bg-[#1a74e5] text-white rounded-lg text-sm font-medium shadow-md"
                    >
                        {t('bank_addAccountBtn')}
                    </button>
                )}
            </div>

            {/* Messages */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-300 rounded-xl text-red-600 text-sm">
                    {error}
                </div>
            )}
            {success && (
                <div className="p-4 bg-green-50 border border-green-300 rounded-xl text-green-600 text-sm">
                    {success}
                </div>
            )}

            {/* Add/Edit Form */}
            {showForm && (
                <div className="bg-[#111827] rounded-xl p-5 border border-[#374151] shadow-md">
                    <h4 className="text-white font-semibold mb-4">
                        {editingId ? t('bank_editTitle') : t('bank_addTitle')}
                    </h4>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-gray-200 text-sm mb-1">
                                {t('bank_holderName')} <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.accountHolderName}
                                onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })}
                                className="w-full bg-[#111827] border border-[#374151] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#1B3150] focus:border-[#1a74e5]"
                                placeholder={t('bank_nameAsPerBank')}
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-gray-200 text-sm mb-1">{t('bank_bankName')}</label>
                                <input
                                    type="text"
                                    value={formData.bankName}
                                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                                    className="w-full bg-[#111827] border border-[#374151] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#1B3150] focus:border-[#1a74e5]"
                                    placeholder={t('bank_bankNamePh')}
                                />
                            </div>
                            <div>
                                <label className="block text-gray-200 text-sm mb-1">{t('bank_accountType')}</label>
                                <select
                                    value={formData.accountType}
                                    onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                                    className="w-full bg-[#111827] border border-[#374151] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#1B3150] focus:border-[#1a74e5]"
                                >
                                    <option value="savings">{t('bank_acctSavings')}</option>
                                    <option value="current">{t('bank_acctCurrent')}</option>
                                    <option value="upi_only">{t('bank_acctUpiOnly')}</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-gray-200 text-sm mb-1">{t('bank_accountNumber')}</label>
                                <input
                                    type="text"
                                    value={formData.accountNumber}
                                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                                    className="w-full bg-[#111827] border border-[#374151] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#1B3150] focus:border-[#1a74e5]"
                                    placeholder={t('bank_acctNumberPh')}
                                />
                            </div>
                            <div>
                                <label className="block text-gray-200 text-sm mb-1">{t('bank_ifsc')}</label>
                                <input
                                    type="text"
                                    value={formData.ifscCode}
                                    onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
                                    className="w-full bg-[#111827] border border-[#374151] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#1B3150] focus:border-[#1a74e5]"
                                    placeholder={t('bank_ifscPh')}
                                />
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-[#374151]"></div>
                            </div>
                            <div className="relative flex justify-center">
                                <span className="px-3 bg-[#111827] text-gray-500 text-sm">{t('bank_orDivider')}</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-gray-200 text-sm mb-1">{t('bank_upiId')}</label>
                            <input
                                type="text"
                                value={formData.upiId}
                                onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                                className="w-full bg-[#111827] border border-[#374151] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#1B3150] focus:border-[#1a74e5]"
                                    placeholder={t('bank_upiPh')}
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={resetForm}
                                className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-white rounded-lg font-medium transition-colors"
                            >
                                {t('bank_cancel')}
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex-1 py-3 bg-[#1a74e5] hover:bg-[#1a74e5] text-white rounded-lg font-medium disabled:opacity-50 shadow-md"
                            >
                                {submitting ? t('bank_saving') : (editingId ? t('bank_update') : t('bank_addAccountSubmit'))}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Bank Accounts List */}
            {loading ? (
                <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="text-gray-400 mt-3">{t('loading')}</p>
                </div>
            ) : bankAccounts.length === 0 ? (
                <div className="text-center py-8 bg-[#111827] rounded-xl border border-[#374151]">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 10h18M5 10v8m4-8v8m6-8v8m4-8v8M3 18h18M4 10l8-4 8 4" />
                    </svg>
                    <p className="text-gray-300">{t('bank_emptyTitle')}</p>
                    <p className="text-gray-500 text-sm mt-1">{t('bank_emptySub')}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {bankAccounts.map((acc) => (
                        <div
                            key={acc._id}
                            className={`bg-[#111827] rounded-xl p-4 border shadow-sm hover:shadow-md transition-shadow ${
                                acc.isDefault ? 'border-[#4b5563] bg-[#1f2937]' : 'border-[#374151]'
                            }`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-[#374151] rounded-full flex items-center justify-center">
                                        <svg className="w-6 h-6 text-[#1a74e5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M5 10v8m4-8v8m6-8v8m4-8v8M3 18h18M4 10l8-4 8 4" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-white font-semibold">{acc.accountHolderName}</p>
                                            {acc.isDefault && (
                                                <span className="px-2 py-0.5 bg-[#374151] text-[#1a74e5] text-xs rounded-full border border-[#4b5563]">
                                                    {t('withdraw_default')}
                                                </span>
                                            )}
                                        </div>
                                        {acc.bankName && (
                                            <p className="text-gray-300 text-sm">{acc.bankName}</p>
                                        )}
                                        {acc.accountNumber && (
                                            <p className="text-gray-500 text-sm">
                                                {t('bank_acShort')} ****{acc.accountNumber.slice(-4)} | {t('bank_ifscShort')} {acc.ifscCode}
                                            </p>
                                        )}
                                        {acc.upiId && (
                                            <p className="text-gray-500 text-sm">{t('bank_upiPrefix')} {acc.upiId}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                                {!acc.isDefault && (
                                    <button
                                        onClick={() => handleSetDefault(acc._id)}
                                        className="px-3 py-1.5 bg-[#374151] hover:bg-gray-300 text-[#1a74e5] rounded-lg text-xs border border-[#4b5563] transition-colors"
                                    >
                                        {t('bank_setDefault')}
                                    </button>
                                )}
                                <button
                                    onClick={() => handleEdit(acc)}
                                    className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs border border-blue-300 transition-colors"
                                >
                                    {t('bank_edit')}
                                </button>
                                <button
                                    onClick={() => handleDelete(acc._id)}
                                    className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs border border-red-300 transition-colors"
                                >
                                    {t('bank_delete')}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#111827] rounded-2xl max-w-sm w-full p-6 border border-[#374151] shadow-xl text-center">
                        {/* Success Icon */}
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>

                        <h3 className="text-xl font-bold text-white mb-2">{successMessage.title}</h3>
                        
                        <div className="bg-[#1f2937] rounded-xl p-4 mb-4 border border-[#374151]">
                            <svg className="w-12 h-12 text-[#1a74e5] mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 10h18M5 10v8m4-8v8m6-8v8m4-8v8M3 18h18M4 10l8-4 8 4" />
                            </svg>
                        </div>

                        <p className="text-gray-300 text-sm mb-6">
                            {successMessage.subtitle}
                        </p>

                        <div className="space-y-3">
                            <button
                                onClick={() => setShowSuccessModal(false)}
                                className="w-full py-3 bg-[#1a74e5] hover:bg-[#1a74e5] text-white font-semibold rounded-xl transition-colors shadow-md"
                            >
                                {t('addfund_done')}
                            </button>
                            <button
                                onClick={() => {
                                    setShowSuccessModal(false);
                                    window.location.href = '/funds?tab=withdraw-fund';
                                }}
                                className="w-full py-3 bg-[#111827] border border-[#4b5563] hover:bg-[#1f2937] text-[#1a74e5] font-medium rounded-xl transition-colors"
                            >
                                {t('bank_goWithdraw')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BankDetail;
