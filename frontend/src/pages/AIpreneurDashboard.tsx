import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';

import {
  Sparkles,
  Loader2, Camera, RefreshCw,
  ArrowLeft,
} from 'lucide-react';
import { BTN_3D_PRIMARY_SM } from '../lib/uiTokens';
import { useGeniusAuth } from '../contexts/GeniusAuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAIpreneur } from '../hooks/useAIpreneur';
import { IsoScene, npcCountForLevel } from '../components/iso/IsoScene';
import { GameOverlay } from '../components/iso/GameOverlay';
import { hydrateLayout } from '../components/iso/interiorLayout';
import { WorldGlobeHub, type GlobeBuilding } from '../components/iso/WorldGlobeHub';
import { StudentQRButton } from '../components/StudentQRButton';
import { workshopShopsApi, type WorkshopShop } from '../services/workshopShopsApi';
import { InteractiveTutorial } from '../components/InteractiveTutorial';
// NOTE: an earlier change wired in a generic `FirstTimeTutorial` (Step 1 of 5)
// here, but the codebase already has `<InteractiveTutorial>` + `<OnboardingFlow>`
// that the team designed specifically for this dashboard (the "Buddy" mascot,
// the 8-step shop walkthrough, etc.). Showing both at once stacked two
// tutorials on screen. Reverted: only the original tutorials are used now.
import { getDailyTasks } from '../components/DailyTaskSystem';
import { OnboardingFlow } from '../components/onboarding/OnboardingFlow';
import { ShopGenerationStatus } from '../components/onboarding/ShopGenerationStatus';
import { RibbonCuttingCeremony } from '../components/RibbonCuttingCeremony';
import { OfflineEarningsModal } from '../components/OfflineEarningsModal';
import InactivityConsequencesModal from '../components/InactivityConsequencesModal';
import { checkInactivity, type InactivityConsequence } from '../utils/inactivityCheck';
import { PersonaQuizModal } from '../components/PersonaQuizModal';
import { onboardingApi } from '../services/onboardingApi';
import { rewardsApi, offlineApi, personaApi, simulatorApi, aipreneurApi, type OfflineEarningsResponse, type AIpreneurPersonaProfile } from '../services/aipreneurApi';
import { ApiError, getAssetUrl, getShopImageUrl } from '../lib/api';
import { withFrom } from '../lib/smartBack';
import { AppLoader } from '../components/ui/AppLoader';
import { useAutoAwardBadges, type BadgeCheckData } from '../hooks/useAutoAwardBadges';
import { useSpark } from '../components/companion/CompanionProvider';
import { Spark } from '../components/companion/Spark';
import { RewardBurst } from '../components/celebration/RewardBurst';
import { MagicalOverlay } from '../components/magic/MagicalOverlay';
import { Portals } from '../components/magic/Portals';
import { StudentMoreSheet, type MoreNavItem } from '../components/studentNav';
import { FestivalBanner } from '../components/festival/FestivalBanner';
import { DailyCreativeQuest } from '../components/quest/DailyCreativeQuest';
import { petForBadge } from '../data/pets';
import { grantPet } from '../lib/collection';
import { COIN_COSTS } from '../constants/coinCosts';
import { paymentApi, type PricingCatalog } from '../services/paymentApi';

// Scene-only "Magic" shortcut injected into the iso dock's More sheet.
// Dispatches the same `open-portal` event the old Magic dock tile used, so
// the Portals hub (Inventory / Invention Lab / Mystery Bazaar) stays
// reachable now that the dock mirrors the global BottomNav slots.
const MAGIC_DOCK_ITEM: MoreNavItem[] = [
  {
    id: 'magic',
    label: 'Magic',
    icon: Sparkles,
    tone: 'bg-fuchsia-500 border-fuchsia-700',
    onClick: () => window.dispatchEvent(new CustomEvent('open-portal', { detail: 'magic' })),
  },
];

// DEBUG TOGGLE: Set to true to always show tutorial on refresh. Set to false for production (one-time only).
const ALWAYS_SHOW_TUTORIAL = false;
const TUTORIAL_STORAGE_PREFIX = 'tutorial_completed_';
// TTL disabled — tutorial only shows once per profile, permanently remembered
const TUTORIAL_TTL_DAYS = 0;
const TUTORIAL_TTL_MS = 0;

interface TutorialCompletionRecord {
  completed: true;
  completedAt: number;
  expiresAt: number;
}

const getTutorialStorageKey = (profileId: string) => `${TUTORIAL_STORAGE_PREFIX}${profileId}`;

const buildTutorialRecord = (now: number = Date.now()): TutorialCompletionRecord => ({
  completed: true,
  completedAt: now,
  expiresAt: now + TUTORIAL_TTL_MS,
});

const readTutorialRecord = (raw: string | null): TutorialCompletionRecord | null => {
  if (!raw) return null;

  // Legacy format from previous versions.
  if (raw === 'true') {
    return buildTutorialRecord();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<TutorialCompletionRecord>;
    if (!parsed || parsed.completed !== true) return null;

    const completedAt = Number(parsed.completedAt);
    const expiresAt = Number(parsed.expiresAt);
    if (!Number.isFinite(expiresAt)) {
      const base = Number.isFinite(completedAt) ? completedAt : Date.now();
      return buildTutorialRecord(base);
    }

    return {
      completed: true,
      completedAt: Number.isFinite(completedAt) ? completedAt : Math.max(0, expiresAt - TUTORIAL_TTL_MS),
      expiresAt,
    };
  } catch {
    return null;
  }
};

const markTutorialCompleted = (profileId: string): void => {
  const key = getTutorialStorageKey(profileId);
  localStorage.setItem(key, JSON.stringify(buildTutorialRecord()));
};

const hasCompletedTutorial = (profileId: string): boolean => {
  const key = getTutorialStorageKey(profileId);
  const raw = localStorage.getItem(key);
  const record = readTutorialRecord(raw);
  if (!record) {
    if (raw) localStorage.removeItem(key);
    return false;
  }

  // Only expire if TTL is enabled (> 0). When TTL is 0, tutorial is permanently dismissed.
  if (TUTORIAL_TTL_MS > 0 && record.expiresAt <= Date.now()) {
    localStorage.removeItem(key);
    return false;
  }

  if (raw === 'true' || (raw && (!raw.includes('expiresAt') || !raw.includes('completedAt')))) {
    localStorage.setItem(key, JSON.stringify(record));
  }

  return true;
};

const cleanupTutorialCompletionKeys = (activeProfileId?: string): void => {
  try {
    const now = Date.now();
    const activeKey = activeProfileId ? getTutorialStorageKey(activeProfileId) : null;
    const keys: string[] = [];

    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith(TUTORIAL_STORAGE_PREFIX)) {
        keys.push(key);
      }
    }

    keys.forEach((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) return;

      if (raw === 'true') {
        if (key === activeKey) {
          localStorage.setItem(key, JSON.stringify(buildTutorialRecord(now)));
        } else {
          localStorage.removeItem(key);
        }
        return;
      }

      const record = readTutorialRecord(raw);
      if (!record) {
        localStorage.removeItem(key);
        return;
      }

      // When TTL is disabled (0), never expire records — they are permanent.
      if (TUTORIAL_TTL_MS > 0 && record.expiresAt <= now) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn('[AIpreneurDashboard] Failed to clean tutorial completion storage', error);
  }
};

const isPersonaProfileNotFoundError = (error: unknown): boolean => {
  if (!(error instanceof ApiError)) {
    return false;
  }

  const message = typeof error.message === 'string' ? error.message.toLowerCase() : '';
  return (
    error.status === 404 ||
    message.includes('persona profile not found')
  );
};

const isDailyRewardAlreadyClaimedError = (error: unknown): boolean => {
  return (
    error instanceof ApiError &&
    error.status === 400 &&
    typeof error.message === 'string' &&
    error.message.toLowerCase().includes('already claimed')
  );
};

const BUSINESS_STATUS_POLL_VISIBLE_MS = 8_000;

const BUSINESS_STATUS_POLL_HIDDEN_MS = 30_000;
const TRAFFIC_REFRESH_COOLDOWN_MS = 60_000;
const TRAFFIC_REFRESH_INTERVAL_MS = 10 * 60 * 1000;
const DAILY_STATS_REFRESH_INTERVAL_MS = 10 * 60 * 1000;
const DAILY_STATS_MIN_GAP_MS = 30_000;
const DEFAULT_PASSIVE_VISITOR_INTERVAL_MS = 4 * 60 * 1000;
const PASSIVE_BUSINESS_REFRESH_MIN_GAP_MS = 10 * 60 * 1000;
const MAX_BACKOFF_MS = 30 * 60 * 1000;
const SHIFT_MUST_OPEN_KEY = 'aipreneur_shift_must_open';
const SHIFT_OPEN_PREFIX = 'aipreneur_shift_open_';

const getShiftOpenStorageKey = (profileId: string) => `${SHIFT_OPEN_PREFIX}${profileId}`;

