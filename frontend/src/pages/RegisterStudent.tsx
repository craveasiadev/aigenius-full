/**
 * Register (student) — AIpreneur design language.
 *
 * Same visual treatment as Login:
 *   • Glass card on a solid theme-aware background.
 *   • 3D plastic-key buttons, no gradients, no coloured glow shadows.
 *   • Global theme via ThemeProvider — sun/moon toggle matches Landing/Login.
 *   • AI orb decoration on the right column at md+ widths.
 *
 * Form: name, date of birth (custom calendar picker), email, Genius ID
 * (username), password, confirm. Posts to `/auth/register/student` and
 * routes to `/s/aipreneur` on success.
 */
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft, Sparkles, Rocket, Loader2, Calendar, ChevronLeft,
  ChevronRight, User, Mail, Hash, Lock, Sun, Moon,
} from 'lucide-react';
import { api, setToken, setGeniusToken } from '../lib/api';
import { useStore } from '../store/useStore';
import { useTheme } from '../contexts/ThemeContext';
import {
  GLASS, ICON_TILE_SM, BTN_3D_PRIMARY, FIELD, PAGE,
} from '../lib/uiTokens';
import { DottedBackground } from '../components/ui/DottedBackground';
import { StarfieldBackground } from '../components/ui/StarfieldBackground';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const RegisterStudent = () => {
  const navigate = useNavigate();
  const setCurrentUser = useStore((state) => state.setCurrentUser);
  const { theme, toggleTheme } = useTheme();
  const dark = theme === 'dark';

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    geniusId: '',
    password: '',
    confirmPassword: '',
    dob: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Calendar picker state ──────────────────────────────────────────
  const today = new Date();
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarYear, setCalendarYear] = useState(today.getFullYear() - 12);
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());
  const [showYearPicker, setShowYearPicker] = useState(false);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handleSelectDate = (day: number) => {
    const mm = String(calendarMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const dateStr = `${calendarYear}-${mm}-${dd}`;
    setFormData({ ...formData, dob: dateStr });
    setShowCalendar(false);
    if (errors.dob) setErrors({ ...errors, dob: '' });
  };

  const prevMonth = () => {
    if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear((y) => y - 1); }
    else setCalendarMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear((y) => y + 1); }
    else setCalendarMonth((m) => m + 1);
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const normalized = e.target.name === 'geniusId'
      ? e.target.value.replace(/\s+/g, '')
      : e.target.value;
    setFormData({ ...formData, [e.target.name]: normalized });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: '' });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (!formData.geniusId.trim()) newErrors.geniusId = 'Username is required';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (!formData.dob) newErrors.dob = 'Date of birth is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);

    try {
      const response = await api.post<{
        success: boolean;
        user_token: string;
        genius_token: string;
        user: {
          id: string;
          email: string;
          name: string;
          role: 'student' | 'parent' | 'teacher' | 'master';
          created_at: string;
        };
        profile: { genius_id: string };
        credentials?: { genius_id: string };
        message?: string;
      }>('/auth/register/student', {
        email: formData.email,
        password: formData.password,
        name: formData.name,
        genius_id: formData.geniusId.trim(),
        dob: formData.dob,
      });

      if (!response.success || !response.user_token || !response.genius_token || !response.user) {
        setErrors({ email: response.message || 'Registration failed' });
        return;
      }

      setToken(response.user_token);
      setGeniusToken(response.genius_token);
      setCurrentUser({
        id: response.user.id,
        email: response.user.email,
        name: response.user.name,
        role: response.user.role,
        passwordHash: '',
        createdAt: response.user.created_at,
      });

      navigate('/s/aipreneur');
    } catch (error: any) {
      const backendErrors = error?.data?.errors as Record<string, string[]> | undefined;
      if (backendErrors) {
        const nextErrors: Record<string, string> = {};
        if (backendErrors.email?.length) nextErrors.email = backendErrors.email[0];
        if (backendErrors.genius_id?.length) nextErrors.geniusId = backendErrors.genius_id[0];
        if (backendErrors.password?.length) nextErrors.password = backendErrors.password[0];
        if (Object.keys(nextErrors).length > 0) {
          setErrors(nextErrors);
          return;
        }
      }
      setErrors({ email: error?.message || 'Unable to create account right now. Please try again.' });
    } finally {
      setIsSubmitting(false);
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

      {/* ── Top bar — back link + theme toggle ───────────────────── */}
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
              Start your adventure
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-300">
              Create your learning profile in a minute. AI will guide you.
            </p>

            {/* Form glass card */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className={`${GLASS} rounded-3xl mt-6 overflow-hidden`}
            >
              <form className="px-5 py-5 sm:px-6 sm:py-6 space-y-4" onSubmit={handleSubmit} noValidate>
                {/* Name */}
                <Field label="Your name" error={errors.name}>
                  <span className={`${ICON_TILE_SM} absolute left-1 top-1/2 -translate-y-1/2 pointer-events-none`}>
                    <User className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  </span>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="What's your name?"
                    autoComplete="name"
                    className={`${FIELD} min-h-[52px] pl-12 pr-3 text-base`}
                  />
                </Field>

                {/* Date of birth */}
                <div className="relative">
                  <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                    Date of birth
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCalendar((s) => !s)}
                    className={`${FIELD} min-h-[52px] px-3 text-base flex items-center gap-3 text-left`}
                  >
                    <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                    <span className={formData.dob ? '' : 'text-slate-400 dark:text-slate-500'}>
                      {formData.dob ? formatDisplayDate(formData.dob) : 'Select your birthday'}
                    </span>
                  </button>
                  {errors.dob && (
                    <p className="text-rose-500 dark:text-rose-300 text-xs mt-1">{errors.dob}</p>
                  )}

                  {/* Calendar popup */}
                  <AnimatePresence>
                    {showCalendar && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className={`${GLASS} absolute z-50 mt-2 left-0 right-0 rounded-2xl p-3 touch-manipulation`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <button
                            type="button"
                            onClick={prevMonth}
                            aria-label="Previous month"
                            className="w-11 h-11 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 active:scale-95 transition-all"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-900 dark:text-white text-base font-semibold">
                              {MONTHS[calendarMonth]}
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowYearPicker((s) => !s)}
                              className="min-h-[36px] px-3 rounded-md text-base font-bold text-violet-600 dark:text-violet-300 hover:bg-slate-100 dark:hover:bg-white/10 active:scale-95 transition-all"
                            >
                              {calendarYear} ▾
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={nextMonth}
                            aria-label="Next month"
                            className="w-11 h-11 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 active:scale-95 transition-all"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>

                        {showYearPicker && (
                          <div className="mb-3 max-h-56 overflow-y-auto rounded-lg p-2 grid grid-cols-3 gap-1.5 bg-slate-50 dark:bg-slate-800/60">
                            {Array.from({ length: 30 }, (_, i) => today.getFullYear() - 5 - i).map((year) => (
                              <button
                                key={year}
                                type="button"
                                onClick={() => { setCalendarYear(year); setShowYearPicker(false); }}
                                className={`min-h-[44px] rounded-md text-sm font-semibold transition-colors active:scale-95 touch-manipulation ${
                                  year === calendarYear
                                    ? 'bg-violet-600 text-white border-b-[3px] border-violet-800'
                                    : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                                }`}
                              >
                                {year}
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="grid grid-cols-7 gap-1 mb-1">
                          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                            <div key={d} className="text-center text-xs font-semibold py-1 text-slate-500 dark:text-slate-400">
                              {d}
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-7 gap-1">
                          {Array.from({ length: getFirstDayOfMonth(calendarYear, calendarMonth) }).map((_, i) => (
                            <div key={`empty-${i}`} className="aspect-square" />
                          ))}
                          {Array.from({ length: getDaysInMonth(calendarYear, calendarMonth) }, (_, i) => i + 1).map((day) => {
                            const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const isSelected = formData.dob === dateStr;
                            const isFuture = new Date(calendarYear, calendarMonth, day) > today;
                            return (
                              <button
                                key={day}
                                type="button"
                                disabled={isFuture}
                                onClick={() => handleSelectDate(day)}
                                className={`aspect-square min-h-[40px] rounded-md text-sm font-semibold transition-all touch-manipulation ${
                                  isSelected
                                    ? 'bg-violet-600 text-white border-b-[3px] border-violet-800'
                                    : isFuture
                                      ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 active:scale-95'
                                }`}
                              >
                                {day}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Email */}
                <Field
                  label="Email"
                  error={errors.email}
                  hint="Siblings can use the same email. Login uses your unique username."
                >
                  <span className={`${ICON_TILE_SM} absolute left-1 top-1/2 -translate-y-1/2 pointer-events-none`}>
                    <Mail className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  </span>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="your.email@example.com"
                    autoComplete="email"
                    inputMode="email"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    className={`${FIELD} min-h-[52px] pl-12 pr-3 text-base`}
                  />
                </Field>

                {/* Username (Genius ID) */}
                <Field
                  label="Username"
                  error={errors.geniusId}
                  hint="Use this ID for future student logins."
                >
                  <span className={`${ICON_TILE_SM} absolute left-1 top-1/2 -translate-y-1/2 pointer-events-none`}>
                    <Hash className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  </span>
                  <input
                    type="text"
                    name="geniusId"
                    value={formData.geniusId}
                    onChange={handleChange}
                    onKeyDown={(e) => { if (e.key === ' ') e.preventDefault(); }}
                    placeholder="Choose your username"
                    autoComplete="username"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    className={`${FIELD} min-h-[52px] pl-12 pr-3 text-base font-mono tracking-wide`}
                  />
                </Field>

                {/* Password */}
                <Field label="Password" error={errors.password}>
                  <span className={`${ICON_TILE_SM} absolute left-1 top-1/2 -translate-y-1/2 pointer-events-none`}>
                    <Lock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  </span>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                    className={`${FIELD} min-h-[52px] pl-12 pr-3 text-base`}
                  />
                </Field>

                {/* Confirm password */}
                <Field label="Confirm password" error={errors.confirmPassword}>
                  <span className={`${ICON_TILE_SM} absolute left-1 top-1/2 -translate-y-1/2 pointer-events-none`}>
                    <Lock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  </span>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    className={`${FIELD} min-h-[52px] pl-12 pr-3 text-base`}
                  />
                </Field>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`${BTN_3D_PRIMARY} w-full min-h-[56px] px-6 text-base mt-2`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating account…
                    </>
                  ) : (
                    <>
                      Start adventure
                      <Rocket className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Legal consent — required for child sign-ups. The
                    parent is the one acting here; this line makes the
                    agreement explicit. */}
                <p className="mt-3 text-center text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  By creating an account you agree to our{' '}
                  <Link to="/terms" className="underline hover:text-violet-600 dark:hover:text-violet-300">
                    Terms
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="underline hover:text-violet-600 dark:hover:text-violet-300">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </form>

              {/* Footer link inside card */}
              <div className="border-t border-slate-200 dark:border-white/10 px-5 py-4 sm:px-6 text-center text-sm text-slate-600 dark:text-slate-400">
                Already have an account?{' '}
                <Link to="/login" className="text-violet-600 dark:text-violet-300 font-semibold hover:text-violet-500 dark:hover:text-violet-200 transition-colors">
                  Sign in
                </Link>
              </div>
            </motion.div>

            {/* Different account types — subtle, separate */}
            <p className="mt-5 text-center text-xs text-slate-500 dark:text-slate-400">
              Signing up as a parent or teacher?{' '}
              <Link to="/register/parent" className="text-slate-600 dark:text-slate-300 underline hover:text-slate-900 dark:hover:text-white transition-colors mr-2">
                Parent
              </Link>
              <Link to="/register/teacher" className="text-slate-600 dark:text-slate-300 underline hover:text-slate-900 dark:hover:text-white transition-colors">
                Teacher
              </Link>
            </p>

            {/* Legal + help links */}
            <p className="mt-3 text-center text-[11px] text-slate-500 dark:text-slate-400">
              <Link to="/privacy" className="hover:text-slate-700 dark:hover:text-white transition-colors">Privacy</Link>
              <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
              <Link to="/terms" className="hover:text-slate-700 dark:hover:text-white transition-colors">Terms</Link>
              <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
              <Link to="/support" className="hover:text-slate-700 dark:hover:text-white transition-colors">Support</Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────
// Reusable labelled input wrapper. Keeps the label / icon-slot / error /
// hint markup consistent across every field on the form.
// ─────────────────────────────────────────────────────────────────────

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-1.5">
        {label}
      </span>
      <div className="relative">
        {children}
      </div>
      {hint && !error && (
        <p className="text-xs mt-1 text-violet-600 dark:text-violet-300">{hint}</p>
      )}
      {error && (
        <p className="text-xs mt-1 text-rose-500 dark:text-rose-300">{error}</p>
      )}
    </label>
  );
}

export default RegisterStudent;
