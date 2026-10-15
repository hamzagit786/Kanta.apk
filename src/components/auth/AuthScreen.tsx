import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Scale, Lock, Mail, User, Building, AlertCircle } from 'lucide-react';

export const AuthScreen: React.FC = () => {
  const { 
    signInWithGoogle, 
    signInWithEmail, 
    registerWithEmail, 
    sendPasswordReset, 
    authError, 
    clearAuthError 
  } = useAuth();

  // Mode: 'signin' | 'register' | 'forgot'
  const [mode, setMode] = useState<'signin' | 'register' | 'forgot'>('signin');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ownerName, setOwnerName] = useState('Hamza Siddique');
  const [shopName, setShopName] = useState('Hamza Computerized Kanta');

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const switchMode = (newMode: 'signin' | 'register' | 'forgot') => {
    setMode(newMode);
    clearAuthError();
    setLocalError(null);
    setResetSent(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || googleLoading) return; // Prevent multiple requests
    setLocalError(null);
    clearAuthError();

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setLocalError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmail(cleanEmail, password);
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Invalid email or password. Please check your details and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || googleLoading) return;
    setLocalError(null);
    clearAuthError();

    const cleanOwner = ownerName.trim();
    const cleanShop = shopName.trim();
    const cleanEmail = email.trim();

    if (!cleanOwner) {
      setLocalError("Owner's Full Name is required.");
      return;
    }
    if (!cleanShop) {
      setLocalError('Shop Name is mandatory.');
      return;
    }
    if (!cleanEmail) {
      setLocalError('Email address is required.');
      return;
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      await registerWithEmail(cleanEmail, password, cleanOwner, cleanShop);
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Registration failed. Please check your details and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || googleLoading) return;
    setLocalError(null);
    clearAuthError();
    setResetSent(false);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setLocalError('Please enter your email address to receive password reset link.');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordReset(cleanEmail);
      setResetSent(true);
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Failed to send password reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (loading || googleLoading) return;
    setLocalError(null);
    clearAuthError();
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Could not sign in with Google. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const displayError = localError || authError;
  const isBusy = loading || googleLoading;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between font-sans text-slate-800">
      {/* Top Business Branding */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white py-6 px-4 shadow-md text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-900/60 border border-blue-400/30 text-blue-200 text-xs font-semibold mb-2">
          <Scale className="w-3.5 h-3.5 text-blue-300" />
          <span>100-Ton Computerized Scale</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
          Hamza Computerized Kanta
        </h1>
        <p className="text-xs sm:text-sm text-blue-200 mt-1">
          Owner: <strong>Hamza Siddique</strong> • Daily Vehicle Weight Ledger &amp; Business Khata
        </p>
      </div>

      {/* Main Authentication Card */}
      <div className="max-w-md w-full mx-auto my-6 p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Card Navigation Tabs */}
          <div className="grid grid-cols-2 bg-slate-100 border-b border-slate-200 text-sm font-bold">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => switchMode('signin')}
              className={`py-3.5 text-center transition cursor-pointer ${
                mode === 'signin' || mode === 'forgot'
                  ? 'bg-white text-blue-700 border-b-2 border-blue-700 font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => switchMode('register')}
              className={`py-3.5 text-center transition cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-blue-700 border-b-2 border-blue-700 font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
          </div>

          <div className="p-6 sm:p-8 space-y-5">
            {/* Friendly Error Message */}
            {displayError && (
              <div className="p-3.5 bg-rose-50 border border-rose-300 text-rose-800 rounded-xl text-xs font-semibold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{displayError}</span>
              </div>
            )}

            {/* Google Sign In Button (Provided on BOTH Sign In and Create Account screens) */}
            {mode !== 'forgot' && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isBusy}
                  className="w-full bg-white hover:bg-slate-50 border-2 border-slate-300 active:border-blue-600 disabled:opacity-60 text-slate-800 font-bold py-3 px-4 rounded-xl shadow-xs transition flex items-center justify-center gap-3 cursor-pointer text-xs sm:text-sm"
                >
                  {googleLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Connecting to Google...</span>
                    </div>
                  ) : (
                    <>
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>Continue with Google</span>
                    </>
                  )}
                </button>

                <div className="relative flex items-center justify-center">
                  <div className="border-t border-slate-200 w-full"></div>
                  <span className="bg-white px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 absolute">
                    Or with Email &amp; Password
                  </span>
                </div>
              </div>
            )}

            {/* Mode 1: Sign In */}
            {mode === 'signin' && (
              <form onSubmit={handleSignIn} className="space-y-4 text-xs sm:text-sm">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    disabled={isBusy}
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-sm font-semibold border border-slate-300 rounded-xl px-3.5 py-2.5 focus:border-blue-600 focus:outline-none disabled:bg-slate-50"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Password
                    </label>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => switchMode('forgot')}
                      className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <input
                    type="password"
                    required
                    disabled={isBusy}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-sm font-semibold border border-slate-300 rounded-xl px-3.5 py-2.5 focus:border-blue-600 focus:outline-none disabled:bg-slate-50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isBusy}
                  className="w-full bg-blue-700 hover:bg-blue-800 active:bg-blue-900 disabled:opacity-60 text-white font-black py-3 px-4 rounded-xl shadow-md transition cursor-pointer text-sm flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <span>Sign In with Email</span>
                  )}
                </button>
              </form>
            )}

            {/* Mode 2: Registration Form */}
            {mode === 'register' && (
              <form onSubmit={handleRegister} className="space-y-3.5 text-xs sm:text-sm">
                {/* 1. Owner's Full Name */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    1. Owner's Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isBusy}
                    placeholder="Hamza Siddique"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full text-sm font-semibold border border-slate-300 rounded-xl px-3.5 py-2.5 focus:border-blue-600 focus:outline-none disabled:bg-slate-50"
                  />
                </div>

                {/* 2. Shop Name (Mandatory) */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    2. Shop Name (App Heading) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isBusy}
                    placeholder="Hamza Computerized Kanta"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    className="w-full text-sm font-bold border border-slate-300 rounded-xl px-3.5 py-2.5 focus:border-blue-600 focus:outline-none disabled:bg-slate-50"
                  />
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    This will appear as your main heading on all pages.
                  </p>
                </div>

                {/* 3. Gmail / Email Address */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    3. Gmail / Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    disabled={isBusy}
                    placeholder="owner@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-sm font-semibold border border-slate-300 rounded-xl px-3.5 py-2.5 focus:border-blue-600 focus:outline-none disabled:bg-slate-50"
                  />
                </div>

                {/* 4. Password */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    4. Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    disabled={isBusy}
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-sm font-semibold border border-slate-300 rounded-xl px-3.5 py-2.5 focus:border-blue-600 focus:outline-none disabled:bg-slate-50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isBusy}
                  className="w-full bg-blue-700 hover:bg-blue-800 active:bg-blue-900 disabled:opacity-60 text-white font-black py-3 px-4 rounded-xl shadow-md transition cursor-pointer text-sm pt-3 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <span>Register &amp; Create Account</span>
                  )}
                </button>
              </form>
            )}

            {/* Mode 3: Forgot Password */}
            {mode === 'forgot' && (
              <form onSubmit={handleForgotPassword} className="space-y-4 text-xs sm:text-sm">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Reset Your Password
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Enter your registered email address. We will send a secure password reset link to your inbox.
                  </p>
                </div>

                {resetSent && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold">
                    Password reset link has been sent to {email}. Please check your inbox and spam folder.
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    autoFocus
                    disabled={isBusy}
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-sm font-semibold border border-slate-300 rounded-xl px-3.5 py-2.5 focus:border-blue-600 focus:outline-none disabled:bg-slate-50"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => switchMode('signin')}
                    className="flex-1 py-2.5 border border-slate-300 rounded-xl text-slate-700 font-bold hover:bg-slate-50 cursor-pointer text-xs"
                  >
                    Back to Sign In
                  </button>
                  <button
                    type="submit"
                    disabled={isBusy}
                    className="flex-1 bg-blue-700 hover:bg-blue-800 text-white font-black py-2.5 rounded-xl shadow-md transition cursor-pointer text-xs flex items-center justify-center gap-1.5"
                  >
                    {loading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Sending...</span>
                      </>
                    ) : (
                      <span>Send Reset Link</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Creator Credit Footer */}
      <footer className="py-6 px-4 text-center border-t border-slate-200 bg-white">
        <p className="text-xs font-medium text-slate-600">
          This app is created by Hamza Siddique
        </p>
        <p className="text-xs font-medium text-slate-600 mt-0.5">
          Phone: 03257833708
        </p>
      </footer>
    </div>
  );
};
