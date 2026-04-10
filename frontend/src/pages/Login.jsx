import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const AUTH_SIDE_IMAGE =
  'https://res.cloudinary.com/dwwt5xdsz/image/upload/q_auto/f_auto/v1775826445/d40e37c1-bd75-4081-96ba-5bdf1a39a53c.png';

const Login = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState('signin');
  const [formData, setFormData] = useState({
    username: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isAbove18, setIsAbove18] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;
    
    // Only allow digits for phone number
    if (name === 'phone') {
      processedValue = value.replace(/\D/g, '').slice(0, 10);
    }
    
    setFormData({
      ...formData,
      [name]: processedValue,
    });
    setError('');
    setSuccess('');
  };

  const handleSignInSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!isAbove18) {
      setError('You must be above 18 years to continue');
      return;
    }

    // Login validation
    if (!formData.phone) {
      setError('Phone number is required');
      return;
    }
    if (!formData.password) {
      setError('Password is required');
      return;
    }

    setLoading(true);

    try {
      let deviceId = '';
      try {
        deviceId = typeof localStorage !== 'undefined' ? (localStorage.getItem('deviceId') || '') : '';
        if (!deviceId) {
          deviceId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `web-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('deviceId', deviceId);
          }
        }
      } catch (e) {
        deviceId = `web-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      }

      const response = await fetch(`${API_BASE_URL}/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          phone: formData.phone, 
          password: formData.password, 
          deviceId: deviceId || undefined 
        }),
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        setError('Invalid response from server. Please try again.');
        setLoading(false);
        return;
      }

      if (data.success) {
        // Store user data
        const previousUser = localStorage.getItem('user');
        let previousCreatedAt = null;
        if (previousUser) {
          try {
            const parsed = JSON.parse(previousUser);
            previousCreatedAt = parsed?.createdAt || parsed?.created_at || parsed?.createdOn || null;
          } catch (e) {
            previousCreatedAt = null;
          }
        }

        const userPayload = {
          ...data.data,
          createdAt: data.data?.createdAt || data.data?.created_at || data.data?.createdOn || previousCreatedAt
        };

        localStorage.setItem('user', JSON.stringify(userPayload));
        // Dispatch custom event to update navbar
        window.dispatchEvent(new Event('userLogin'));
        // Redirect to home after login
        navigate('/');
      } else {
        setError(data.message || 'Something went wrong');
      }
    } catch (err) {
      setError('Network error. Please check if the server is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!isAbove18) {
      setError('You must be above 18 years to continue');
      return;
    }
    if (!formData.username.trim()) {
      setError('Name is required');
      return;
    }
    if (!formData.phone) {
      setError('Phone number is required');
      return;
    }
    if (!formData.password) {
      setError('Password is required');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/users/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username.trim(),
          phone: formData.phone,
          password: formData.password,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setSuccess('Sign up successful. Please sign in with phone and password.');
        setMode('signin');
        setFormData((prev) => ({
          ...prev,
          password: '',
          confirmPassword: '',
        }));
      } else {
        setError(data.message || 'Unable to create account');
      }
    } catch (_) {
      setError('Network error. Please check if the server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1220] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-3xl border border-[#233047] bg-[#0f172a] shadow-[0_24px_70px_rgba(0,0,0,0.45)] md:grid-cols-2">
          <div className="relative p-5 sm:p-7 lg:p-10">
          <div className="absolute inset-0 md:hidden">
            <img
              src={AUTH_SIDE_IMAGE}
              alt=""
              className="h-full w-full object-cover opacity-35"
            />
            <div className="absolute inset-0 bg-[#0b1220]/75" />
          </div>
          <div className="relative z-10 mb-6">
            <h1 className="text-2xl font-bold text-[#60a5fa] sm:text-3xl">{mode === 'signin' ? 'Sign In' : 'Sign Up'}</h1>
            <p className="mt-1 text-sm text-gray-300">
              {mode === 'signin' ? 'Access your account to continue.' : 'Create your own player account.'}
            </p>
            <div className="mt-4 grid grid-cols-2 rounded-xl border border-[#334155] bg-[#0b1220] p-1">
              <button
                type="button"
                onClick={() => { setMode('signin'); setError(''); setSuccess(''); }}
                className={`rounded-lg py-2 text-sm font-semibold transition ${mode === 'signin' ? 'bg-[#1a74e5] text-white' : 'text-gray-200 hover:bg-[#1f2937]'}`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}
                className={`rounded-lg py-2 text-sm font-semibold transition ${mode === 'signup' ? 'bg-[#1a74e5] text-white' : 'text-gray-200 hover:bg-[#1f2937]'}`}
              >
                Sign Up
              </button>
            </div>
          </div>

          {success && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={mode === 'signin' ? handleSignInSubmit : handleSignUpSubmit} className="relative z-10 space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-200">
                    Full Name <span className="text-[#1a74e5]">*</span>
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-[#334155] bg-[#0b1220] py-2.5 px-3 text-sm text-white placeholder-gray-400 focus:border-[#1a74e5] focus:outline-none focus:ring-2 focus:ring-[#1B3150]/20"
                    placeholder="Enter your full name"
                    required
                  />
                </div>
              </>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-200">
                Phone Number <span className="text-[#1a74e5]">*</span>
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  maxLength="10"
                  className="w-full rounded-xl border border-[#334155] bg-[#0b1220] py-2.5 pl-10 pr-3 text-sm text-white placeholder-gray-400 focus:border-[#1a74e5] focus:outline-none focus:ring-2 focus:ring-[#1B3150]/20"
                  placeholder="10-digit phone number"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-200">
                Password <span className="text-[#1a74e5]">*</span>
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-[#334155] bg-[#0b1220] py-2.5 pl-10 pr-10 text-sm text-white placeholder-gray-400 focus:border-[#1a74e5] focus:outline-none focus:ring-2 focus:ring-[#1B3150]/20"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-[#1a74e5]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <FaEyeSlash className="h-5 w-5" /> : <FaEye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-200">
                  Confirm Password <span className="text-[#1a74e5]">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-[#334155] bg-[#0b1220] py-2.5 px-3 pr-10 text-sm text-white placeholder-gray-400 focus:border-[#1a74e5] focus:outline-none focus:ring-2 focus:ring-[#1B3150]/20"
                    placeholder="Re-enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-[#1a74e5]"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? <FaEyeSlash className="h-5 w-5" /> : <FaEye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  checked={isAbove18}
                  onChange={(e) => setIsAbove18(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-[#374151] text-[#1a74e5] focus:ring-[#1B3150]"
                />
                <span className="text-xs leading-5 text-gray-300">
                  I confirm that I am above 18 years of age and agree to the{' '}
                  <span className="text-[#1a74e5] underline">Terms of Use</span> and{' '}
                  <span className="text-[#1a74e5] underline">Privacy Policy</span>.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !isAbove18}
              className="w-full rounded-xl bg-[#1a74e5] py-2.5 text-sm font-semibold text-white transition hover:bg-[#155fc2] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  Please wait...
                </span>
              ) : (
                mode === 'signin' ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>
          </div>
          <div className="relative hidden min-h-[620px] md:block">
            <img
              src={AUTH_SIDE_IMAGE}
              alt="Casino cards background"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-black/30 via-black/10 to-[#0f172a]/70" />
            <div className="absolute bottom-8 left-8 right-8 rounded-2xl border border-white/10 bg-black/35 p-5 backdrop-blur-sm">
              <h2 className="text-2xl font-bold text-white">Play Smart. Play Secure.</h2>
              <p className="mt-2 text-sm text-gray-200">
                Join EagleGames and enjoy fast sign in, secure wallet access, and a premium gaming experience.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;