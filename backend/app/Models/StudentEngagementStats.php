<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentEngagementStats extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'student_engagement_stats';

    protected $fillable = [
        'student_id',
        'current_streak_days',
        'longest_streak_days',
        'last_active_date',
        'total_challenges_completed',
        'daily_challenges_completed',
        'weekly_challenges_completed',
        'monthly_challenges_completed',
        'total_events_participated',
        'total_events_completed',
        'total_life_events_resolved',
        'total_sessions',
        'total_time_minutes',
        'average_session_minutes',
        'last_challenge_date',
        'last_event_date',
        'last_life_event_date',
    ];

    protected $casts = [
        'last_active_date' => 'date',
        'last_challenge_date' => 'date',
        'last_event_date' => 'date',
        'last_life_event_date' => 'date',
        'average_session_minutes' => 'decimal:2',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(GeniusProfile::class, 'student_id');
    }

    // Methods
    public function updateStreak(): self
    {
        $today = now()->toDateString();
        $yesterday = now()->subDay()->toDateString();
        $lastActive = $this->last_active_date?->toDateString();

        if ($lastActive === $today) {
            // Already updated today
            return $this;
        }

        if ($lastActive === $yesterday) {
            $this->current_streak_days += 1;
        } elseif ($lastActive !== $today) {
            $this->current_streak_days = 1;
        }

        $this->longest_streak_days = max($this->longest_streak_days, $this->current_streak_days);
        $this->last_active_date = $today;
        $this->save();

        return $this;
    }

    public function incrementChallenges(): self
    {
        $this->total_challenges_completed += 1;
        $this->last_challenge_date = now()->toDateString();
        $this->save();
        return $this;
    }

    public function incrementEvents(): self
    {
        $this->total_events_completed += 1;
        $this->last_event_date = now()->toDateString();
        $this->save();
        return $this;
    }

    public function incrementLifeEvents(): self
    {
        $this->total_life_events_resolved += 1;
        $this->last_life_event_date = now()->toDateString();
        $this->save();
        return $this;
    }
}
