import React, { useState, useEffect } from 'react';
import { useAuth, SESSION_NOTICE_KEY } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate, Link } from 'react-router-dom';
import { BrandLogo } from '../components/common/BrandLogo';
import { LanguageSelector } from '../components/common/LanguageSelector';
import { Modal } from '../components/common/Modal';
import api from '../api/client';
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Eye,
  EyeOff,
  KeyRound,
  Send,
  Check,
  RotateCcw,
  AlertCircle,
  AlertTriangle,
  Users,
  CalendarCheck,
  Building2,
  FolderKanban,
  Receipt,
} from 'lucide-react';

export const LoginPage = () => {
  const { login } = useAuth();
  const { t } = useLanguage();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Forgot & Reset Password Modal State (Email OTP)
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [otpStep, setOtpStep] = useState('EMAIL_INPUT'); // 'EMAIL_INPUT' | 'OTP_VERIFY' | 'NEW_PASSWORD'
  const [resetEmail, setResetEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [modalNotice, setModalNotice] = useState(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Show (once) why the user was signed out, e.g. "Your session has expired".
  useEffect(() => {
    try {
      const notice = sessionStorage.getItem(SESSION_NOTICE_KEY);
      if (notice) {
        sessionStorage.removeItem(SESSION_NOTICE_KEY);
        setError(notice);
      }
    } catch {
      // storage blocked: nothing to show
    }
  }, []);

  // Handle Resend Cooldown Countdown
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      await login(email.trim(), password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };


  const openForgotModal = () => {
    setOtpStep('EMAIL_INPUT');
    setResetEmail(email && email.includes('@') ? email.trim() : '');
    setOtpCode('');
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setModalError(null);
    setModalNotice(null);
    setForgotModalOpen(true);
  };

  // Step 1: Request Email OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);
    setModalNotice(null);

    const trimmedEmail = resetEmail.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setModalError(
        t(
          'login.recoveryMobileWarning',
          'Please enter a valid email address (e.g. yourname@gmail.com). Password reset OTP cannot be sent to mobile numbers.'
        )
      );
      setModalLoading(false);
      return;
    }

    try {
      const res = await api.post('/auth/forgot-password-otp', { email: trimmedEmail });
      setModalNotice(
        res?.message || 'A 6-digit verification code has been sent to your registered email address. Please also check your Spam or Junk folder.'
      );
      setResendCooldown(60);
      setOtpStep('OTP_VERIFY');
    } catch (err) {
      setModalError(
        err.message || 'This email address is not registered with FurniCraft. Please provide a valid registered email address.'
      );
    } finally {
      setModalLoading(false);
    }
  };

  // Step 2: Verify 6-digit OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);

    if (!otpCode || otpCode.trim().length !== 6) {
      setModalError('Please enter a valid 6-digit verification code.');
      setModalLoading(false);
      return;
    }

    try {
      const res = await api.post('/auth/verify-reset-otp', {
        email: resetEmail.trim(),
        otp: otpCode.trim(),
      });

      const token = res?.resetToken || res?.data?.resetToken;
      if (!token) {
        throw new Error('Verification token not received from server.');
      }

      setResetToken(token);
      setModalNotice('Verification code confirmed successfully! Please set your new password.');
      setOtpStep('NEW_PASSWORD');
    } catch (err) {
      setModalError(err.message || 'Invalid or expired verification code. Please check the code.');
    } finally {
      setModalLoading(false);
    }
  };

  // Step 3: Set New Password
  const handleResetPasswordWithOtp = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);

    if (!newPassword || newPassword.length < 6) {
      setModalError('New password must be at least 6 characters long.');
      setModalLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setModalError('Passwords do not match. Please re-enter.');
      setModalLoading(false);
      return;
    }

    try {
      const res = await api.post('/auth/reset-password-otp', {
        email: resetEmail.trim(),
        resetToken,
        newPassword,
      });

      setForgotModalOpen(false);
      setSuccessMessage(
        res?.message || 'Your password has been reset successfully. Please log in with your new credentials.'
      );
      setEmail(resetEmail.trim());
      setPassword('');
    } catch (err) {
      setModalError(err.message || 'Failed to reset password. Please restart password recovery.');
    } finally {
      setModalLoading(false);
    }
  };

  const getModalErrorDetails = () => {
    if (!modalError) return null;
    const lower = modalError.toLowerCase();
    if (lower.includes('not registered') || lower.includes('unregistered') || lower.includes('not found')) {
      return {
        title: t('login.unregisteredWarning', 'Unregistered Email Warning'),
        icon: AlertTriangle,
        style: 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 shadow-sm',
        titleColor: 'text-amber-950 dark:text-amber-200',
        iconColor: 'text-amber-600 dark:text-amber-400',
      };
    }
    if (lower.includes('wait') || lower.includes('second') || lower.includes('cooldown') || lower.includes('too many')) {
      return {
        title: t('login.cooldownNotice', 'Please Wait A Moment'),
        icon: AlertCircle,
        style: 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200',
        titleColor: 'text-blue-950 dark:text-blue-200',
        iconColor: 'text-blue-600 dark:text-blue-400',
      };
    }
    if (lower.includes('temporarily unavailable') || lower.includes('try again') || lower.includes('service') || lower.includes('network') || lower.includes('timeout')) {
      return {
        title: t('login.serviceUnavailableTitle', 'Service Temporarily Busy'),
        icon: AlertCircle,
        style: 'border-amber-200 dark:border-amber-900 bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200',
        titleColor: 'text-amber-950 dark:text-amber-200',
        iconColor: 'text-amber-600 dark:text-amber-400',
      };
    }
    return {
      title: otpStep === 'EMAIL_INPUT' ? t('login.notice', 'Notice') : 'Recovery Issue',
      icon: AlertCircle,
      style: 'border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200',
      titleColor: 'text-rose-900 dark:text-rose-200',
      iconColor: 'text-rose-600 dark:text-rose-400',
    };
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-center bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans selection:bg-blue-600 selection:text-white py-6 sm:py-10 md:py-12 px-3.5 sm:px-6 lg:px-8 overflow-x-hidden overflow-y-auto transition-colors">
      {/* Ambient Background Gradients */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-72 sm:h-96 w-72 sm:w-96 rounded-full bg-blue-500/10 dark:bg-blue-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-72 sm:h-96 w-72 sm:w-96 rounded-full bg-amber-500/10 dark:bg-amber-600/10 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[450px] sm:h-[600px] w-[450px] sm:w-[600px] rounded-full bg-indigo-500/5 dark:bg-indigo-600/5 blur-3xl" />

      {/* Subtle Dot Pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025] dark:opacity-[0.04]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #94a3b8 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-md sm:max-w-lg">
        {/* Language Selection Header (Visible during login time) */}
        <div className="mb-3.5 flex items-center justify-between px-2">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            {t('common.selectLanguage', 'Select Language / भाषा')}
          </span>
          <LanguageSelector variant="pill" />
        </div>

        <div className="rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 md:p-10 shadow-xl shadow-slate-200/60 dark:shadow-2xl">
              
              {/* Brand Logo Header */}
              <div className="mb-5 sm:mb-6">
                <div className="hidden sm:block">
                  <BrandLogo size="lg" variant={isDark ? 'dark' : 'light'} />
                </div>
                <div className="sm:hidden">
                  <BrandLogo size="md" variant={isDark ? 'dark' : 'light'} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold text-blue-700 dark:text-blue-300">
                    <Sparkles className="h-3 w-3 text-blue-600 dark:text-blue-400" /> {t('login.contractorBadge', 'Contractor & Site ERP')}
                  </span>
                </div>
              </div>

              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                  FurniCraft | Official Furniture Workforce Management Platform
                </h1>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-normal">
                  FurniCraft ERP is a modern furniture workforce management platform that helps contractors manage workers, projects, attendance, earnings, payroll, payments, and business operations.
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  {t('login.title', 'Sign in to your account')}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {t('login.subtitle', 'Enter your email or registered mobile number to manage furniture sites and ledgers.')}
                </p>
              </div>

              {/* Success Alert */}
              {successMessage && (
                <div className="mt-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 p-3 sm:p-3.5 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-fade-in">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div className="font-semibold">{successMessage}</div>
                </div>
              )}

              {/* Error Alert */}
              {error && (
                <div className="mt-4 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 p-3 sm:p-3.5 text-xs text-rose-800 dark:text-rose-300 animate-fade-in">
                  <div className="font-bold text-rose-900 dark:text-rose-200 mb-0.5">Authentication Issue</div>
                  <div>{error}</div>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="mt-5 sm:mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('login.emailLabel', 'Email Address or Mobile Number')}
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 dark:text-slate-500">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('login.emailPlaceholder', 'yourname@gmail.com')}
                      className="block w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/80 py-2.5 sm:py-3 pl-10 pr-3.5 text-base sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 shadow-xs focus:bg-white dark:focus:bg-slate-800 focus:border-blue-600 dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      {t('login.passwordLabel', 'Password')}
                    </label>
                    <button
                      type="button"
                      onClick={openForgotModal}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline cursor-pointer py-0.5"
                    >
                      {t('login.forgotPassword', 'Forgot password?')}
                    </button>
                  </div>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 dark:text-slate-500">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="block w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/80 py-2.5 sm:py-3 pl-10 pr-11 text-base sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 shadow-xs focus:bg-white dark:focus:bg-slate-800 focus:border-blue-600 dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-sans"
                    />
                    {/* Show/Hide Password Toggle Button */}
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                      ) : (
                        <Eye className="h-4 w-4 text-slate-400 dark:text-slate-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full min-h-[46px] sm:min-h-[48px] items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-amber-900/20 transition-all hover:bg-amber-700 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                  >
                    {loading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        <span>{t('login.signInBtn', 'Sign In to Dashboard')}</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Thekedar Registration Link (The ONLY registration option on public login page) */}
              <div className="mt-5 pt-4 border-t border-slate-200/80 dark:border-slate-800 text-center">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {t('login.noAccount', 'Are you a contractor?')}{' '}
                  <Link
                    to="/register-thekedar"
                    className="font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>{t('login.registerThekedar', 'Register as Thekedar')}</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </p>
              </div>

        </div>
      </div>

      {/* Core Platform Capabilities */}
      <section className="relative z-10 mt-8 sm:mt-12 w-full max-w-4xl mx-auto px-2">
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 px-3 py-1 text-xs font-bold text-amber-800 dark:text-amber-300 shadow-xs">
            <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" /> FurniCraft ERP — Official Platform
          </span>
          <h2 className="mt-2 text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Core Platform Capabilities
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            FurniCraft ERP is a modern furniture workforce management platform that helps contractors manage workers, projects, attendance, earnings, payroll, payments, and business operations.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Pillar 1: Furniture Workforce Management */}
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 mb-3 border border-blue-200 dark:border-blue-900">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">
              Furniture Workforce Management
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Centralized craftsman rosters, trade skill categories (Mistry, Helper, Polisher), shift earning rates, and site allocations.
            </p>
          </div>

          {/* Pillar 2: Furniture Project Tracking */}
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 mb-3 border border-amber-200 dark:border-amber-900">
              <FolderKanban className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">
              Furniture Project Tracking
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Manage carpentry site milestones, track client money received, and approve real-time material purchase expenses.
            </p>
          </div>

          {/* Pillar 3: Attendance & Shift Management */}
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 mb-3 border border-emerald-200 dark:border-emerald-900">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">
              Attendance &amp; Daily Earnings
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Daily presence verification, rapid shift multipliers (0.5, 1, 1.5, 2, 2.5, 3, A), and automated daily worker earnings.
            </p>
          </div>

          {/* Pillar 4: Payroll & Advance Settlements */}
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 mb-3 border border-purple-200 dark:border-purple-900">
              <Receipt className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">
              Payroll &amp; Advance Settlements
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Track cash advances (pesgi), calculate net dues automatically, and generate official payment voucher bills and PDF receipts.
            </p>
          </div>
        </div>
      </section>

      {/* Meaningful About FurniCraft Section */}
      <section className="relative z-10 mt-8 sm:mt-12 w-full max-w-4xl mx-auto rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              About FurniCraft
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Purpose-Built Operating System for the Furniture &amp; Carpentry Industry
            </p>
          </div>
        </div>

        <div className="space-y-3.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <p>
            <strong className="text-slate-900 dark:text-white font-semibold">FurniCraft</strong> (also recognized as <strong className="text-slate-900 dark:text-white font-semibold">Furnicraft</strong>, <strong className="text-slate-900 dark:text-white font-semibold">Furni Craft</strong>, or <strong className="text-slate-900 dark:text-white font-semibold">FurniCraft ERP</strong>) is the official digital operations platform engineered specifically for custom furniture workshops, carpentry contractors, and on-site fit-out supervisors. Built to unite workshop owners, contractors (Thekedars), and skilled artisans, FurniCraft streamlines daily workshop and job-site administration.
          </p>
          <p>
            In traditional furniture production, tracking paper-based attendance slips, managing unrecorded daily cash advances, and reconciling weekly earnings across distributed sites often results in financial disputes and lost hours. <strong className="text-slate-900 dark:text-white font-semibold">FurniCraft ERP</strong> solves these operational bottlenecks by providing mobile-optimized digital attendance, automated earnings ledgers, and real-time expense approvals.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 p-3.5">
              <div className="text-xs font-bold text-slate-900 dark:text-white mb-1">
                For Furniture Contractors (Thekedars)
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Easily log daily craftsman attendance, assign site tasks, track advances, and submit completed project milestones directly from any mobile browser.
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 p-3.5">
              <div className="text-xs font-bold text-slate-900 dark:text-white mb-1">
                For Workshop &amp; Business Owners
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Gain full financial oversight, track material purchases, audit transactional history, and settle worker payroll with complete ledger transparency.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Brand Consistent Footer */}
      <footer className="relative z-10 mt-8 sm:mt-12 w-full max-w-4xl mx-auto pt-6 border-t border-slate-200/80 dark:border-slate-800 text-center">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 dark:text-slate-200">FurniCraft</span>
            <span>•</span>
            <span>FurniCraft ERP</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/register-thekedar" className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline">
              Contractor Registration
            </Link>
            <span>•</span>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
          &copy; 2026 FurniCraft. All rights reserved. FurniCraft | Official Furniture Workforce Management Platform.
        </p>
      </footer>

      {/* OTP Password Recovery Modal */}
      <Modal
        isOpen={forgotModalOpen}
        onClose={() => setForgotModalOpen(false)}
        title={t('login.recoveryTitle', 'Password Reset via Email OTP')}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          {/* Step indicator */}
          <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-200 bg-blue-50 dark:bg-blue-950/60 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-black text-white">
              {otpStep === 'EMAIL_INPUT' ? '1' : otpStep === 'OTP_VERIFY' ? '2' : '3'}
            </span>
            <span>
              {otpStep === 'EMAIL_INPUT' && 'Step 1 of 3: Enter Registered Email Address'}
              {otpStep === 'OTP_VERIFY' && 'Step 2 of 3: Enter 6-Digit Email Verification Code'}
              {otpStep === 'NEW_PASSWORD' && 'Step 3 of 3: Set New Permanent Password'}
            </span>
          </div>

          {modalNotice && (
            <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 p-3 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2 animate-fade-in">
              <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>{modalNotice}</div>
            </div>
          )}

          {(() => {
            const errDetails = getModalErrorDetails();
            if (!errDetails) return null;
            const ErrorIcon = errDetails.icon;
            return (
              <div className={`rounded-xl border p-3.5 text-xs animate-fade-in flex items-start gap-2.5 ${errDetails.style}`}>
                <ErrorIcon className={`h-4 w-4 shrink-0 mt-0.5 ${errDetails.iconColor}`} />
                <div className="flex-1">
                  <div className={`font-bold mb-0.5 ${errDetails.titleColor}`}>{errDetails.title}</div>
                  <div className="leading-relaxed">{modalError}</div>
                </div>
              </div>
            );
          })()}

          {/* Step 1: Email Input */}
          {otpStep === 'EMAIL_INPUT' && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {t('login.recoverySubtitle', 'Enter your registered email address to receive a secure 6-digit OTP.')}
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('login.recoveryEmailLabel', 'Registered Email Address')}
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => {
                      setResetEmail(e.target.value);
                      if (modalError) setModalError(null);
                    }}
                    placeholder={t('login.recoveryEmailPlaceholder', 'e.g. yourname@gmail.com')}
                    className={`block w-full min-h-[44px] rounded-xl border py-2.5 pl-10 pr-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition ${
                      modalError && otpStep === 'EMAIL_INPUT'
                        ? 'border-amber-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-amber-50/20 dark:bg-amber-950/20'
                        : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-blue-600 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-600'
                    }`}
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(false)}
                  className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer text-center"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60 transition shadow-sm cursor-pointer"
                >
                  {modalLoading ? (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>{t('login.sendOtp', 'Send 6-Digit OTP')} →</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Step 2: OTP Verification */}
          {otpStep === 'OTP_VERIFY' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {t('login.otpSentTo', 'Verification code sent to')}{' '}
                <strong className="text-slate-900 dark:text-white font-semibold">{resetEmail}</strong>.
              </p>

              <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/60 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                <Mail className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-semibold">{t('login.checkSpamTitle', 'Check Spam Folder:')} </span>
                  {t('login.checkSpamNotice', 'If you do not see the email in your inbox within 1–2 minutes, please check your Spam or Promotions folder.')}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('login.enterOtp', '6-Digit Email OTP')}
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="••••••"
                    className="block w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 pl-10 pr-3 text-base font-mono tracking-widest text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-600 dark:focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-600 text-center sm:text-left"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  disabled={resendCooldown > 0 || modalLoading}
                  onClick={handleRequestOtp}
                  className="font-semibold text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 disabled:text-slate-400 dark:disabled:text-slate-600 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" />
                  {resendCooldown > 0 ? t('login.resendIn', `Resend in ${resendCooldown}s`, { s: resendCooldown }) : t('login.resendOtp', 'Resend 6-Digit OTP')}
                </button>

                <button
                  type="button"
                  onClick={() => setOtpStep('EMAIL_INPUT')}
                  className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 underline text-[11px]"
                >
                  {t('common.edit', 'Change Email Address')}
                </button>
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(false)}
                  className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer text-center"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={modalLoading || otpCode.length !== 6}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60 transition shadow-sm cursor-pointer"
                >
                  {modalLoading ? (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>{t('login.verifyOtp', 'Verify OTP')} →</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Step 3: New Password */}
          {otpStep === 'NEW_PASSWORD' && (
            <form onSubmit={handleResetPasswordWithOtp} className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Your email verification code was confirmed. Create your new permanent password below.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('login.newPassword', 'New Permanent Password')}
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="block w-full min-h-[42px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 pl-10 pr-10 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-600 dark:focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showNewPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('login.confirmPassword', 'Confirm Permanent Password')}
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password"
                    className="block w-full min-h-[42px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 pl-10 pr-10 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-600 dark:focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-2.5 px-4 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60 transition shadow-sm cursor-pointer"
                >
                  {modalLoading ? (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      <span>{t('login.setNewPassword', 'Save New Password & Return to Login')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </div>
  );
};
