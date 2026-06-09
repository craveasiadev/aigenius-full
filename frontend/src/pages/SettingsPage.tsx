/**
 * Settings — AIpreneur design language.
 *
 * Account info + preferences (theme, sound, notifications) + quick
 * access shortcuts + logout. Real backend data only.
 *
 * Visuals follow the shared design tokens (glass cards, 3D plastic-key
 * buttons, theme-aware solid colours, faint dotted background).
 */
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSmartBack, withFrom } from '../lib/smartBack';
import {
  ArrowLeft, LogOut, Moon, Sun, User, Volume2, Bell, Gem, Settings as SettingsIcon,
  Loader2,
} from 'lucide-react';
import { useGeniusAuth } from '../contexts/GeniusAuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { BottomNav } from '../components/BottomNav';
import {
  GLASS, GLASS_HOVER, ICON_TILE, BTN_3D_PRIMARY, PAGE,
} from '../lib/uiTokens';
import { DottedBackground } from '../components/ui/DottedBackground';
import { StarfieldBackground } from '../components/ui/StarfieldBackground';
import { AppLoader } from '../components/ui/AppLoader';

const SETTINGS_KEYS = {
  sound: 'ws_settings_sound',
  notifications: 'ws_settings_notifications',
};

const readBooleanSetting = (key: string, fallback: boolean): boolean => {
  const value = localStorage.getItem(key);
  if (value === null) return fallback;
  return value === 'true';
};

interface ToggleRowProps {
  icon: React.ReactNode;
  label: string;
  value: boolean;
  onToggle: () => void;
}
function ToggleRow({ icon, label, value, onToggle }: ToggleRowProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`${GLASS} ${GLASS_HOVER} w-full rounded-2xl px-3 py-3 flex items-center gap-3`}
    >
      <span className={ICON_TILE}>{icon}</span>
      <span className="flex-1 text-left text-sm font-semibold text-slate-900 dark:text-white">
        {label}
      </span>
      <span
        className={[
          'relative inline-flex items-center w-11 h-6 rounded-full border transition-colors',
          value
            ? 'bg-violet-600 border-violet-700'
            : 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-white/10',
        ].join(' ')}
        aria-hidden
      >
        <span
          className={[
            'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
            value ? 'translate-x-5' : 'translate-x-0.5',
          ].join(' ')}
        />
      </span>
    </button>
  );
}

