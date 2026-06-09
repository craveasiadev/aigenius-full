<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActiveEvent extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'active_events';

    protected $fillable = [
        'student_id',
        'event_id',
        'started_at',
        'expires_at',
        'is_completed',
        'completed_at',
        'progress_percentage',
        'times_viewed',
        'actions_taken',
        'reward_claimed',
        'outcome_data',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'expires_at' => 'datetime',
        'completed_at' => 'datetime',
        'is_completed' => 'boolean',
        'reward_claimed' => 'boolean',
        'actions_taken' => 'array',
        'outcome_data' => 'array',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(GeniusProfile::class, 'student_id');
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(EventsCatalog::class, 'event_id');
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_completed', false)
            ->where('expires_at', '>=', now());
    }
}
