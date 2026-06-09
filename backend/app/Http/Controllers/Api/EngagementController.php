<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActiveEvent;
use App\Models\ChallengesCatalog;
use App\Models\EventsCatalog;
use App\Models\GeniusProfile;
use App\Models\LifeEventsCatalog;
use App\Models\MarketTrend;
use App\Models\SeasonalContent;
use App\Models\StudentChallenge;
use App\Models\StudentEngagementStats;
use App\Models\StudentLifeEvent;
use App\Models\SystemConfig;
use App\Models\AIpreneurReward;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EngagementController extends Controller
{
    // =============================================
    // EVENTS
    // =============================================

    /**
     * Get active events for student.
     */
    public function getActiveEvents(Request $request): JsonResponse
    {
        $profile = $request->genius_profile;

        $events = ActiveEvent::with('event')
            ->where('student_id', $profile->id)
            ->where('is_completed', false)
            ->where('expires_at', '>=', now())
            ->get()
            ->map(fn($item) => [
                'id' => $item->id,
                'event_id' => $item->event_id,
                'event_name' => $item->event->event_name,
                'description' => $item->event->description,
                'event_type' => $item->event->event_type,
                'notification_text' => $item->event->notification_text,
                'impact_sales_multiplier' => $item->event->impact_sales_multiplier,
                'impact_traffic_multiplier' => $item->event->impact_traffic_multiplier,
                'impact_mood_change' => $item->event->impact_mood_change,
                'reward_coins' => $item->event->reward_coins,
                'started_at' => $item->started_at,
                'expires_at' => $item->expires_at,
                'is_completed' => $item->is_completed,
                'progress_percentage' => $item->progress_percentage,
            ]);

        return response()->json([
            'success' => true,
            'events' => $events,
        ]);
    }

    /**
     * Complete an event.
     */
    public function completeEvent(Request $request, string $eventId): JsonResponse
    {
        $profile = $request->genius_profile;

        $activeEvent = ActiveEvent::with('event')
            ->where('id', $eventId)
            ->where('student_id', $profile->id)
            ->first();

        if (!$activeEvent) {
            return response()->json([
                'success' => false,
                'message' => 'Event not found.',
            ], 404);
        }

        $activeEvent->update([
            'is_completed' => true,
            'completed_at' => now(),
            'progress_percentage' => 100,
            'reward_claimed' => true,
        ]);

        // Award coins
        if ($activeEvent->event->reward_coins > 0) {
            $profile->rewards?->addCoins($activeEvent->event->reward_coins);
        }

        // Update stats
        $this->getOrCreateStats($profile->id)->incrementEvents();

        return response()->json([
            'success' => true,
            'reward_coins' => $activeEvent->event->reward_coins,
        ]);
    }

    // =============================================
    // CHALLENGES
    // =============================================

    /**
     * Get active challenges for student.
     */
    public function getActiveChallenges(Request $request): JsonResponse
    {
        $profile = $request->genius_profile;

        $challenges = StudentChallenge::with('challenge')
            ->where('student_id', $profile->id)
            ->where('status', 'active')
            ->where('expires_at', '>=', now())
            ->get()
            ->map(fn($item) => [
                'id' => $item->id,
                'challenge_id' => $item->challenge_id,
                'challenge_name' => $item->challenge->challenge_name,
                'description' => $item->challenge->description,
                'challenge_type' => $item->challenge->challenge_type,
                'difficulty' => $item->challenge->difficulty,
                'reward_coins' => $item->challenge->reward_coins,
                'learning_topic' => $item->challenge->learning_topic,
                'status' => $item->status,
                'progress_current' => $item->progress_current,
                'progress_target' => $item->progress_target,
                'progress_percentage' => $item->progress_percentage,
                'expires_at' => $item->expires_at,
                'is_streak_challenge' => $item->is_streak_challenge,
            ]);

        return response()->json([
            'success' => true,
            'challenges' => $challenges,
        ]);
    }

    /**
     * Complete a challenge.
     */
    public function completeChallenge(Request $request, string $challengeId): JsonResponse
    {
        $profile = $request->genius_profile;

        $studentChallenge = StudentChallenge::with('challenge')
            ->where('id', $challengeId)
            ->where('student_id', $profile->id)
            ->first();

        if (!$studentChallenge) {
            return response()->json([
                'success' => false,
                'message' => 'Challenge not found.',
            ], 404);
        }

        $studentChallenge->update([
            'status' => 'completed',
            'completed_at' => now(),
            'progress_percentage' => 100,
        ]);

        // Calculate reward with streak bonus
        $bonusMultiplier = $studentChallenge->is_streak_challenge ? 1.5 : 1.0;
        $coinReward = (int) floor($studentChallenge->challenge->reward_coins * $bonusMultiplier);

        $profile->rewards?->addCoins($coinReward);

        // Update stats
        $this->getOrCreateStats($profile->id)->incrementChallenges();

        return response()->json([
            'success' => true,
            'reward_coins' => $coinReward,
        ]);
    }

    /**
     * Update challenge progress.
     */
    public function updateChallengeProgress(Request $request, string $challengeId): JsonResponse
    {
        $request->validate([
            'amount' => 'required|integer|min:1',
        ]);

        $profile = $request->genius_profile;

        $studentChallenge = StudentChallenge::where('id', $challengeId)
            ->where('student_id', $profile->id)
            ->where('status', 'active')
            ->first();

        if (!$studentChallenge) {
            return response()->json([
                'success' => false,
                'message' => 'Challenge not found.',
            ], 404);
        }

        $studentChallenge->updateProgress($request->amount);

        return response()->json([
            'success' => true,
            'challenge' => $studentChallenge->fresh()->load('challenge'),
        ]);
    }

    // =============================================
    // LIFE EVENTS
    // =============================================

    /**
     * Get pending life events.
     */
    public function getPendingLifeEvents(Request $request): JsonResponse
    {
        $profile = $request->genius_profile;

        $lifeEvents = StudentLifeEvent::with('event')
            ->where('student_id', $profile->id)
            ->where('status', 'pending')
            ->get()
            ->map(fn($item) => [
                'id' => $item->id,
                'event_id' => $item->event_id,
                'event_name' => $item->event->event_name,
                'event_category' => $item->event->event_category,
                'scenario_text' => $item->event->scenario_text,
                'character_name' => $item->event->character_name,
                'character_role' => $item->event->character_role,
                'choices' => $item->event->choices,
                'status' => $item->status,
                'triggered_at' => $item->triggered_at,
            ]);

        return response()->json([
            'success' => true,
            'life_events' => $lifeEvents,
        ]);
    }

    /**
     * Resolve a life event.
     */
    public function resolveLifeEvent(Request $request, string $lifeEventId): JsonResponse
    {
        $request->validate([
            'choice_id' => 'required|string',
        ]);

        $profile = $request->genius_profile;

        $lifeEvent = StudentLifeEvent::with('event')
            ->where('id', $lifeEventId)
            ->where('student_id', $profile->id)
            ->where('status', 'pending')
            ->first();

        if (!$lifeEvent) {
            return response()->json([
                'success' => false,
                'message' => 'Life event not found.',
            ], 404);
        }

        $outcome = $lifeEvent->resolve($request->choice_id);

        if (!$outcome) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid choice.',
            ], 400);
        }

        // Apply coin changes
        if (isset($outcome['coins'])) {
            if ($outcome['coins'] > 0) {
                $profile->rewards?->addCoins($outcome['coins']);
            } else {
                $profile->rewards?->spendCoins(abs($outcome['coins']));
            }
        }

        // Apply mood changes to business
        if (isset($outcome['mood']) && $profile->business) {
            $newMood = max(0, min(100, $profile->business->staff_overall_mood + $outcome['mood']));
            $profile->business->update(['staff_overall_mood' => $newMood]);
        }

        // Update stats
        $this->getOrCreateStats($profile->id)->incrementLifeEvents();

        return response()->json([
            'success' => true,
            'outcome' => $outcome,
        ]);
    }

    // =============================================
    // ENGAGEMENT STATS
    // =============================================

    /**
     * Get engagement stats.
     */
    public function getEngagementStats(Request $request): JsonResponse
    {
        $profile = $request->genius_profile;
        $stats = $this->getOrCreateStats($profile->id);

        return response()->json([
            'success' => true,
            'stats' => [
                'current_streak_days' => $stats->current_streak_days,
                'longest_streak_days' => $stats->longest_streak_days,
                'total_challenges_completed' => $stats->total_challenges_completed,
                'total_events_completed' => $stats->total_events_completed,
                'total_life_events_resolved' => $stats->total_life_events_resolved,
            ],
        ]);
    }

    /**
     * Update streak.
     */
    public function updateStreak(Request $request): JsonResponse
    {
        $profile = $request->genius_profile;
        $stats = $this->getOrCreateStats($profile->id);
        $stats->updateStreak();

        return response()->json([
            'success' => true,
            'current_streak_days' => $stats->current_streak_days,
            'longest_streak_days' => $stats->longest_streak_days,
        ]);
    }

    // =============================================
    // SYSTEM CONFIG
    // =============================================

    /**
     * Get system configuration.
     */
    public function getSystemConfig(): JsonResponse
    {
        $config = SystemConfig::all()->pluck('config_value', 'config_key')->toArray();

        return response()->json([
            'success' => true,
            'config' => $config,
        ]);
    }

    // =============================================
    // SEASONAL & MARKET
    // =============================================

    /**
     * Get current market trends.
     */
    public function getMarketTrends(): JsonResponse
    {
        $trends = MarketTrend::active()->currentlyRunning()->get();

        return response()->json([
            'success' => true,
            'trends' => $trends,
        ]);
    }

    /**
     * Get available seasonal content.
     */
    public function getSeasonalContent(): JsonResponse
    {
        $content = SeasonalContent::active()->currentlyAvailable()->get();

        return response()->json([
            'success' => true,
            'seasonal_content' => $content,
        ]);
    }

    // =============================================
    // TRIGGERING
    // =============================================

    /**
     * Trigger random life event based on probability.
     */
    public function triggerRandomLifeEvent(Request $request): JsonResponse
    {
        $profile = $request->genius_profile;

        $lifeEventsEnabled = SystemConfig::getValue('life_events_enabled', true);
        if (!$lifeEventsEnabled) {
            return response()->json([
                'success' => false,
                'message' => 'Life events are disabled.',
            ]);
        }

        $probability = SystemConfig::getValue('life_events_daily_probability', 0.3);
        if (mt_rand() / mt_getrandmax() > $probability) {
            return response()->json([
                'success' => false,
                'message' => 'No life event triggered.',
            ]);
        }

        // Check max pending
        $maxPending = SystemConfig::getValue('life_events_max_pending', 2);
        $pendingCount = StudentLifeEvent::where('student_id', $profile->id)
            ->where('status', 'pending')
            ->count();

        if ($pendingCount >= $maxPending) {
            return response()->json([
                'success' => false,
                'message' => 'Maximum pending life events reached.',
            ]);
        }

        // Get random active event
        $availableEvent = LifeEventsCatalog::active()->inRandomOrder()->first();

        if (!$availableEvent) {
            return response()->json([
                'success' => false,
                'message' => 'No life events available.',
            ]);
        }

        $expiresAt = now()->addDays(3);

        $studentLifeEvent = StudentLifeEvent::create([
            'student_id' => $profile->id,
            'event_id' => $availableEvent->id,
            'expires_at' => $expiresAt,
        ]);

        return response()->json([
            'success' => true,
            'life_event' => $studentLifeEvent->load('event'),
        ]);
    }

    /**
     * Assign daily challenges.
     */
    public function assignDailyChallenges(Request $request): JsonResponse
    {
        $profile = $request->genius_profile;

        $challengesEnabled = SystemConfig::getValue('challenges_enabled', true);
        if (!$challengesEnabled) {
            return response()->json([
                'success' => false,
                'message' => 'Challenges are disabled.',
            ]);
        }

        $dailyCount = SystemConfig::getValue('challenges_daily_count', 3);

        // Check existing active challenges
        $existingCount = StudentChallenge::where('student_id', $profile->id)
            ->where('status', 'active')
            ->where('expires_at', '>=', now())
            ->count();

        if ($existingCount >= $dailyCount) {
            return response()->json([
                'success' => true,
                'message' => 'Daily challenges already assigned.',
                'challenges' => StudentChallenge::with('challenge')
                    ->where('student_id', $profile->id)
                    ->active()
                    ->get(),
            ]);
        }

        $toAssign = $dailyCount - $existingCount;

        $availableChallenges = ChallengesCatalog::active()
            ->where('challenge_type', 'daily')
            ->inRandomOrder()
            ->limit($toAssign)
            ->get();

        $expiresAt = now()->endOfDay();
        $assigned = [];

        foreach ($availableChallenges as $challenge) {
            $assigned[] = StudentChallenge::create([
                'student_id' => $profile->id,
                'challenge_id' => $challenge->id,
                'progress_target' => 1,
                'expires_at' => $expiresAt,
            ]);
        }

        return response()->json([
            'success' => true,
            'assigned' => count($assigned),
            'challenges' => StudentChallenge::with('challenge')
                ->where('student_id', $profile->id)
                ->active()
                ->get(),
        ]);
    }

    // =============================================
    // HELPERS
    // =============================================

    private function getOrCreateStats(string $studentId): StudentEngagementStats
    {
        return StudentEngagementStats::firstOrCreate(
            ['student_id' => $studentId],
            []
        );
    }
}
