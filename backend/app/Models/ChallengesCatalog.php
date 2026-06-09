<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChallengesCatalog extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'challenges_catalog';

    protected $fillable = [
        'challenge_code',
        'challenge_name',
        'description',
        'challenge_type',
        'difficulty',
        'estimated_duration_minutes',
        'required_module',
        'required_level',
        'requirements',
        'reward_coins',
        'reward_experience',
        'reward_badge',
        'streak_bonus_multiplier',
        'learning_topic',
        'learning_objective',
        'hint_text',
        'target_age_min',
        'target_age_max',
        'is_active',
        'rotation_priority',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'requirements' => 'array',
        'streak_bonus_multiplier' => 'decimal:2',
    ];

    public function studentChallenges(): HasMany
    {
        return $this->hasMany(StudentChallenge::class, 'challenge_id');
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeByType($query, string $type)
    {
        return $query->where('challenge_type', $type);
    }
}
