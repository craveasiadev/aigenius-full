/**
 * useAutoAwardBadges Hook
 *
 * Automatically checks badge/achievement conditions against current business data
 * and awards badges via the backend API when conditions are met.
 * Runs as a side-effect whenever relevant data changes.
 */

import { useEffect, useRef, useCallback } from 'react';
import { rewardsApi, type AIpreneurReward } from '../services/aipreneurApi';

// All badge definitions with their conditions
interface BadgeCondition {
  id: string;
  /** Achievement ID sent to backend (matches HALL_OF_FAME_BADGES ids) */
  achievementId: string;
  xpReward: number;
  coinsReward: number;
  check: (data: BadgeCheckData) => boolean;
}

export interface BadgeCheckData {
  productsCount: number;
  staffCount: number;
  campaignsCount: number;
  influencerCampaignsCount: number;
  innovationsCount: number;
  decorationsSet: boolean;
  interiorCustomized: boolean;
  totalSales: number;
  shopLaunched: boolean;
  currentStreak: number;
  currentLevel: number;
  totalAiTokensEarned: number;
  totalDonated: number;
  selectedCause: string | null;
  csrActionCount: number;
}

const BADGE_CONDITIONS: BadgeCondition[] = [
  // === Quest badges ===
  {
    id: 'first_steps',
    achievementId: 'first_steps',
    xpReward: 50,
    coinsReward: 25,
    check: (d) => d.productsCount >= 1,
  },
  {
    id: 'product_master',
    achievementId: 'product_master',
    xpReward: 150,
    coinsReward: 50,
    check: (d) => d.productsCount >= 5,
  },
  {
    id: 'team_builder',
    achievementId: 'team_builder',
    xpReward: 75,
    coinsReward: 30,
    check: (d) => d.staffCount >= 1,
  },
  {
    id: 'week_champion',
    achievementId: 'week_champion',
    xpReward: 200,
    coinsReward: 75,
    check: (d) => d.currentStreak >= 7,
  },
  {
    id: 'grand_opening',
    achievementId: 'grand_opening',
    xpReward: 100,
    coinsReward: 50,
    check: (d) => d.shopLaunched,
  },
  {
    id: 'money_maker',
    achievementId: 'money_maker',
    xpReward: 250,
    coinsReward: 100,
    check: (d) => d.totalSales >= 100,
  },
  {
    id: 'level_master',
    achievementId: 'level_master',
    xpReward: 300,
    coinsReward: 100,
    check: (d) => d.currentLevel >= 5,
  },
  {
    id: 'token_collector',
    achievementId: 'token_collector',
    xpReward: 200,
    coinsReward: 50,
    check: (d) => d.totalAiTokensEarned >= 1000,
  },
  {
    id: 'marketing_guru',
    achievementId: 'marketing_guru',
    xpReward: 150,
    coinsReward: 50,
    check: (d) => d.campaignsCount >= 3,
  },
  {
    id: 'tech_innovator',
    achievementId: 'tech_innovator',
    xpReward: 150,
    coinsReward: 50,
    check: (d) => d.innovationsCount >= 3,
  },
  {
    id: 'decorator_pro',
    achievementId: 'decorator_pro',
    xpReward: 100,
    coinsReward: 30,
    check: (d) => d.decorationsSet || d.interiorCustomized,
  },
  {
    id: 'influencer_king',
    achievementId: 'influencer_king',
    xpReward: 100,
    coinsReward: 50,
    check: (d) => d.influencerCampaignsCount >= 1,
  },
  {
    id: 'daily_warrior',
    achievementId: 'daily_warrior',
    xpReward: 50,
    coinsReward: 20,
    check: (d) => d.currentStreak >= 1,
  },
  // === CSR badges ===
  {
    id: 'community_hero',
    achievementId: 'community_hero',
    xpReward: 100,
    coinsReward: 50,
    check: (d) => d.csrActionCount >= 3,
  },
  {
    id: 'green_champion',
    achievementId: 'green_champion',
    xpReward: 75,
    coinsReward: 30,
    check: (d) => d.selectedCause != null && d.selectedCause !== '' && d.totalDonated > 0,
  },
  {
    id: 'charity_star',
    achievementId: 'charity_star',
    xpReward: 150,
    coinsReward: 75,
    check: (d) => d.totalDonated >= 50,
  },
];

interface UseAutoAwardBadgesParams {
  data: BadgeCheckData | null;
  rewards: AIpreneurReward | null;
  /** Called when a new badge has just been claimed on the backend. Second
   *  arg carries the granted rewards so callers (e.g. the celebration
   *  overlay) can show "+X XP / +Y coins" without re-doing the lookup. */
  onBadgeAwarded?: (badgeId: string, rewards: { xp: number; coins: number }) => void;
  loadRewards: () => Promise<void>;
}

/**
 * Automatically awards badges when their conditions are met.
 * Checks all badge conditions on every data change and calls the backend
 * to claim any newly earned achievements.
 */
export function useAutoAwardBadges({ data, rewards, onBadgeAwarded, loadRewards }: UseAutoAwardBadgesParams) {
  // Track which badges we've already attempted to claim this session to avoid duplicate API calls
  const claimedThisSessionRef = useRef<Set<string>>(new Set());
  // Prevent concurrent claim operations
  const claimingRef = useRef(false);

  const checkAndAwardBadges = useCallback(async () => {
    if (!data || !rewards || claimingRef.current) return;

    // Get current earned badges from backend
    const earnedBadges = new Set<string>(
      (rewards.badges || []).map((b: string) => b.toLowerCase().replace(/\s+/g, '_'))
    );

    // Find badges that are newly earned (condition met but not yet in backend)
    const newlyEarned: BadgeCondition[] = [];
    for (const badge of BADGE_CONDITIONS) {
      const alreadyEarned = earnedBadges.has(badge.id);
      const alreadyClaimed = claimedThisSessionRef.current.has(badge.id);
      if (!alreadyEarned && !alreadyClaimed && badge.check(data)) {
        newlyEarned.push(badge);
      }
    }

    if (newlyEarned.length === 0) return;

    claimingRef.current = true;

    // Award badges sequentially to avoid race conditions
    for (const badge of newlyEarned) {
      claimedThisSessionRef.current.add(badge.id);
      try {
        const response = await rewardsApi.claimAchievement(
          badge.achievementId,
          badge.xpReward,
          badge.coinsReward
        );
        if (response.success) {
          console.log(`[AutoBadge] Awarded badge: ${badge.id}`);
          onBadgeAwarded?.(badge.id, { xp: badge.xpReward, coins: badge.coinsReward });
        }
      } catch (err) {
        // If claim fails (e.g., already claimed on backend), just log and continue
        console.warn(`[AutoBadge] Failed to claim badge ${badge.id}:`, err);
      }
    }

    claimingRef.current = false;

    // Reload rewards to get updated badges array
    if (newlyEarned.length > 0) {
      try {
        await loadRewards();
      } catch { /* ignore */ }
    }
  }, [data, rewards, onBadgeAwarded, loadRewards]);

  // Run badge check whenever data or rewards change
  useEffect(() => {
    checkAndAwardBadges();
  }, [checkAndAwardBadges]);

  return {
    /** Manually trigger a badge check (e.g., after an action) */
    checkBadges: checkAndAwardBadges,
  };
}