export const SettingsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const { geniusProfile, logout, isLoading: authLoading } = useGeniusAuth();

  const [soundEnabled, setSoundEnabled] = useState(() => readBooleanSetting(SETTINGS_KEYS.sound, true));
  const [notificationsEnabled, setNotificationsEnabled] = useState(() =>
    readBooleanSetting(SETTINGS_KEYS.notifications, true),
  );
  const [loggingOut, setLoggingOut] = useState(false);

  const smartBack = useSmartBack();
  const handleBack = () => smartBack();

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEYS.sound, soundEnabled ? 'true' : 'false');
  }, [soundEnabled]);
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEYS.notifications, notificationsEnabled ? 'true' : 'false');
  }, [notificationsEnabled]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/login');
    } finally {
      setLoggingOut(false);
    }
  };

  if (authLoading) {
    return (
      <AppLoader
        title="Loading settings…"
        icon={SettingsIcon}
        hints={['Fetching your preferences', 'Almost ready']}
      />
    );
  }

  if (!geniusProfile) {
    return (
      <div className={PAGE}>
        <StarfieldBackground /><DottedBackground />
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className={`${GLASS} rounded-3xl px-6 py-8 text-center max-w-sm w-full`}>
            <span className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-600 border-b-[5px] border-violet-800 mb-3">
              <SettingsIcon className="w-8 h-8 text-white" />
            </span>
            <p className="text-lg font-extrabold text-slate-900 dark:text-white mb-1">
              Sign in to access settings
            </p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className={`${BTN_3D_PRIMARY} w-full min-h-[52px] px-6 text-base mt-4`}
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  const dark = theme === 'dark';
  const fullName = `${geniusProfile.first_name}${geniusProfile.last_name ? ` ${geniusProfile.last_name}` : ''}`;

  return (
    <div className={PAGE}>
      <StarfieldBackground /><DottedBackground />

      <header
        className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 dark:bg-slate-950/70 border-b border-slate-200/70 dark:border-white/10"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 8px)' }}
      >
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            aria-label="Back"
            className={`${GLASS} ${GLASS_HOVER} w-10 h-10 rounded-xl flex items-center justify-center`}
          >
            <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-200" />
          </button>
          <h1 className="flex items-center gap-2 text-lg font-extrabold text-slate-900 dark:text-white">
            <SettingsIcon className="w-5 h-5 text-violet-500 dark:text-violet-300" />
            Settings
          </h1>
          <button
            type="button"
            onClick={() => setTheme(dark ? 'light' : 'dark')}
            aria-label="Toggle theme"
            className={`${GLASS} ${GLASS_HOVER} w-10 h-10 rounded-xl flex items-center justify-center`}
          >
            {dark ? <Sun className="w-5 h-5 text-amber-300" /> : <Moon className="w-5 h-5 text-slate-700" />}
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-6 pb-32 space-y-4">
        {/* ── Account card ─────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${GLASS} rounded-2xl p-4 flex items-center gap-3`}
        >
          <span className="w-12 h-12 rounded-2xl bg-violet-600 border-b-[5px] border-violet-800 flex items-center justify-center font-extrabold text-white">
            {(geniusProfile.first_name?.[0] || 'A').toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="font-extrabold text-slate-900 dark:text-white truncate">{fullName}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              Genius ID: {geniusProfile.genius_id}
            </p>
          </div>
        </motion.section>

        {/* ── Preferences ──────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="space-y-2"
        >
          <h2 className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-bold px-1 mb-1">
            Preferences
          </h2>

          <ToggleRow
            icon={dark ? <Moon className="w-4 h-4 text-slate-700 dark:text-slate-200" /> : <Sun className="w-4 h-4 text-amber-500" />}
            label={`Theme — ${dark ? 'Dark' : 'Light'}`}
            value={dark}
            onToggle={() => setTheme(dark ? 'light' : 'dark')}
          />
          <ToggleRow
            icon={<Volume2 className="w-4 h-4 text-slate-700 dark:text-slate-200" />}
            label="Sound Effects"
            value={soundEnabled}
            onToggle={() => setSoundEnabled((prev) => !prev)}
          />
          <ToggleRow
            icon={<Bell className="w-4 h-4 text-slate-700 dark:text-slate-200" />}
            label="Notifications"
            value={notificationsEnabled}
            onToggle={() => setNotificationsEnabled((prev) => !prev)}
          />
        </motion.section>

        {/* ── Quick access ─────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-2"
        >
          <h2 className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-bold px-1 mb-1">
            Quick Access
          </h2>

          <button
            type="button"
            onClick={() => navigate('/s/aipreneur/profile', withFrom(location))}
            className={`${GLASS} ${GLASS_HOVER} w-full rounded-2xl px-3 py-3 flex items-center gap-3 text-left`}
          >
            <span className={ICON_TILE}>
              <User className="w-4 h-4 text-slate-700 dark:text-slate-200" />
            </span>
            <span className="flex-1 text-sm font-semibold text-slate-900 dark:text-white">
              My Profile
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/s/aipreneur/ai-tokens', withFrom(location))}
            className={`${GLASS} ${GLASS_HOVER} w-full rounded-2xl px-3 py-3 flex items-center gap-3 text-left`}
          >
            <span className={ICON_TILE}>
              <Gem className="w-4 h-4 text-amber-500" />
            </span>
            <span className="flex-1 text-sm font-semibold text-slate-900 dark:text-white">
              Top Up Tokens
            </span>
          </button>
        </motion.section>

        {/* ── Logout ───────────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={loggingOut}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 text-white font-bold border-b-[5px] border-rose-800 hover:bg-rose-500 hover:border-rose-700 active:translate-y-[3px] active:border-b-[2px] disabled:opacity-60 transition-[transform,border-bottom-width,background-color] duration-100 touch-manipulation min-h-[52px] px-6 text-base"
          >
            {loggingOut ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
            {loggingOut ? 'Logging out…' : 'Logout'}
          </button>
        </motion.section>
      </main>

      <BottomNav />
    </div>
  );
};

export default SettingsPage;
