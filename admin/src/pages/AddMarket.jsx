import React, { useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import MarketForm from '../components/MarketForm';
import { useNavigate } from 'react-router-dom';

import { useLanguage } from '../context/LanguageContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3010/api/v1';
import { getAuthHeaders, clearAdminSession } from '../lib/auth';

const AddMarket = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [showForm, setShowForm] = useState(true);

    const handleLogout = () => {
        clearAdminSession();
        navigate('/');
    };

    const handleFormClose = () => {
        navigate('/dashboard');
    };

    return (
        <AdminLayout onLogout={handleLogout} title={t('title_addMarketPage')}>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-6">{t('add_market_heading')}</h1>
                    {showForm && (
                        <MarketForm
                            market={null}
                            onClose={handleFormClose}
                            onSuccess={handleFormClose}
                            apiBaseUrl={API_BASE_URL}
                            getAuthHeaders={getAuthHeaders}
                        />
                    )}
        </AdminLayout>
    );
};

export default AddMarket;
