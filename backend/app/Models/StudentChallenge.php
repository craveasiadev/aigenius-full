<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentChallenge extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'student_challenges';

    protected $fillable = [
        'student_id',
        'challenge_id',
        'assigned_at',
        'expires_at',
        'status',
        'progress_current',
        'progress_target',
        'progress_percentage',
        'completed_at',
        'time_taken_minutes',
        'reward_claimed',
        'is_streak_challenge',
        'streak_day',
        'challenge_data',
    ];

    protected $casts = [
        'assigned_at' => 'datetime',
        'expires_at' => 'datetime',
        'completed_at' => 'datetime',
        'reward_claimed' => 'boolean',
        'is_streak_challenge' => 'boolean',
        'challenge_data' => 'array',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(GeniusProfile::class, 'student_id');
    }

    public function challenge(): BelongsTo
    {
        return $this->belongsTo(ChallengesCatalog::class, 'challenge_id');
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('status', 'active')
            ->where('expires_at', '>=', now());
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    // Methods
    public function updateProgress(int $amount = 1): self
    {
        $this->progress_current += $amount;
        $this->progress_percentage = min(100, ($this->progress_current / $this->progress_target) * 100);

        if ($this->progress_current >= $this->progress_target) {
            $this->status = 'completed';
            $this->completed_at = now();
        }

        $this->save();
        return $this;
    }
}