export const AIpreneurDashboard = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { geniusProfile, isLoading: authLoading, refreshProfile } = useGeniusAuth();
  const {
    business,
    products,
    staff,
    decorations,
    marketingAssets,
    influencerCampaigns,
    innovations,
    rewards,
    isLoading: dataLoading,
    refreshAll,
    loadBusiness,
    updateBusiness,
    loadRewards,
  } = useAIpreneur();

  // ── Global coin / token spend bus ──────────────────────────────────
  // Any feature (Pet Stall, future shops, mini-game purchases) can fire
  //   window.dispatchEvent(new CustomEvent('aigenius:spend-coins',     { detail: { amount, reason } }))
  //   window.dispatchEvent(new CustomEvent('aigenius:spend-ai-tokens', { detail: { amount, reason } }))
  // and the dashboard:
  //   1. Posts the spend to the backend so the authoritative balance
  //      drops on the server (same `spend-coins` / `spend-ai-tokens`
  //      endpoints used by the marketing + innovation modules).
  //   2. Calls `loadRewards()` so the HUD coin pill re-fetches the
  //      true balance and updates the displayed number.
  // We also dispatch a follow-up `aigenius:coins-updated` event with
  // the response so any local component that wants to flash a +/- delta
  // (e.g. ShopMiniGame's coin chip) can react without polling.
  useEffect(() => {
    const handleSpendCoins = async (e: Event) => {
      const detail = (e as CustomEvent<{ amount: number; reason?: string }>).detail;
      if (!detail || detail.amount <= 0) return;
      try {
        const res = await aipreneurApi.rewards.spendCoins(detail.amount, detail.reason);
        await loadRewards();
        if (res?.success) {
          window.dispatchEvent(new CustomEvent('aigenius:coins-updated', {
            detail: {
              delta: -detail.amount,
              newBalance: res.rewards?.coins ?? 0,
              reason: detail.reason,
            },
          }));
        }
      } catch (err) {
        // Surface the error so the calling feature can decide what to
        // do (the Pet Stall currently grants the pet optimistically;
        // a future revision can roll back on failure).
        console.warn('[aigenius:spend-coins] failed', err);
      }
    };
    const handleSpendTokens = async (e: Event) => {
      const detail = (e as CustomEvent<{ amount: number; reason?: string }>).detail;
      if (!detail || detail.amount <= 0) return;
      try {
        const res = await aipreneurApi.rewards.spendAiTokens(detail.amount, detail.reason);
        await loadRewards();
        if (res?.success) {
          window.dispatchEvent(new CustomEvent('aigenius:tokens-updated', {
            detail: {
              delta: -detail.amount,
              newBalance: res.rewards?.ai_tokens ?? 0,
              reason: detail.reason,
            },
          }));
        }
      } catch (err) {
        console.warn('[aigenius:spend-ai-tokens] failed', err);
      }
    };
    window.addEventListener('aigenius:spend-coins', handleSpendCoins as EventListener);
    window.addEventListener('aigenius:spend-ai-tokens', handleSpendTokens as EventListener);
    return () => {
      window.removeEventListener('aigenius:spend-coins', handleSpendCoins as EventListener);
      window.removeEventListener('aigenius:spend-ai-tokens', handleSpendTokens as EventListener);
    };
  }, [loadRewards]);

  const navigate = useNavigate();
  const location = useLocation();

  // ── Persist shop mini-game earnings (refresh-proof) ─────────────────
  // The in-shop mini-game credits coins/XP per customer served (frequent),
  // so we buffer the amounts and flush the SUM to the `rewards` wallet (the
  // balance the HUD now reads + the Store/Bazaar spend from). Two layers
  // guarantee nothing is lost — which is exactly the bug being fixed:
  //   1. Every earn is mirrored into localStorage IMMEDIATELY, so a refresh
  //      mid-game (before the debounced API flush fires) recovers the
  //      pending amount on next load and flushes it then.
  //   2. A debounced API flush (+ leave-shop + page-hide) writes the sum to
  //      the backend so it survives a refresh once persisted.
  const PENDING_EARN_KEY = geniusProfile?.id
    ? `aipreneur_pending_earn_${geniusProfile.id}`
    : null;
  const earnBufferRef = useRef({ coins: 0, xp: 0 });
  const earnFlushTimerRef = useRef<number | null>(null);

  const persistEarnBuffer = useCallback(() => {
    if (!PENDING_EARN_KEY) return;
    try {
      const { coins, xp } = earnBufferRef.current;
      if (coins > 0 || xp > 0) localStorage.setItem(PENDING_EARN_KEY, JSON.stringify({ coins, xp }));
      else localStorage.removeItem(PENDING_EARN_KEY);
    } catch { /* storage unavailable — in-memory buffer still flushes */ }
  }, [PENDING_EARN_KEY]);

  const flushShopEarnings = useCallback(async () => {
    if (earnFlushTimerRef.current !== null) {
      clearTimeout(earnFlushTimerRef.current);
      earnFlushTimerRef.current = null;
    }
    const { coins, xp } = earnBufferRef.current;
    if (coins <= 0 && xp <= 0) return;
    earnBufferRef.current = { coins: 0, xp: 0 };
    try {
      if (coins > 0) await aipreneurApi.rewards.addCoins(coins, 'Shop mini-game earnings');
      if (xp > 0) await aipreneurApi.rewards.addXp(xp, 'Shop mini-game');
      // Persisted — clear the localStorage safety copy, then refresh the HUD.
      persistEarnBuffer();
      await loadRewards();
    } catch (err) {
      // Roll the un-persisted amounts back into the buffer (+ localStorage)
      // so the next flush / leave-shop / reload retries rather than dropping.
      earnBufferRef.current.coins += coins;
      earnBufferRef.current.xp += xp;
      persistEarnBuffer();
      console.warn('[shop earnings] persist failed', err);
    }
  }, [loadRewards, persistEarnBuffer]);

  const scheduleShopEarningsFlush = useCallback(() => {
    if (earnFlushTimerRef.current !== null) clearTimeout(earnFlushTimerRef.current);
    earnFlushTimerRef.current = window.setTimeout(() => { void flushShopEarnings(); }, 1200);
  }, [flushShopEarnings]);

  const addShopEarnings = useCallback((kind: 'coins' | 'xp', amount: number) => {
    if (amount <= 0) return;
    earnBufferRef.current[kind] += amount;
    persistEarnBuffer();          // survive an immediate refresh
    scheduleShopEarningsFlush();  // and persist to the backend shortly
  }, [persistEarnBuffer, scheduleShopEarningsFlush]);

  // Recover any earnings left un-flushed by a previous refresh / tab close.
  // Runs once the student id is known so we flush to the right account.
  useEffect(() => {
    if (!PENDING_EARN_KEY) return;
    try {
      const raw = localStorage.getItem(PENDING_EARN_KEY);
      if (!raw) return;
      const pending = JSON.parse(raw) as { coins?: number; xp?: number };
      earnBufferRef.current.coins += Math.max(0, pending.coins ?? 0);
      earnBufferRef.current.xp += Math.max(0, pending.xp ?? 0);
      void flushShopEarnings();
    } catch { /* corrupt entry — ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [PENDING_EARN_KEY]);

  // Best-effort flush when the page is hidden / closed (covers a refresh
  // that doesn't unmount cleanly). The localStorage mirror above is the
  // real guarantee; this just shortens the window before the next load.
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') void flushShopEarnings(); };
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onHide);
      void flushShopEarnings(); // also flush on unmount (navigating away)
    };
  }, [flushShopEarnings]);

  // Globe hub vs iso world stage. Restored from sessionStorage so
  // navigating into a module page (/s/aipreneur/decorate, /product,
  // …) and back doesn't kick the student out of the iso world they
  // were in. The session key is distinct from /demo's so a logged-in
  // student and an anonymous demo visitor on the same browser don't
  // share stage. Tab close resets to hub.
  const [stage, setStage] = useState<'hub' | 'iso'>(() => {
    if (typeof window === 'undefined') return 'hub';
    return sessionStorage.getItem('aipreneur_live_stage') === 'iso' ? 'iso' : 'hub';
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { sessionStorage.setItem('aipreneur_live_stage', stage); } catch { /* ignore */ }
  }, [stage]);
  // Soft "coming soon" toast that appears when the student taps a
  // workshop shop on the globe. Phase 4 will replace this with the
  // shop-specific business module (cafe for Zus, factory for Mamee,
  // etc.). For now we keep them on the hub but acknowledge the tap.
  const [pendingWorkshopShop, setPendingWorkshopShop] = useState<string | null>(null);
  // Workshop shops the student has unlocked (Zus, Mamee, KitKat, …).
  // Resolved at runtime by calling the workshopShopsApi: fetches the
  // active catalog + the student's unlocked list, then intersects.
  // Listens for the `aipreneur:shop-unlocked` event so a scan-driven
  // unlock refreshes the carousel in real time.
  const [collectedShops, setCollectedShops] = useState<WorkshopShop[]>([]);
  const [showRibbonCutting, setShowRibbonCutting] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showNewOnboarding, setShowNewOnboarding] = useState(false);
  const [showPersonaQuiz, setShowPersonaQuiz] = useState(false);
  // True while the player is inside the shop interior. Bubbled up from
  // IsoScene via `onInteriorChange` so the GameOverlay (which is the
  // OUTSIDE/city HUD) can hide while the in-shop mini-game owns the UI.
  const [inInterior, setInInterior] = useState(false);
  // "More" sheet opened from the iso WorldDock (shared with BottomNav).
  const [showDockMore, setShowDockMore] = useState(false);
  // When a /s/aipreneur/* sub-page navigates back here with
  // `state.enterInterior=true` (e.g. user pressed Back from the
  // Product Studio that they opened from inside the shop), pop the
  // IsoScene straight into the player's interior. We compute this from
  // either explicit nav state or a `?enter=shop` query marker — both
  // are produced by withFrom() helpers when the source was the shop.
  // Set true when the player enters the iso world by tapping "Enter" on
  // the globe. A globe entry must ALWAYS land on the shop EXTERIOR (city
  // view) first — never jump straight into the interior — even if a stale
  // `?enter=shop` marker is still sitting in the URL from an earlier
  // "back from a module page" navigation. This ref suppresses the
  // auto-enter for the current iso session.
  const enteredViaGlobeRef = useRef(false);
  const enterPlayerInterior = (() => {
    if (enteredViaGlobeRef.current) return false;
    const st = location.state as { enterInterior?: boolean } | null | undefined;
    if (st?.enterInterior) return true;
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(location.search);
      if (sp.get('enter') === 'shop') return true;
      // Refresh-into-shop: if the player was working inside their shop when
      // the page reloaded, drop them straight back in (the working screen
      // persists). Cleared when they leave the interior. Paired with the
      // sessionStorage stage flag, which keeps us on the iso world stage.
      if (sessionStorage.getItem('aipreneur_in_shop') === '1') return true;
    }
    return false;
  })();
  const [personaProfile, setPersonaProfile] = useState<AIpreneurPersonaProfile | null>(null);
  const [backendTrafficMultiplier, setBackendTrafficMultiplier] = useState<number | null>(null);
  const [backendPopularityLevel, setBackendPopularityLevel] = useState<number | null>(null);
  const [isShiftOpen, setIsShiftOpen] = useState(false);
  const [pricingCatalog, setPricingCatalog] = useState<PricingCatalog | null>(null);

  // Resolve the student's unlocked workshop shops by hitting the API
  // (workshopShopsApi falls back to localStorage automatically while
  // the Laravel endpoints are being built).
  useEffect(() => {
    if (!geniusProfile?.id) {
      setCollectedShops([]);
      return;
    }
    let cancelled = false;
    const refresh = async () => {
      try {
        const [catalog, unlocks] = await Promise.all([
          workshopShopsApi.list({ activeOnly: true }),
          workshopShopsApi.listUnlockedForStudent(geniusProfile.id),
        ]);
        if (cancelled) return;
        const unlockedIds = new Set(unlocks.map((u) => u.workshopShopId));
        setCollectedShops(catalog.filter((s) => unlockedIds.has(s.id)));
      } catch (err) {
        console.warn('[Dashboard] could not refresh collected shops', err);
      }
    };
    void refresh();
    const onChanged = () => { void refresh(); };
    window.addEventListener('aipreneur:shop-unlocked', onChanged);
    window.addEventListener('storage', onChanged);
    return () => {
      cancelled = true;
      window.removeEventListener('aipreneur:shop-unlocked', onChanged);
      window.removeEventListener('storage', onChanged);
    };
  }, [geniusProfile?.id]);

  useEffect(() => {
    let cancelled = false;

    const loadPricingCatalog = async () => {
      try {
        const catalog = await paymentApi.getPricingCatalog();
        if (!cancelled && catalog?.success) {
          setPricingCatalog(catalog);
        }
      } catch (error) {
        console.warn('[AIpreneurDashboard] Failed to load pricing catalog.', error);
      }
    };

    void loadPricingCatalog();

    return () => {
      cancelled = true;
    };
  }, []);

  const glassPanelAccent = useMemo(() => ({
    background: isDark
      ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))'
      : 'linear-gradient(135deg, rgba(139, 92, 246, 0.8), rgba(99, 102, 241, 0.8))',
    border: isDark ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid rgba(139, 92, 246, 0.4)',
  }), [isDark]);

  const localPersonaCompleted = useMemo(() => {
    if (!geniusProfile?.id) return false;
    return localStorage.getItem(`persona_quiz_completed_${geniusProfile.id}`) === 'true';
  }, [geniusProfile?.id]);

  useEffect(() => {
    if (!geniusProfile?.id) {
      setIsShiftOpen(false);
      return;
    }

    if (typeof window === 'undefined') {
      setIsShiftOpen(false);
      return;
    }

    const mustOpenShift = sessionStorage.getItem(SHIFT_MUST_OPEN_KEY) === '1';
    const alreadyOpened = sessionStorage.getItem(getShiftOpenStorageKey(geniusProfile.id)) === '1';
    setIsShiftOpen(mustOpenShift ? alreadyOpened : true);
  }, [geniusProfile?.id]);

  const handleOpenShift = useCallback(() => {
    if (!geniusProfile?.id || typeof window === 'undefined') return;
    sessionStorage.setItem(getShiftOpenStorageKey(geniusProfile.id), '1');
    sessionStorage.setItem(SHIFT_MUST_OPEN_KEY, '0');
    setIsShiftOpen(true);
  }, [geniusProfile?.id]);

  const csrBadges = useMemo(() => {
    // Merge CSR badges (localStorage) + Rewards badges (API) for Hall of Fame
    const csrLocal: string[] = [];
    if (geniusProfile?.id) {
      try {
        const raw = localStorage.getItem(`csr_badges_${geniusProfile.id}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) csrLocal.push(...parsed);
        }
      } catch { /* ignore */ }
    }
    const rewardsBadges: string[] = Array.isArray(rewards?.badges) ? rewards!.badges : [];
    // Deduplicate
    return [...new Set([...csrLocal, ...rewardsBadges])];
  }, [geniusProfile?.id, rewards?.badges]);

  // --- Auto-award badges when conditions are met ---
  const badgeCheckData = useMemo((): BadgeCheckData | null => {
    if (!business && !rewards) return null;
    // Count CSR actions: each time last_csr_action_date exists counts as at least 1,
    // and we estimate from total_donated (each donate is ~10 coins min)
    const estimatedCsrActions = Math.max(
      business?.last_csr_action_date ? 1 : 0,
      Math.floor((business?.total_donated || 0) / 10)
    );
    return {
      productsCount: products.length,
      staffCount: staff.length,
      campaignsCount: (influencerCampaigns || []).length + (marketingAssets || []).length,
      influencerCampaignsCount: (influencerCampaigns || []).length,
      innovationsCount: (innovations || []).length,
      decorationsSet: (decorations || []).length > 0,
      interiorCustomized: !!(business?.interior_config && (
        (business.interior_config as any).floor > 0 ||
        (business.interior_config as any).wall > 0 ||
        (business.interior_config as any).cashier > 0 ||
        (business.interior_config as any).shelfLeft > 0 ||
        (business.interior_config as any).shelfRight > 0
      )),
      totalSales: business?.total_sales || 0,
      shopLaunched: business?.shop_launched || false,
      currentStreak: rewards?.current_streak || 0,
      currentLevel: rewards?.level || 1,
      totalAiTokensEarned: rewards?.total_coins_earned || rewards?.ai_tokens || 0,
      totalDonated: business?.total_donated || 0,
      selectedCause: business?.selected_cause || null,
      csrActionCount: estimatedCsrActions,
    };
  }, [products, staff, influencerCampaigns, marketingAssets, innovations, decorations, business, rewards]);

  // Spark (AI companion) handles the celebration whenever a badge is auto-
  // claimed — a single global pathway so every page shows the same wow
  // moment without each one needing its own listener.
  const spark = useSpark();
  useAutoAwardBadges({
    data: badgeCheckData,
    rewards,
    loadRewards,
    onBadgeAwarded: (badgeId, { xp, coins }) => {
      const prettyName = badgeId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      spark.celebrate({ badgeId, prettyName, xp, coins });
      // Bonus surprise: some badges unlock a magical pet companion. Quietly
      // grant + nudge Spark to mention it so the kid sees TWO unlocks for
      // one badge — a small "wow you also got a friend!" moment.
      const pet = petForBadge(badgeId);
      if (pet && grantPet(pet.id)) {
        // Tiny delayed cheer so it doesn't collide with the burst toast.
        setTimeout(() => spark.cheer(`A new friend! Meet ${pet.name} ${pet.emoji}`), 1800);
      }
    },
  });

  // Offline earnings state
  // Last error from the shop-image-status polling effect. Surfaced in
  // <ShopGenerationStatus> so a stuck generation reveals the real
  // backend problem instead of an endless spinner.
  const [shopGenPollError, setShopGenPollError] = useState<string | null>(null);
  const [showOfflineEarningsModal, setShowOfflineEarningsModal] = useState(false);
  const [offlineEarnings, setOfflineEarnings] = useState<OfflineEarningsResponse['earnings'] | null>(null);
  const [offlineNotifications, setOfflineNotifications] = useState<OfflineEarningsResponse['notifications']>([]);

  // Inactivity consequences state
  const [showInactivityModal, setShowInactivityModal] = useState(false);
  const [inactivityConsequences, setInactivityConsequences] = useState<InactivityConsequence[]>([]);
  const [inactivityDaysMissed, setInactivityDaysMissed] = useState(0);
  const inactivityCheckedRef = useRef(false);

  // Tutorial trigger — show immediately when the profile is available.
  //
  // Bug we're fixing: the previous code waited for `!dataLoading` AND
  // wrapped `setShowTutorial(true)` in a 500-ms `setTimeout`. That meant
  // after a fresh register → /s/aipreneur, the user saw the "Create
  // Your Shop" placeholder for a beat before the tutorial overlaid.
  // Worse, on slow networks the wait could exceed the moment the user
  // tapped the placeholder, sending them into the wrong flow.
  //
  // We now fire as soon as the profile arrives — `dataLoading` is the
  // *other* data (products, business, etc.) which the tutorial doesn't
  // depend on. And we use a ref to ensure we only auto-open once per
  // mount, so re-renders don't re-trigger after the user dismisses it.
  const tutorialAutoOpenedRef = useRef(false);
  useEffect(() => {
    if (!geniusProfile || tutorialAutoOpenedRef.current) return;
    cleanupTutorialCompletionKeys(geniusProfile.id);
    const tutorialDone = hasCompletedTutorial(geniusProfile.id);
    if (ALWAYS_SHOW_TUTORIAL || !tutorialDone) {
      tutorialAutoOpenedRef.current = true;
      setShowTutorial(true);
    }
  }, [geniusProfile]);

  // Refresh data when returning from module
  useEffect(() => {
    if (location.state?.moduleCompleted && geniusProfile) {
      refreshAll();
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, geniusProfile, refreshAll, navigate, location.pathname]);

  // Load persona profile when quiz is completed
  useEffect(() => {
    if (!geniusProfile?.id) {
      setPersonaProfile(null);
      return;
    }

    const shouldLoadPersona = Boolean(geniusProfile.persona_quiz_completed || localPersonaCompleted);
    if (!shouldLoadPersona) {
      setPersonaProfile(null);
      return;
    }

    let isActive = true;
    personaApi.getProfile()
      .then((response) => {
        if (!isActive) return;
        if (response.success && response.persona) {
          setPersonaProfile(response.persona);
        } else {
          setPersonaProfile(null);
        }
      })
      .catch((error) => {
        if (!isActive) return;
        if (isPersonaProfileNotFoundError(error)) {
          setPersonaProfile(null);
          return;
        }
        console.error('Failed to load persona profile:', error);
        setPersonaProfile(null);
      });

    return () => {
      isActive = false;
    };
  }, [geniusProfile?.id, geniusProfile?.persona_quiz_completed, localPersonaCompleted]);

  const businessStatusPollInFlightRef = useRef(false);
  const trafficRequestStateRef = useRef({
    inFlight: false,
    lastSuccessAt: 0,
    failures: 0,
    backoffUntil: 0,
  });

  // Poll only business status while shop image is generating.
  // Uses visibility-aware cadence and in-flight guard to avoid request stacking.
  useEffect(() => {
    const isGenerating = business?.shop_image_status === 'pending' || business?.shop_image_status === 'generating';
    if (!isGenerating) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = (delayMs: number) => {
      timer = setTimeout(() => {
        void runPoll();
      }, delayMs);
    };

    const runPoll = async () => {
      if (cancelled) return;
      const visible = typeof document === 'undefined' || document.visibilityState === 'visible';
      const nextDelay = visible ? BUSINESS_STATUS_POLL_VISIBLE_MS : BUSINESS_STATUS_POLL_HIDDEN_MS;

      if (businessStatusPollInFlightRef.current) {
        schedule(nextDelay);
        return;
      }

      businessStatusPollInFlightRef.current = true;
      try {
        await loadBusiness();
        // Clear any stale error from a previous failed poll once we get
        // a successful response back.
        setShopGenPollError(null);
      } catch (err) {
        // Surface the error in the ShopGenerationStatus panel so the
        // user knows something's wrong instead of staring at a spinner.
        const message = err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Unknown error while checking shop status.';
        console.warn('[AIpreneurDashboard] Shop status poll failed:', err);
        setShopGenPollError(message);
      } finally {
        businessStatusPollInFlightRef.current = false;
      }

      schedule(nextDelay);
    };

    schedule(BUSINESS_STATUS_POLL_VISIBLE_MS);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [business?.shop_image_status, loadBusiness]);

  const fetchTrafficMultiplier = useCallback(async () => {
    if (!business?.shop_launched) return;

    const state = trafficRequestStateRef.current;
    const now = Date.now();
    if (state.inFlight) return;
    if (now < state.backoffUntil) return;
    if (now - state.lastSuccessAt < TRAFFIC_REFRESH_COOLDOWN_MS) return;

    state.inFlight = true;
    try {
      const response = await simulatorApi.getTrafficMultiplier();
      if (!response.success) return;

      setBackendTrafficMultiplier(response.traffic_multiplier);
      setBackendPopularityLevel(
        typeof response.popularity_level === 'number'
          ? response.popularity_level
          : (business?.popularity_level ?? null)
      );

      state.lastSuccessAt = Date.now();
      state.failures = 0;
      state.backoffUntil = 0;
    } catch (error) {
      state.failures += 1;
      const backoffMs = Math.min(MAX_BACKOFF_MS, 15_000 * 2 ** Math.min(state.failures - 1, 6));
      state.backoffUntil = now + backoffMs;
      setBackendTrafficMultiplier(null);
      setBackendPopularityLevel(business?.popularity_level ?? null);
      console.warn('Traffic multiplier request failed; backing off.', error);
    } finally {
      state.inFlight = false;
    }
  }, [business?.shop_launched, business?.popularity_level]);

  useEffect(() => {
    if (!business?.shop_launched) {
      trafficRequestStateRef.current = {
        inFlight: false,
        lastSuccessAt: 0,
        failures: 0,
        backoffUntil: 0,
      };
      setBackendTrafficMultiplier(null);
      setBackendPopularityLevel(business?.popularity_level ?? null);
      return;
    }

    void fetchTrafficMultiplier();
  }, [
    business?.shop_launched,
    business?.popularity_level,
    products.length,
    staff.length,
    marketingAssets.length,
    influencerCampaigns.length,
    innovations.length,
    fetchTrafficMultiplier,
  ]);

  useEffect(() => {
    if (!business?.shop_launched) return;
    const timer = setInterval(() => {
      void fetchTrafficMultiplier();
    }, TRAFFIC_REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [business?.shop_launched, fetchTrafficMultiplier]);

  // Check for offline earnings on mount (idle game mechanic)
  useEffect(() => {
    if (geniusProfile && !dataLoading && business?.shop_launched && isShiftOpen) {
      // Check offline earnings when user returns
      offlineApi.getOfflineEarnings()
        .then((response) => {
          if (response.success && response.earnings) {
            // Only show modal if there are actual earnings or significant time passed
            const hasEarnings = response.earnings.profit > 0 || response.earnings.visitors > 0;
            const wasAwayLong = response.earnings.offline_duration_hours >= 1;

            if (hasEarnings || wasAwayLong || response.earnings.is_inactive) {
              setOfflineEarnings(response.earnings);
              setOfflineNotifications(response.notifications || []);
              setShowOfflineEarningsModal(true);
            }
          }
        })
        .catch((error) => {
          console.error('Failed to check offline earnings:', error);
        });
    }
  }, [geniusProfile, dataLoading, business?.shop_launched, isShiftOpen]);

  // Inactivity consequences check — runs once per session per day
  useEffect(() => {
    if (!business || !rewards || !staff || inactivityCheckedRef.current || dataLoading) return;
    const sessionKey = `inactivity_checked_${geniusProfile?.id}_${new Date().toDateString()}`;
    if (localStorage.getItem(sessionKey)) { inactivityCheckedRef.current = true; return; }

    const result = checkInactivity(business, staff, rewards);
    if (result && result.consequences.length > 0) {
      setInactivityConsequences(result.consequences);
      setInactivityDaysMissed(result.daysMissed);
      // Delay slightly so offline earnings modal shows first
      setTimeout(() => setShowInactivityModal(true), showOfflineEarningsModal ? 3000 : 500);
      // Apply business penalties
      if (Object.keys(result.businessUpdates).length > 0) {
        updateBusiness(result.businessUpdates).catch(console.error);
      }
    }
    localStorage.setItem(sessionKey, 'true');
    inactivityCheckedRef.current = true;
  }, [business, rewards, staff, dataLoading, geniusProfile?.id]);

  // Heartbeat for activity tracking (keeps shop earning while user is active)
  useEffect(() => {
    if (!geniusProfile || !business?.shop_launched || !isShiftOpen) return;

    // Send heartbeat immediately on mount
    offlineApi.heartbeat().catch(console.error);

    // Then send heartbeat every 5 minutes while user is active
    const heartbeatInterval = setInterval(() => {
      offlineApi.heartbeat().catch(console.error);
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(heartbeatInterval);
  }, [geniusProfile, business?.shop_launched, isShiftOpen]);

  // Memoize products and staff arrays
  const memoizedProducts = useMemo(() => products.map(p => ({
    id: p.id,
    product_name: p.product_name,
    price: p.price,
    image_url: p.image_url,
    image_status: p.image_status
  })), [products]);

  const memoizedStaff = useMemo(() => staff.map(s => ({
    id: s.id,
    staff_role: s.staff_role,
    staff_name: s.staff_name,
    mood: s.mood || 80,
    speed_modifier: s.speed_modifier || 1.0,
    efficiency_modifier: s.efficiency_modifier || 1.0,
    behavior_traits: s.behavior_traits
  })), [staff]);

  const memoizedInteriorState = useMemo(() => business?.interior_config ? {
    shelfLeft: (business.interior_config as any).shelfLeft ?? 0,
    shelfRight: (business.interior_config as any).shelfRight ?? 0,
    cashier: (business.interior_config as any).cashier ?? 0,
    floor: (business.interior_config as any).floor ?? 0,
    wall: (business.interior_config as any).wall ?? 0,
    plants: (business.interior_config as any).plants ?? [],
    customAssets: (business.interior_config as any).customAssets ?? { floor: [], wall: [], plant: [] },
    cashierPos: (business.interior_config as any).cashierPos,
    leftShelfPos: (business.interior_config as any).leftShelfPos,
    rightShelfPos: (business.interior_config as any).rightShelfPos
  } : undefined, [business?.interior_config]);

  const handleInteriorStateChangeMemo = useCallback(async (state: { shelfLeft: number; shelfRight: number; cashier: number; floor: number; wall: number; plants?: Array<{ id: string; x: number; y: number; plantIndex: number }>; customAssets?: { floor: string[]; wall: string[]; plant: string[] }; cashierPos?: { x: number; y: number }; leftShelfPos?: { x: number; y: number }; rightShelfPos?: { x: number; y: number } }) => {
    try {
      await updateBusiness({
        interior_config: {
          ...(business?.interior_config || {}),
          shelfLeft: state.shelfLeft,
          shelfRight: state.shelfRight,
          cashier: state.cashier,
          floor: state.floor,
          wall: state.wall,
          plants: state.plants ?? (business?.interior_config as any)?.plants ?? [],
          customAssets: state.customAssets ?? (business?.interior_config as any)?.customAssets ?? { floor: [], wall: [], plant: [] },
          cashierPos: state.cashierPos ?? (business?.interior_config as any)?.cashierPos,
          leftShelfPos: state.leftShelfPos ?? (business?.interior_config as any)?.leftShelfPos,
          rightShelfPos: state.rightShelfPos ?? (business?.interior_config as any)?.rightShelfPos
        }
      });
    } catch (error) {
      console.error('Failed to save interior state:', error);
    }
  }, [updateBusiness, business?.interior_config]);

  // Handler for saving innovation item positions after drag-and-drop
  const handleInnovationMove = useCallback(async (id: string, x: number, y: number) => {
    try {
      const existing: Record<string, { x: number; y: number }> = (business?.interior_config as any)?.innovationPositions ?? {};
      await updateBusiness({
        interior_config: {
          ...(business?.interior_config || {}),
          innovationPositions: { ...existing, [id]: { x, y } }
        }
      });
    } catch (error) {
      console.error('Failed to save innovation position:', error);
    }
  }, [updateBusiness, business?.interior_config]);

  // Handler to launch shop from 3D companion — triggers ribbon cutting ceremony
  const handleLaunchShop = useCallback(() => {
    setShowRibbonCutting(true);
  }, []);

  const resolveMarketingAssetUrl = useCallback((url?: string | null) => {
    if (!url) return '';
    if (url.startsWith('data:')) return url;
    if (url.includes('/storage/marketing-assets/')) {
      const filename = url.split('/storage/marketing-assets/').pop();
      if (filename) {
        return getAssetUrl(`/aipreneur/marketing-asset/${filename}`);
      }
    }
    return url;
  }, []);

  const resolveInfluencerAvatarUrl = useCallback((url?: string | null) => {
    if (!url) return '';
    if (url.startsWith('data:')) return url;
    if (url.includes('/storage/influencers/')) {
      const filename = url.split('/storage/influencers/').pop();
      if (filename) {
        return getAssetUrl(`/aipreneur/influencer-avatar/${filename}`);
      }
    }
    return url;
  }, []);

  const resolveInnovationImageUrl = useCallback((url?: string | null) => {
    if (!url) return '';
    if (url.startsWith('data:')) return url;
    if (url.includes('/storage/innovations/')) {
      const filename = url.split('/storage/innovations/').pop();
      if (filename) {
        return getAssetUrl(`/aipreneur/innovation-image/${filename}`);
      }
    }
    return url;
  }, []);

  // Filter active (non-expired) influencer campaigns
  const activeInfluencerCampaigns = useMemo(() => {
    return (influencerCampaigns || []).filter(c => {
      if ((c as any).status === 'cancelled') return false;
      if (!c.ended_at) return true;
      return new Date(c.ended_at).getTime() > Date.now();
    });
  }, [influencerCampaigns]);

  const trafficMultiplier = useMemo(() => {
    if (!business || !business.shop_launched) return 0.2;
    if (typeof backendTrafficMultiplier === 'number' && Number.isFinite(backendTrafficMultiplier)) {
      return backendTrafficMultiplier;
    }
    return 1;
  }, [business, backendTrafficMultiplier]);

  const brandingPopularity = useMemo(() => {
    // Unlaunched / unsetup shops are always Lv 1. The backend may carry
    // a non-zero `popularity_level` from a previous session or seed —
    // we deliberately ignore it until the shop is actually opened so
    // a fresh registration doesn't see "Lv 12" on the HUD.
    if (!business || !business.shop_launched) return 1;
    if (typeof backendPopularityLevel === 'number' && Number.isFinite(backendPopularityLevel)) {
      return Math.max(1, backendPopularityLevel);
    }
    return Math.max(1, business.popularity_level || 1);
  }, [business, backendPopularityLevel]);

  // Active marketing campaigns for simulator (from real assets + influencer campaigns)
  const activeMarketing = useMemo(() => {
    const assetTypeMap: Record<string, 'Banner' | 'Billboard' | 'Digital' | 'TV'> = {
      banner: 'Banner',
      billboard: 'Billboard',
      social_post: 'Digital',
      flyer: 'Digital',
      tv_spot: 'TV',
    };

    const activeAdSpaces = (marketingAssets || [])
      .filter(asset => !!asset.asset_url)
      .map(asset => ({
        id: asset.id,
        name: (asset.asset_config as any)?.title || asset.asset_type,
        type: assetTypeMap[asset.asset_type] || 'Banner',
        imageUrl: resolveMarketingAssetUrl(asset.asset_url),
      }));

    const activeInfluencers = activeInfluencerCampaigns.map(campaign => {
      const tier = campaign.influencer_tier
        ? campaign.influencer_tier.charAt(0).toUpperCase() + campaign.influencer_tier.slice(1).toLowerCase()
        : 'Nano';
      const avatarRaw = campaign.influencer_avatar || '';
      const isImage = avatarRaw.startsWith('data:') || avatarRaw.startsWith('http') || avatarRaw.startsWith('/');
      return {
        id: campaign.id,
        name: campaign.influencer_name,
        tier: tier as 'Nano' | 'Micro' | 'Macro' | 'Mega',
        avatar: isImage ? undefined : (avatarRaw || '✨'),
        avatarUrl: isImage ? resolveInfluencerAvatarUrl(avatarRaw) : undefined,
        reach: campaign.reach || 0,
      };
    });

    return { activeInfluencers, activeAdSpaces };
  }, [marketingAssets, activeInfluencerCampaigns, resolveMarketingAssetUrl, resolveInfluencerAvatarUrl]);

  // Active innovations (from real unlocked tech)
  const activeInnovations = useMemo(() => {
    const innovationLabels: Record<string, { name: string; category: string }> = {
      ai_kiosk: { name: 'AI Kiosk', category: 'Customer Service' },
      smart_qds: { name: 'Queue Display', category: 'Operations' },
      targeting_ai: { name: 'Smart Targeting', category: 'Marketing' },
      robotic_cleaner: { name: 'Robo-Cleaner', category: 'Maintenance' },
      analytics_hub: { name: 'Analytics Hub', category: 'Management' },
    };

    const savedPositions: Record<string, { x: number; y: number }> = (business?.interior_config as any)?.innovationPositions ?? {};
    return (innovations || [])
      .filter((innovation) => innovation.is_active)
      .map((innovation) => {
      const meta = innovationLabels[innovation.tech_project] || { name: innovation.tech_project, category: 'Tech' };
      const pos = savedPositions[innovation.tech_project];
      return {
        id: innovation.tech_project,
        name: meta.name,
        category: meta.category,
        imageUrl: resolveInnovationImageUrl(innovation.design_image_url),
        x: pos?.x,
        y: pos?.y,
      };
      });
  }, [innovations, resolveInnovationImageUrl, business?.interior_config]);

  // Calculate daily tasks for HUD using imported getDailyTasks
  const dailyTasksForHud = useMemo(() => {
    // Use imported getDailyTasks
    const todos = getDailyTasks(new Date());
    const completedTasksKey = geniusProfile?.id ? `completedDailyTasks_${geniusProfile.id}` : 'completedDailyTasks';
    const savedCompleted = JSON.parse(localStorage.getItem(completedTasksKey) || '[]');
    const completedSet = new Set(savedCompleted);

    const taskData = {
      productsCount: products.length,
      staffCount: staff.length,
      campaignsCount: activeMarketing?.activeInfluencers?.length || 0,
      innovationsCount: activeInnovations.length,
      decorationsSet: decorations.length > 0,
      interiorCustomized: !!(business?.interior_config && (
        (business.interior_config as any).floor > 0 ||
        (business.interior_config as any).wall > 0 ||
        (business.interior_config as any).cashier > 0 ||
        (business.interior_config as any).shelfLeft > 0 ||
        (business.interior_config as any).shelfRight > 0
      )),
      totalSales: business?.total_sales || 0,
      shopLaunched: business?.shop_launched || false
    };

    return todos.map((t) => ({
      id: t.id,
      title: t.title,
      reward: `+${t.coinsReward} AI Tokens`,
      completed: t.checkCondition(taskData) || completedSet.has(t.id),
      target: undefined,
      current: undefined
    }));
  }, [geniusProfile?.id, products.length, staff.length, activeMarketing, activeInnovations.length, decorations.length, business]);

  const claimDailyRewardWithSync = useCallback(async (): Promise<boolean> => {
    try {
      const response = await rewardsApi.claimDaily();
      if (!response.success) {
        return false;
      }

      // Only reload rewards — avoid full refreshAll() which causes 3D scene rerender
      await loadRewards();
      return true;
    } catch (error) {
      if (isDailyRewardAlreadyClaimedError(error)) {
        await loadRewards();
        return true;
      }

      console.error('Failed to claim daily reward:', error);
      return false;
    }
  }, [loadRewards]);

  // ========== SERVER-SIDE PERIODIC VISITOR / PROFIT ACCUMULATION ==========
  // Early-game traffic is slightly higher for retention, while high traffic
  // still depends on stronger popularity + business progression.
  const computedDailyVisitorBudget = useMemo(() => {
    const dailyVisitorsCfg = pricingCatalog?.economy?.daily_visitors || {};
    const pop = Math.max(1, Math.round(brandingPopularity));
    const bracketSize = Math.max(1, Number((dailyVisitorsCfg as any).popularity_bracket_size ?? 5));
    const base = Math.max(1, Number((dailyVisitorsCfg as any).base ?? 3));
    const incrementPerBracket = Math.max(0, Number((dailyVisitorsCfg as any).increment_per_bracket ?? 1));
    const cap = Math.max(1, Number((dailyVisitorsCfg as any).cap ?? 55));
    const bracket = Math.ceil(pop / bracketSize);
    const baseBudget = base + Math.max(0, bracket - 1) * incrementPerBracket;

    const trafficMin = Number((dailyVisitorsCfg as any).traffic_multiplier_min ?? 0.75);
    const trafficMax = Number((dailyVisitorsCfg as any).traffic_multiplier_max ?? 1.6);
    const normalizedTrafficMultiplier = Math.max(trafficMin, Math.min(trafficMax, trafficMultiplier || 1));
    const trafficAdjusted = Math.round(baseBudget * normalizedTrafficMultiplier);

    const productBonusEvery = Math.max(1, Number((dailyVisitorsCfg as any).product_bonus_every_n ?? 4));
    const productBonusCap = Math.max(0, Number((dailyVisitorsCfg as any).product_bonus_cap ?? 4));
    const staffBonusEvery = Math.max(1, Number((dailyVisitorsCfg as any).staff_bonus_every_n ?? 2));
    const staffBonusCap = Math.max(0, Number((dailyVisitorsCfg as any).staff_bonus_cap ?? 3));
    const innovationBonusEvery = Math.max(1, Number((dailyVisitorsCfg as any).innovation_bonus_every_n ?? 1));
    const innovationBonusCap = Math.max(0, Number((dailyVisitorsCfg as any).innovation_bonus_cap ?? 3));

    const productBonus = Math.min(productBonusCap, Math.floor(products.length / productBonusEvery));
    const staffBonus = Math.min(staffBonusCap, Math.floor(staff.length / staffBonusEvery));
    const innovationBonus = Math.min(innovationBonusCap, Math.floor(activeInnovations.length / innovationBonusEvery));

    return Math.max(1, Math.min(cap, trafficAdjusted + productBonus + staffBonus + innovationBonus));
  }, [brandingPopularity, trafficMultiplier, products.length, staff.length, activeInnovations.length, pricingCatalog]);

  const passiveVisitorIntervalMs = useMemo(() => {
    const defaultIntervalSeconds = DEFAULT_PASSIVE_VISITOR_INTERVAL_MS / 1000;
    const intervalSeconds = Number(pricingCatalog?.economy?.passive_visitor_interval_seconds ?? defaultIntervalSeconds);
    const safeSeconds = Number.isFinite(intervalSeconds) ? Math.max(15, intervalSeconds) : defaultIntervalSeconds;
    return safeSeconds * 1000;
  }, [pricingCatalog]);

  const passivePurchaseChance = useMemo(() => {
    const chance = Number(pricingCatalog?.economy?.visitor_purchase_chance_percent ?? 50);
    if (!Number.isFinite(chance)) return 0.5;
    return Math.min(1, Math.max(0, chance / 100));
  }, [pricingCatalog]);

  const shopExteriorCost = useMemo(() => {
    const catalogCost = Number(pricingCatalog?.token_costs?.shop_exterior);
    if (!Number.isFinite(catalogCost)) {
      return COIN_COSTS.shop_exterior;
    }
    return catalogCost;
  }, [pricingCatalog]);

  // Track today's visitor count as React state (reactive for HUD + NPC spawner)
  const [todayVisitorCount, setTodayVisitorCount] = useState(0);
  const [serverDailyVisitorBudget, setServerDailyVisitorBudget] = useState<number | null>(null);
  const dailyVisitorBudget = serverDailyVisitorBudget ?? computedDailyVisitorBudget;
  const dailyStatsRequestStateRef = useRef({
    inFlight: false,
    lastSuccessAt: 0,
    failures: 0,
    backoffUntil: 0,
  });
  const passiveTickStateRef = useRef({
    inFlight: false,
    failures: 0,
    backoffUntil: 0,
    lastBusinessRefreshAt: 0,
  });
  const productsRef = useRef(products);
  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  const fetchDailyStats = useCallback(async (force = false) => {
    if (!business?.shop_launched || !isShiftOpen) return;

    const state = dailyStatsRequestStateRef.current;
    const now = Date.now();
    const isVisible = typeof document === 'undefined' || document.visibilityState === 'visible';

    if (!force && !isVisible) return;
    if (state.inFlight) return;
    if (!force && now < state.backoffUntil) return;
    if (!force && now - state.lastSuccessAt < DAILY_STATS_MIN_GAP_MS) return;

    state.inFlight = true;
    try {
      const res = await simulatorApi.getDailyStats();
      if (res.success) {
        setTodayVisitorCount(res.today.visitors);
        const responseBudget = typeof res.today.daily_visitor_budget === 'number'
          ? res.today.daily_visitor_budget
          : res.economy?.daily_visitor_budget;
        if (typeof responseBudget === 'number' && Number.isFinite(responseBudget)) {
          setServerDailyVisitorBudget(Math.max(0, responseBudget));
        }
      }
      state.lastSuccessAt = Date.now();
      state.failures = 0;
      state.backoffUntil = 0;
    } catch (error) {
      state.failures += 1;
      state.backoffUntil = now + Math.min(MAX_BACKOFF_MS, 10_000 * 2 ** Math.min(state.failures - 1, 6));
      console.warn('Daily stats request failed; backing off.', error);
    } finally {
      state.inFlight = false;
    }
  }, [business?.shop_launched, isShiftOpen]);

  useEffect(() => {
    if (!business?.shop_launched || !isShiftOpen) {
      dailyStatsRequestStateRef.current = {
        inFlight: false,
        lastSuccessAt: 0,
        failures: 0,
        backoffUntil: 0,
      };
      setServerDailyVisitorBudget(null);
      return;
    }

    void fetchDailyStats(true);
    const timer = setInterval(() => {
      void fetchDailyStats(false);
    }, DAILY_STATS_REFRESH_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void fetchDailyStats(false);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [business?.shop_launched, isShiftOpen, fetchDailyStats]);

  // Remaining visitors allowed today (passed to NPC spawner to stop visual NPCs too)
  const remainingDailyVisitors = Math.max(0, dailyVisitorBudget - todayVisitorCount);

  // Use a ref so the timer tick always reads the latest value without restarting
  const remainingRef = useRef(remainingDailyVisitors);
  remainingRef.current = remainingDailyVisitors;

  useEffect(() => {
    if (!business?.shop_launched || !isShiftOpen) {
      passiveTickStateRef.current = {
        inFlight: false,
        failures: 0,
        backoffUntil: 0,
        lastBusinessRefreshAt: 0,
      };
      return;
    }

    const tick = async () => {
      const now = Date.now();
      const isVisible = typeof document === 'undefined' || document.visibilityState === 'visible';
      const state = passiveTickStateRef.current;

      if (!isVisible) return;
      // Stop if daily budget reached
      if (remainingRef.current <= 0) return;
      if (state.inFlight) return;
      if (now < state.backoffUntil) return;

      state.inFlight = true;
      try {
        // Record exactly 1 visitor per tick
        const res = await simulatorApi.recordVisitor();
        if (res.success) {
          setTodayVisitorCount(res.daily_visitors);
          if (typeof res.daily_visitor_budget === 'number' && Number.isFinite(res.daily_visitor_budget)) {
            setServerDailyVisitorBudget(Math.max(0, res.daily_visitor_budget));
          }
          if (typeof res.traffic_multiplier === 'number' && Number.isFinite(res.traffic_multiplier)) {
            setBackendTrafficMultiplier(res.traffic_multiplier);
          }
          if (typeof res.popularity_level === 'number' && Number.isFinite(res.popularity_level)) {
            setBackendPopularityLevel(res.popularity_level);
          }

          // Purchase chance from dynamic economy config
          const availableProducts = productsRef.current;
          if ((res.recorded_count ?? 0) > 0 && Math.random() < passivePurchaseChance && availableProducts.length > 0) {
            const product = availableProducts[Math.floor(Math.random() * availableProducts.length)];
            await simulatorApi.recordSale({ product_id: product.id, quantity: 1 });
          }

          // Refresh heavy business payload at a lower cadence.
          if (now - state.lastBusinessRefreshAt >= PASSIVE_BUSINESS_REFRESH_MIN_GAP_MS) {
            await loadBusiness();
            state.lastBusinessRefreshAt = Date.now();
          }

          state.failures = 0;
          state.backoffUntil = 0;
        }
      } catch (err) {
        state.failures += 1;
        state.backoffUntil = now + Math.min(MAX_BACKOFF_MS, 15_000 * 2 ** Math.min(state.failures - 1, 6));
        console.warn('Passive income tick failed; backing off.', err);
      } finally {
        state.inFlight = false;
      }
    };

    // One visitor every 4 minutes while online, hard-capped by daily budget.
    const timer = setInterval(() => {
      void tick();
    }, passiveVisitorIntervalMs);
    return () => clearInterval(timer);
  }, [business?.shop_launched, isShiftOpen, loadBusiness, passiveVisitorIntervalMs, passivePurchaseChance]);

  // Wall posters (3 slots on right wall) — hooks must be before early returns
  const intCfgForPosters = (business?.interior_config || {}) as Record<string, unknown>;
  const wallPostersRaw = useMemo(() => {
    const raw = intCfgForPosters.wall_posters;
    if (Array.isArray(raw) && raw.length === 3) return raw.map((v: unknown) => (typeof v === 'string' && v ? v : null));
    return [null, null, null];
  }, [intCfgForPosters.wall_posters]);
  const resolvedWallPosters = useMemo(() => {
    return wallPostersRaw.map((url: string | null) => url ? resolveMarketingAssetUrl(url) : null);
  }, [wallPostersRaw, resolveMarketingAssetUrl]);
  const handleRemoveWallPoster = useCallback(async (slotIndex: number) => {
    try {
      const posters = [...wallPostersRaw];
      posters[slotIndex] = null;
      await updateBusiness({
        interior_config: { ...(business?.interior_config || {}), wall_posters: posters },
      });
    } catch (error) {
      console.error('Failed to remove wall poster:', error);
    }
  }, [updateBusiness, business?.interior_config, wallPostersRaw]);

  // Globe hub buildings: the student's own shop first (using their
  // AI-generated `shop_image_url`), then any workshop shops they've
  // unlocked. The carousel only mounts once the student's shop image
  // is ready — before that the dashboard shows the generation status
  // screen, so there's no risk of an empty array.
  const hubBuildings = useMemo<GlobeBuilding[]>(() => {
    const myShopName = geniusProfile?.aipreneur_shop_name || 'My Shop';
    const myShopImg = getShopImageUrl(business?.shop_image_url) ||
      getShopImageUrl(business?.shop_scene_image_url) ||
      '/assets/World/Zus.png'; // safe local fallback so the texture
                               // loader never gets an empty string
    const mine: GlobeBuilding = {
      id: 'my-shop',
      name: myShopName,
      imagePath: myShopImg,
    };
    const collected = collectedShops.map((s) => ({
      id: s.id,
      // Label the building with the partner's display name; the
      // sponsoring company name appears in the bottom-corner badge
      // inside the carousel.
      name: s.name,
      imagePath: s.shopImageUrl,
    } satisfies GlobeBuilding));
    return [mine, ...collected];
  }, [
    geniusProfile?.aipreneur_shop_name,
    business?.shop_image_url,
    business?.shop_scene_image_url,
    collectedShops,
  ]);

  const loading = authLoading || dataLoading;

  if (loading) {
    return (
      <AppLoader
        title="Loading your shop…"
        hints={[
          'Waking up the city',
          'Counting today\'s visitors',
          'Polishing the storefront',
          'Almost there',
        ]}
      />
    );
  }

  if (!geniusProfile) {
    return (
      <div className="fixed inset-0 flex items-center justify-center px-6" style={{ background: '#0a0a1a' }}>
        <div className="text-center max-w-md">
          <h2 className="text-white text-2xl font-bold mb-3">Session ended</h2>
          <p className="text-white/75 mb-6">Please log in again to continue your AIpreneur journey.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/login')}
              className="px-5 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-semibold transition-colors"
            >
              Go to Login
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const shopName = geniusProfile?.aipreneur_shop_name || 'My Shop';
  const decorationConfig = decorations.length > 0
    ? {
      furniture: decorations[0].decoration_focus === 'furniture' || true,
      art: decorations[0].decoration_focus === 'art' || true,
      lights: decorations[0].decoration_focus === 'lights' || true,
    }
    : { furniture: true, art: false, lights: false };

  const hasShopImage = !!(business?.shop_image_url || business?.shop_scene_image_url);
  const shopImageReady = business?.shop_image_status === 'completed' || hasShopImage;

  // Resolve interior decoration wallColor/floorColor IDs → hex values
  const FLOOR_COLOR_HEX: Record<string, string> = {
    ifloor_wood: '#d4c5b2', ifloor_marble: '#e8e5e0', ifloor_dark: '#78350f', ifloor_tile: '#60a5fa',
    ifloor_concrete: '#9ca3af', ifloor_pink: '#f9a8d4', ifloor_green: '#166534', ifloor_galaxy: '#1e1b4b',
  };
  const WALL_COLOR_HEX: Record<string, string> = {
    iwall_cream: '#f0ece8',
    iwall_white: '#f5f1ea',
    iwall_pink: '#f9c8d9',
    iwall_mint: '#d9f5e5',
    iwall_sky: '#d9ecff',
    iwall_lavender: '#efe0ff',
    iwall_charcoal: '#3b4658',
    iwall_sunset: '#fdba74',
  };
  const intCfg = (business?.interior_config || {}) as Record<string, unknown>;
  const resolvedFloorColor = FLOOR_COLOR_HEX[intCfg.floorColor as string] || undefined;
  const resolvedWallColor = WALL_COLOR_HEX[intCfg.wallColor as string] || undefined;
  const tvPosterUrl = (intCfg.tv_poster_url as string) || undefined;

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: isDark ? '#0a0a1a' : '#f0f2f5' }}>
      {/* Full Screen Simulator - 2D exterior + 3D on click */}
      <div className="absolute inset-0 z-[1]">
        {shopImageReady && stage === 'hub' ? (
          // ── Globe hub stage ──────────────────────────────────────
          // The student lands here first. They see their own shop on
          // the globe carousel plus any workshop shops they've
          // unlocked. Tap Enter to drop into the iso world. The
          // floating QR button lets workshop staff scan their pass
          // to add new shops to the carousel.
          <>
            <WorldGlobeHub
              name={geniusProfile?.first_name || shopName}
              buildings={hubBuildings}
              onEnter={(buildingId) => {
                if (buildingId === 'my-shop') {
                  // Entering from the globe always lands on the shop
                  // EXTERIOR first. Guard the interior auto-enter and
                  // scrub any stale `?enter=shop` marker / nav state so a
                  // later return-from-module still works correctly.
                  enteredViaGlobeRef.current = true;
                  if (location.search || location.state) {
                    navigate('/s/aipreneur', { replace: true });
                  }
                  setStage('iso');
                } else {
                  // Workshop-shop entry is Phase 4. For now flash a
                  // toast so the tap isn't silent.
                  setPendingWorkshopShop(buildingId);
                  setTimeout(() => setPendingWorkshopShop(null), 2400);
                }
              }}
            />
            {geniusProfile?.id && (
              <StudentQRButton
                studentId={geniusProfile.id}
                studentName={geniusProfile.first_name || shopName}
              />
            )}
            {pendingWorkshopShop && (
              <div
                className="fixed z-[55] left-1/2 -translate-x-1/2 w-[calc(100vw-1.5rem)] max-w-sm text-center px-4 py-2 rounded-full bg-slate-900/90 text-white text-xs font-semibold border border-white/15 backdrop-blur"
                style={{ top: 'max(env(safe-area-inset-top), 70px)' }}
              >
                That workshop's business module is on the way!
              </div>
            )}
          </>
        ) : shopImageReady ? (
          // ── Iso world stage ──────────────────────────────────────
          // The student's main "game" view is the same isometric scene
          // used on /demo. The AI-generated shop exterior shows as an
          // initial popout bubble above the player's My Shop building
          // (the bubble auto-hides when the user taps the building to
          // open the action menu). No more 2-D shop image OR 3-D walk-
          // around view — both removed in favour of one consistent map.
          <>
            {/* Back-to-globe button — system `BTN_3D_PRIMARY_SM` so it
                matches the rest of AIgenius (solid violet, neutral
                border, chunky 3D press). No blue, no sky gradient. */}
            <button
              type="button"
              onClick={() => setStage('hub')}
              aria-label="Back to globe"
              className={`${BTN_3D_PRIMARY_SM} fixed z-50 px-3.5 min-h-[44px]`}
              style={{
                top: 'max(env(safe-area-inset-top), 12px)',
                left: 'max(env(safe-area-inset-left), 12px)',
              }}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Globe</span>
            </button>
          <IsoScene
            playerShopName={shopName}
            // The hired shopkeeper's name (first staff member) floats above
            // the keeper in the live work sim — "Wei" et al.
            keeperName={staff[0]?.staff_name}
            playerShopImage={
              // Route through getShopImageUrl so `/storage/shops/...`
              // paths get rewritten to the `/aipreneur/shop-image/...`
              // controller endpoint. That's the path Laravel serves
              // with the CORS + cache headers the Capacitor WebView's
              // <img> loader needs — without this the popout bubble
              // in the iso scene stays a broken image inside the APK
              // while working fine in `npm run dev`.
              getShopImageUrl(business?.shop_image_url) ||
              getShopImageUrl(business?.shop_scene_image_url) ||
              undefined
            }
            // Top-bar HUD from real backend data. Popularity is a
            // monotonically-increasing integer level (no /100 ceiling
            // — the game has no upper bound). Unlaunched shops always
            // read Lv 1, regardless of whatever the backend record
            // happens to hold (stale seed data was showing Lv 12 on
            // brand-new accounts).
            stats={{
              tokens: rewards?.ai_tokens ?? 0,
              popularity: brandingPopularity,
              // The HUD "coins" chip is the spendable wallet (`rewards.coins`),
              // the SAME balance the Store, Pet Stall, and every `spend-coins`
              // flow read/write. Earlier this showed `business.total_profit`
              // (a separate lifetime-profit metric), so coins earned in the
              // shop never persisted and spends elsewhere never deducted here.
              coins: rewards?.coins ?? 0,
              streak: rewards?.current_streak ?? 0,
            }}
            // Crowd density:
            //   • AMBIENT pedestrians always walk the city so the
            //     world feels alive on day one — independent of
            //     popularity, products, or staff.
            //   • SHOP VISITORS are added on top, sized by popularity
            //     (Lv 1-5: +1-2, Lv 6-10: +2-3, Lv 11-15: +3-4, …).
            //     Only attributed once the shop is actually ready
            //     (staff hired + ≥2 products) — before that there's
            //     nothing for customers to buy.
            npcCount={(() => {
              const AMBIENT_NPCS = 10; // baseline city life
              const shopReady = staff.length > 0 && products.length >= 2;
              const shopVisitors = shopReady
                ? npcCountForLevel(brandingPopularity)
                : 0;
              return AMBIENT_NPCS + shopVisitors;
            })()}
            // Dock navigates to real student pages instead of opening
            // the anonymous /demo modal.
            onDockAction={(id) => {
              const opts = withFrom(location);
              switch (id) {
                // Live dock — mirrors the global BottomNav slots.
                case 'store':   navigate('/s/aipreneur/store', opts); break;
                case 'explore': navigate('/s/aipreneur/explore', opts); break;
                case 'rewards': navigate('/s/aipreneur/rewards', opts); break;
                case 'more':    setShowDockMore(true); break;
                // Legacy ids kept routable in case the default dock set is
                // ever shown to a logged-in student.
                case 'tokens':  navigate('/s/aipreneur/ai-tokens', opts); break;
                case 'shop':    navigate('/s/aipreneur/explore', opts); break;
                case 'profile': navigate('/s/aipreneur/profile', opts); break;
                case 'modules': navigate('/s/aipreneur/manage', opts); break;
              }
            }}
            // HUD Tokens pill — route to the real top-up page. Without
            // this we'd fall back to the demo "Sign up to buy" modal,
            // which is wrong for an authenticated student.
            onTokensClick={() => navigate('/s/aipreneur/ai-tokens', withFrom(location))}
            // Hydrate the player's saved interior decoration so entering
            // their shop on the iso map shows whatever they built in the
            // Decorate module. Other shops keep their default layout.
            playerInteriorLayout={hydrateLayout(business?.interior_config)}
            // Persist coins/XP earned inside the shop. Buffered + mirrored to
            // localStorage so the HUD wallet (rewards.coins) keeps what the
            // player earns even across an immediate refresh.
            onShopEarnCoins={(amount) => addShopEarnings('coins', amount)}
            onShopEarnXp={(amount) => addShopEarnings('xp', amount)}
            onInteriorChange={(inside) => {
              setInInterior(inside);
              // Leaving the shop → flush pending earnings immediately so the
              // city HUD shows the up-to-date wallet right away.
              if (!inside) void flushShopEarnings();
              // Persist the working-shop state so a refresh returns here.
              try {
                if (inside) sessionStorage.setItem('aipreneur_in_shop', '1');
                else sessionStorage.removeItem('aipreneur_in_shop');
              } catch { /* ignore */ }
            }}
            enterPlayerInterior={enterPlayerInterior}
            // ── Live progress fed into the in-shop ShopMiniGame so its
            // Missions panel reflects the student's actual AIpreneur
            // module state. Derived from the same business / staff /
            // products / marketing data the dashboard already uses.
            shopProgress={{
              hasProduct: products.length > 0,
              hasStaff: staff.length > 0,
              hasDecor: !!(
                business?.interior_config &&
                (((business.interior_config as any).floor ?? 0) > 0 ||
                  ((business.interior_config as any).wall ?? 0) > 0 ||
                  ((business.interior_config as any).cashier ?? 0) > 0 ||
                  ((business.interior_config as any).shelfLeft ?? 0) > 0 ||
                  ((business.interior_config as any).shelfRight ?? 0) > 0)
              ),
              hasMarketing:
                (marketingAssets || []).length > 0 ||
                (influencerCampaigns || []).length > 0,
              hasInnovation: (innovations || []).length > 0,
              hasCSR: !!business?.last_csr_action_date,
              shopLaunched: business?.shop_launched || false,
            }}
            // Mini-game routes the player to the real AIpreneur module
            // pages via react-router. Same routes used everywhere else
            // (App.tsx <Route path="/s/aipreneur/...">).
            // From INSIDE the shop, the back button on the destination page
            // should return to the shop interior — not the city. We encode
            // that by setting `from` to the dashboard URL with `?enter=shop`,
            // which the dashboard reads on mount to auto-enter the interior.
            onShopNavigate={(route) => navigate(`/s/aipreneur/${route}`, {
              state: { from: '/s/aipreneur?enter=shop', enterInterior: true, moduleCompleted: true },
            })}
            // Themed product pool for the in-shop mini-game. Falls back to
            // the default mixed pool when the student hasn't chosen a type.
            shopCategory={geniusProfile?.passion_category ?? null}
          />
          {/* Gamified HUD overlay — quest log, mascot guide, shop vitals,
              quest-complete reward toasts. Sits on top of the iso scene
              with pointer-events-none on its root so the 3D scene stays
              interactive everywhere except the overlay's own cards.
              Hidden while the player is INSIDE the shop — the ShopMiniGame
              owns the UI there to avoid HUD overlap. */}
          {!inInterior && <GameOverlay
            state={{
              shopName,
              shopLaunched: business?.shop_launched || false,
              productsCount: products.length,
              staffCount: staff.length,
              aiTokens: rewards?.ai_tokens ?? 0,
              // Spendable wallet (see note on the IsoScene stats above).
              coins: rewards?.coins ?? 0,
              level: rewards?.level ?? 1,
              xp: rewards?.xp ?? 0,
              popularityLevel: brandingPopularity,
              interiorCustomized: !!(
                business?.interior_config &&
                (((business.interior_config as any).floor ?? 0) > 0 ||
                  ((business.interior_config as any).wall ?? 0) > 0 ||
                  ((business.interior_config as any).cashier ?? 0) > 0 ||
                  ((business.interior_config as any).shelfLeft ?? 0) > 0 ||
                  ((business.interior_config as any).shelfRight ?? 0) > 0)
              ),
              totalSales: business?.total_sales ?? 0,
            }}
            onQuestClick={(route) => navigate(`/s/aipreneur/${route}`, withFrom(location))}
            autoOpen={
              !dataLoading && (
                products.length < 1 ||
                staff.length < 1 ||
                (rewards?.ai_tokens ?? 0) < 10 ||
                !(business?.shop_launched) ||
                (business?.total_sales ?? 0) < 5
              )
            }
          />}
          </>
        ) : (
          <ShopGenerationStatus
            status={business?.shop_image_status}
            hasShopImage={hasShopImage}
            lastError={shopGenPollError}
            onCreateShop={() => setShowNewOnboarding(true)}
          />
        )}
      </div>

      {/* Interactive Tutorial - Updated V2 with Control Center UI */}
      <InteractiveTutorial
        isOpen={showTutorial}
        onClose={() => {
          setShowTutorial(false);
          if (geniusProfile?.id) {
            markTutorialCompleted(geniusProfile.id);
          }
        }}
        isShopGenerated={shopImageReady}
        hasProducts={products.length > 0}
        hasStaff={staff.length > 0}
        onOpenControlCenter={() => {}}
        onCloseControlCenter={() => {}}
      />

      {/* Onboarding Flow */}
      {
        showNewOnboarding && (
          <OnboardingFlow
            onComplete={async () => {
              setShowNewOnboarding(false);
              await refreshAll();
            }}
            onClose={() => setShowNewOnboarding(false)}
            studentName={geniusProfile?.first_name || 'Friend'}
            skipBossIntro={false}
            skipQuestionnaire={false}
          />
        )
      }

      {/* Ribbon Cutting Ceremony */}
      <RibbonCuttingCeremony
        isOpen={showRibbonCutting}
        onClose={() => setShowRibbonCutting(false)}
        onComplete={async () => {
          setShowRibbonCutting(false);
          await refreshAll();
        }}
        shopName={shopName}
      />

      {/* Offline Earnings Modal - Shows earnings accumulated while user was away */}
      <OfflineEarningsModal
        isOpen={showOfflineEarningsModal}
        onClose={() => setShowOfflineEarningsModal(false)}
        onClaim={async () => {
          try {
            await offlineApi.claimOfflineEarnings();
            await refreshAll();
          } catch (error) {
            console.error('Failed to claim offline earnings:', error);
            throw error;
          }
        }}
        earningsData={offlineEarnings}
        notifications={offlineNotifications}
      />

      {/* Inactivity Consequences Modal */}
      <InactivityConsequencesModal
        isOpen={showInactivityModal}
        onClose={() => setShowInactivityModal(false)}
        consequences={inactivityConsequences}
        daysMissed={inactivityDaysMissed}
      />

      <PersonaQuizModal
        isOpen={showPersonaQuiz}
        onClose={() => setShowPersonaQuiz(false)}
        onComplete={async () => {
          setShowPersonaQuiz(false);
          await refreshProfile();
          await refreshAll();
          try {
            const response = await personaApi.getProfile();
            if (response.success && response.persona) {
              setPersonaProfile(response.persona);
            }
          } catch (error) {
            if (isPersonaProfileNotFoundError(error)) {
              setPersonaProfile(null);
              return;
            }
            console.error('Failed to load persona profile:', error);
          }
        }}
      />

      {/* ── Cozy magical layer ────────────────────────────────────────
          Pulled from <CompanionProvider> at the App root, so wiring is
          once-only. Everything here sits on top of the iso scene:
            • Spark           — AI imagination companion (corner bubble)
            • RewardBurst     — wow-moment overlay on every badge claim
            • MagicalOverlay  — shooting stars, festival drift, hidden secrets
            • Portals         — Invention Lab + Mystery Bazaar entrances
            • FestivalBanner  — seasonal banner (Lantern/Sun/Rainbow/Star)
            • DailyCreativeQuest — pinned daily AI quest widget */}
      {stage === 'iso' && <FestivalBanner />}
      {stage === 'iso' && !inInterior && <MagicalOverlay />}
      {/* Portals owns the MagicHub picker + the three modals it routes
          to (Inventory / Invention Lab / Mystery Bazaar). It must be
          mounted EVERYWHERE the Magic dock tile is reachable — including
          inside the shop interior — otherwise tapping the tile dispatches
          an `open-portal` event into the void. */}
      {stage === 'iso' && <Portals />}
      {/* "More" sheet for the iso WorldDock — same component the BottomNav
          uses, plus a scene-only "Magic" tile that opens the Portals hub
          (Inventory / Invention Lab / Mystery Bazaar) the iso dock used to
          expose directly. */}
      <StudentMoreSheet
        show={showDockMore}
        onClose={() => setShowDockMore(false)}
        extraItems={MAGIC_DOCK_ITEM}
      />
      {stage === 'iso' && <DailyCreativeQuest />}
      <Spark />
      <RewardBurst />
    </div>
  );
};
