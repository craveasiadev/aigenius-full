/**
 * Login — single-page auth, AIpreneur design language.
 *
 * Visual language matches the landing page:
 *   • Glass card (frosted blur + subtle neutral border)
 *   • 3D plastic-key buttons (chunky bottom border, presses on tap)
 *   • Solid colours throughout, no gradients, no coloured glow shadows
 *   • Global theme (light/dark) via the app's ThemeProvider — toggle in
 *     the top-right matches the landing toggle and stays consistent
 *     across all pages.
 *   • Three.js AI orb decoration on the right column at md+ widths.
 *
 * One form, with a small segmented control at the top that switches the
 * identifier field between **Email** (parents / teachers / admins) and
 * **Genius ID** (students). Mobile-first: form fits a 360-px phone with
 * ≥48-px touch targets, safe-area-aware insets.
 *
 * Backend routing:
 *   • Email tab     → api.post('/auth/login', { email, password })
 *   • Genius-ID tab → useGeniusAuth().login(geniusId, password)
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Sparkles, Mail, Hash, Lock, Eye, EyeOff, ArrowLeft, Loader2, Sun, Moon,
} from 'lucide-react';
import { useGeniusAuth } from '../contexts/GeniusAuthContext';
import { useStore } from '../store/useStore';
import { api, setToken } from '../lib/api';
import type { Role } from '../types/models';
import { useTheme } from '../contexts/ThemeContext';
import {
  GLASS,
  ICON_TILE_SM,
  BTN_3D_PRIMARY,
  FIELD,
  PAGE,
} from '../lib/uiTokens';
import { DottedBackground } from '../components/ui/DottedBackground';
import { StarfieldBackground } from '../components/ui/StarfieldBackground';

type IdentifierMode = 'email' | 'genius';

export function Login() {
  const navigate = useNavigate();
  const { login: geniusLogin, error: geniusError } = useGeniusAuth();
  const setCurrentUser = useStore((s) => s.setCurrentUser);
  const { theme, toggleTheme } = useTheme();
  const dark = theme === 'dark';

  const [mode, setMode] = useState<IdentifierMode>('email');
  const [email, setEmail] = useState('');
  const [geniusId, setGeniusId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clear any previous error when the user edits the form or switches mode.
  useEffect(() => {
    setError(null);
  }, [mode, email, geniusId, password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const identifier = mode === 'email' ? email.trim() : geniusId.trim();
    if (!identifier || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'genius') {
        const ok = await geniusLogin(geniusId.trim(), password);
        if (ok) {
          navigate('/s/aipreneur');
          return;
        }
        setError(geniusError || 'Invalid Genius ID or password.');
        return;
      }

      // Email path — same shape the legacy GeniusAuth handler used.
      let response: {
        success: boolean;
        token: string;
        user: { id: string; email: string; name: string; role: string; created_at: string };
        message?: string;
      };
      try {
        response = await api.post('/auth/login', { email: email.trim(), password });
      } catch (err: any) {
        if (err?.status === 401) setError('Invalid email or password.');
        else if (err?.status === 422) setError(err?.data?.message || 'Invalid credentials.');
        else setError(err?.message || 'Unable to connect to the server.');
        return;
      }

      if (!response.success || !response.token || !response.user) {
        setError(response.message || 'Login failed.');
        return;
      }

      setToken(response.token);
      setCurrentUser({
        id: response.user.id,
        email: response.user.email,
        name: response.user.name,
        role: response.user.role as Role,
        passwordHash: '',
        createdAt: response.user.created_at,
      });

      const r = response.user.role;
      if (r === 'admin') navigate('/admin');
      else if (r === 'teacher') navigate('/t/dashboard');
      else if (r === 'parent') navigate('/p/dashboard');
      else navigate('/s/dashboard');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={PAGE}
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      <StarfieldBackground />
      <DottedBackground />

      {/* ── Top bar — back link + theme toggle ─────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-10 px-3 sm:px-4 pt-3 sm:pt-4 flex items-center justify-between">
        <Link
          to="/"
          className={`${GLASS} min-h-[40px] px-3 inline-flex items-center gap-1.5 rounded-full text-sm font-medium text-slate-700 dark:text-slate-200 active:scale-95 transition-transform touch-manipulation`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back to home</span>
        </Link>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="w-10 h-10 inline-flex items-center justify-center rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors touch-manipulation"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={dark ? 'moon' : 'sun'}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex"
            >
              {dark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </motion.span>
          </AnimatePresence>
        </button>
      </div>

      {/* ── Main layout — single centred form column ───────────── */}
      <div className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 py-20 sm:py-24">
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full"
          >
            {/* Brand badge */}
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl bg-violet-600 border-b-[3px] border-violet-800 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg text-slate-900 dark:text-white">AIpreneur</span>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Welcome back
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-300">
              Sign in to keep building your business.
            </p>

            {/* Glass card */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className={`${GLASS} rounded-3xl mt-6 overflow-hidden`}
            >
              {/* Identifier mode — segmented control with 3D-button feel */}
              <div className="p-1.5 m-3 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 flex gap-1">
                {(
                  [
                    { key: 'email', label: 'Email', Icon: Mail },
                    { key: 'genius', label: 'Genius ID', Icon: Hash },
                  ] as const
                ).map(({ key, label, Icon }) => {
                  const active = mode === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setMode(key)}
                      aria-pressed={active}
                      className={`flex-1 min-h-[42px] inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all touch-manipulation ${
                        active
                          ? 'bg-violet-600 text-white border-b-[3px] border-violet-800 active:translate-y-[2px] active:border-b-[1px]'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700/60'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Form */}
              <form className="px-5 pb-5 sm:px-6 sm:pb-6" onSubmit={handleSubmit} noValidate>
                {/* Identifier field */}
                <label className="block mb-4">
                  <span className="block text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                    {mode === 'email' ? 'Email' : 'Genius ID'}
                  </span>
                  <div className="relative">
                    <span className={`${ICON_TILE_SM} absolute left-1 top-1/2 -translate-y-1/2 pointer-events-none`}>
                      {mode === 'email' ? (
                        <Mail className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      ) : (
                        <Hash className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      )}
                    </span>
                    {mode === 'email' ? (
                      <input
                        type="email"
                        autoComplete="email"
                        inputMode="email"
                        autoCapitalize="off"
                        autoCorrect="off"
                        spellCheck={false}
                        enterKeyHint="next"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className={`${FIELD} min-h-[52px] pl-12 pr-3 text-base`}
                      />
                    ) : (
                      <input
                        type="text"
                        autoComplete="username"
                        inputMode="text"
                        autoCapitalize="characters"
                        autoCorrect="off"
                        spellCheck={false}
                        enterKeyHint="next"
                        value={geniusId}
                        onChange={(e) => setGeniusId(e.target.value)}
                        placeholder="GENIUS-2024-XXXX"
                        className={`${FIELD} min-h-[52px] pl-12 pr-3 text-base font-mono tracking-wide`}
                      />
                    )}
                  </div>
                </label>

                {/* Password field */}
                <label className="block mb-3">
                  <span className="block text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                    Password
                  </span>
                  <div className="relative">
                    <span className={`${ICON_TILE_SM} absolute left-1 top-1/2 -translate-y-1/2 pointer-events-none`}>
                      <Lock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      enterKeyHint="go"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`${FIELD} min-h-[52px] pl-12 pr-12 text-base`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 w-10 h-10 inline-flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors touch-manipulation"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </label>

                <div className="flex justify-end mb-4">
                  <Link
                    to="/forgot-password"
                    className="text-xs font-semibold text-violet-600 dark:text-violet-300 hover:text-violet-500 dark:hover:text-violet-200 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>

                {/* Error toast */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-3 rounded-xl bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-200 text-sm px-3 py-2.5 text-center"
                    role="alert"
                  >
                    {error}
                  </motion.div>
                )}

                {/* Sign-in button — primary 3D */}
                <button
                  type="submit"
                  disabled={submitting}
                  className={`${BTN_3D_PRIMARY} w-full min-h-[56px] px-6 text-base`}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    'Sign in'
                  )}
                </button>
              </form>

              {/* Demo entrypoint — APKs/web alike. The native shell
                  ships without a URL bar, so visitors can't type
                  /demo themselves. This button is the canonical way
                  in for prospects who want to look around before
                  creating an account. */}
              <div className="px-5 pb-5 sm:px-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex-1 h-px bg-slate-200 dark:bg-white/10" />
                  <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
                    Or
                  </span>
                  <span className="flex-1 h-px bg-slate-200 dark:bg-white/10" />
                </div>
                <Link
                  to="/demo"
                  className="w-full min-h-[52px] px-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-white dark:bg-white/5 border-2 border-violet-300 dark:border-violet-500/40 text-violet-700 dark:text-violet-200 text-sm font-extrabold active:scale-[0.98] hover:bg-violet-50 dark:hover:bg-white/10 transition-all touch-manipulation"
                >
                  <Sparkles className="w-4 h-4" />
                  Try the demo — no account needed
                </Link>
              </div>

              {/* Footer link inside card */}
              <div className="border-t border-slate-200 dark:border-white/10 px-5 py-4 sm:px-6 text-center text-sm text-slate-600 dark:text-slate-400">
                Don&apos;t have an account?{' '}
                <Link to="/register" className="text-violet-600 dark:text-violet-300 font-semibold hover:text-violet-500 dark:hover:text-violet-200 transition-colors">
                  Create one
                </Link>
              </div>
            </motion.div>

            {/* Admin entry — subtle, separate */}
            <p className="mt-5 text-center text-xs text-slate-500 dark:text-slate-400">
              School staff sign in with their school-issued email.{' '}
              <Link to="/admin/login" className="text-slate-600 dark:text-slate-300 underline hover:text-slate-900 dark:hover:text-white transition-colors">
                Admin portal
              </Link>
            </p>

            {/* Legal + help links — keeps the auth screen feeling
                trustworthy on first visit. Same destinations as the
                landing footer. */}
            <p className="mt-3 text-center text-[11px] text-slate-500 dark:text-slate-400">
              <Link to="/privacy" className="hover:text-slate-700 dark:hover:text-white transition-colors">
                Privacy
              </Link>
              <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
              <Link to="/terms" className="hover:text-slate-700 dark:hover:text-white transition-colors">
                Terms
              </Link>
              <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
              <Link to="/support" className="hover:text-slate-700 dark:hover:text-white transition-colors">
                Support
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default Login;
