<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AIpreneurReward extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'aipreneur_rewards';

    protected $fillable = [
        'student_id',
        'coins',
        'ai_tokens',
        'stars',
        'xp',
        'level',
        'badges',
        'current_streak',
        'longest_streak',
        'last_activity_date',
        'last_daily_claim_date',
    ];

    protected $casts = [
        'badges' => 'array',
        'last_activity_date' => 'date',
        'last_daily_claim_date' => 'date',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(GeniusProfile::class, 'student_id');
    }

    /**
     * Add coins to the reward balance.
     */
    public function addCoins(int $amount): void
    {
        $this->coins += $amount;
        $this->save();
    }

    /**
     * Spend coins from the reward balance.
     */
    public function spendCoins(int $amount): bool
    {
        if ($this->coins < $amount) {
            return false;
        }
        $this->coins -= $amount;
        $this->save();
        return true;
    }

    /**
     * Add AI tokens to the reward balance (purchased with real money).
     */
    public function addAITokens(int $amount): void
    {
        $this->ai_tokens += $amount;
        $this->save();
    }

    /**
     * Spend AI tokens from the reward balance.
     */
    public function spendAITokens(int $amount): bool
    {
        if ($this->ai_tokens < $amount) {
            return false;
        }
        $this->ai_tokens -= $amount;
        $this->save();
        return true;
    }

    /**
     * Add XP and check for level up.
     */
    public function addXp(int $amount): bool
    {
        $xpPerLevel = 100;
        $this->xp += $amount;
        $leveledUp = false;

        // Level up every 100 XP
        while ($this->xp >= $xpPerLevel) {
            $this->xp -= $xpPerLevel;
            $this->level++;
            $leveledUp = true;
        }

        $this->save();
        return $leveledUp;
    }

    /**
     * Update streak based on activity.
     */
    public function updateStreak(): void
    {
        $today = now()->toDateString();
        $lastActivity = $this->last_activity_date?->toDateString();
        $currentStreak = max(0, (int) $this->current_streak);
        $longestStreak = max($currentStreak, (int) $this->longest_streak);

        if ($lastActivity === $today) {
            return; // Already logged today
        }

        // Gameplay rule: streak is cumulative across claim days.
        // As long as claim is not duplicated on the same day, increment by 1.
        $currentStreak++;

        $longestStreak = max($longestStreak, $currentStreak);

        $this->current_streak = $currentStreak;
        $this->longest_streak = $longestStreak;
        $this->last_activity_date = $today;
        $this->save();
    }

    /**
     * Award a badge to the student.
     */
    public function awardBadge(string $badgeId): bool
    {
        $badges = $this->badges ?? [];

        if (in_array($badgeId, $badges)) {
            return false; // Already has badge
        }

        $badges[] = $badgeId;
        $this->badges = $badges;
        $this->save();

        return true;
    }
}
