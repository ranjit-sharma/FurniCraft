import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BrandLogo } from '../components/common/BrandLogo';
import { LanguageSelector } from '../components/common/LanguageSelector';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api/client';
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  HardHat,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export const ThekedarRegisterPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { isDark } = useTheme();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Auto-dismiss notification after 7 seconds
  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => {
      setSuccess(null);
    }, 7000);
    return () => clearTimeout(timer);
  }, [success]);

  const referrer = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('ref');
  }, []);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Frontend validations
    if (formData.name.trim().length < 2) {
      setError('Full name must be at least 2 characters long.');
      return;
    }

    const cleanPhone = formData.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!formData.email.includes('@') || !formData.email.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/auth/register-thekedar', {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        password: formData.password,
      });

      setSuccess(
        res?.message || 'Thekedar account created successfully! Redirecting to login...'
      );

      setTimeout(() => {
        navigate('/login', { state: { registeredIdentifier: formData.email.trim() } });
      }, 2000);
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your information and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-center bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans selection:bg-amber-600 selection:text-white py-8 sm:py-12 px-3.5 sm:px-6 lg:px-8 overflow-x-hidden transition-colors">
      {/* Subtle Ambient Background Gradients */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-72 sm:h-96 w-72 sm:w-96 rounded-full bg-amber-500/10 dark:bg-amber-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-72 sm:h-96 w-72 sm:w-96 rounded-full bg-blue-500/10 dark:bg-blue-600/10 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-indigo-500/5 dark:bg-indigo-600/5 blur-3xl" />

      {/* Subtle Dot Pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025] dark:opacity-[0.04]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #94a3b8 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-lg">
        {/* Language Selection Header */}
        <div className="mb-3.5 flex items-center justify-between px-2">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            {t('common.selectLanguage', 'Select Language')}
          </span>
          <LanguageSelector variant="pill" />
        </div>

        <div className="rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 md:p-10 shadow-xl shadow-slate-200/60 dark:shadow-2xl">
          
          {/* Brand Logo Header */}
          <div className="mb-6">
            <div className="hidden sm:block">
              <BrandLogo size="lg" variant={isDark ? 'dark' : 'light'} />
            </div>
            <div className="sm:hidden">
              <BrandLogo size="md" variant={isDark ? 'dark' : 'light'} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold text-amber-900 dark:text-amber-200">
                <HardHat className="h-3 w-3 text-amber-600 dark:text-amber-400" /> {t('thekedarRegister.badge', 'Thekedar Registration')}
              </span>
              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400">{t('thekedarRegister.contractorErp', 'Contractor ERP')}</span>
            </div>
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
              {t('thekedarRegister.title', 'Register as Thekedar')}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-normal">
              {t('thekedarRegister.subtitle', 'Create your contractor account to manage furniture sites, attendance, and workforce ledgers.')}
            </p>
          </div>

          {/* Referral Banner */}
          {referrer && (
            <div className="mt-4 rounded-xl border border-amber-200 dark:border-amber-800/80 bg-amber-50/90 dark:bg-amber-950/40 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2.5">
              <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <div className="leading-relaxed">
                <span>Invited by <strong>{referrer}</strong> to join FurniCraft ERP.</span>
              </div>
            </div>
          )}

          {/* Policy Note: Thekedar Only */}
          <div className="mt-4 rounded-xl border border-blue-100 dark:border-blue-900/60 bg-blue-50/80 dark:bg-blue-950/40 p-3 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
            <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">{t('thekedarRegister.policyTitle', 'Public Registration Policy:')} </span>
              {t('thekedarRegister.policyDesc', 'Only Thekedar (Contractor) accounts can register publicly. Workers are onboarded directly through authorized contractor management.')}
            </div>
          </div>

          {/* Success Banner */}
          {success && (
            <div className="mt-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 p-3.5 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="font-semibold">{success}</div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="mt-4 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 p-3.5 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2 animate-fade-in">
              <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-rose-900 dark:text-rose-200">Registration Issue</div>
                <div>{error}</div>
              </div>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('thekedarRegister.fullName', 'Full Name')}
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 dark:text-slate-500">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Full Name"
                  className="block w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/80 py-2.5 sm:py-3 pl-10 pr-3.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:border-amber-600 dark:focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                />
              </div>
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('thekedarRegister.mobileNumber', 'Registered Mobile Number')}
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 dark:text-slate-500">
                  <Phone className="h-4 w-4" />
                </div>
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="10-digit mobile number"
                  className="block w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/80 py-2.5 sm:py-3 pl-10 pr-3.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:border-amber-600 dark:focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{t('thekedarRegister.mobileSub', 'Used to sign in.')}</p>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('thekedarRegister.emailAddress', 'Email Address')}
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 dark:text-slate-500">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="yourname@gmail.com"
                  className="block w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/80 py-2.5 sm:py-3 pl-10 pr-3.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:border-amber-600 dark:focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{t('thekedarRegister.emailSub', 'Used to sign in. Password recovery uses your email.')}</p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('thekedarRegister.password', 'Password')}
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 dark:text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••••••"
                  className="block w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/80 py-2.5 sm:py-3 pl-10 pr-11 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:border-amber-600 dark:focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4 text-slate-600 dark:text-slate-300" /> : <Eye className="h-4 w-4 text-slate-400 dark:text-slate-500" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('thekedarRegister.confirmPassword', 'Confirm Password')}
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 dark:text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  required
                  minLength={6}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••••••"
                  className="block w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/80 py-2.5 sm:py-3 pl-10 pr-11 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:border-amber-600 dark:focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none cursor-pointer"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4 text-slate-600 dark:text-slate-300" /> : <Eye className="h-4 w-4 text-slate-400 dark:text-slate-500" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex w-full min-h-[46px] sm:min-h-[48px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 px-4 py-3 text-sm font-bold text-white shadow-md shadow-amber-600/25 transition-all hover:from-amber-500 hover:to-amber-600 hover:shadow-lg hover:shadow-amber-600/30 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <span>{t('thekedarRegister.createAccount', 'Create Thekedar Account')}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Navigation link back to Login */}
          <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 text-center">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {t('thekedarRegister.haveAccount', 'Already have a contractor account?')}{' '}
              <Link
                to="/login"
                className="font-bold text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 hover:underline cursor-pointer"
              >
                {t('thekedarRegister.signIn', 'Sign In to Dashboard')}
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

