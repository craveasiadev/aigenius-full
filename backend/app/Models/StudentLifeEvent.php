<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentLifeEvent extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'student_life_events';

    protected $fillable = [
        'student_id',
        'event_id',
        'triggered_at',
        'expires_at',
        'status',
        'choice_selected',
        'resolved_at',
        'outcome_applied',
        'coins_change',
        'mood_change',
        'reflection_text',
        'viewed',
    ];

    protected $casts = [
        'triggered_at' => 'datetime',
        'expires_at' => 'datetime',
        'resolved_at' => 'datetime',
        'outcome_applied' => 'array',
        'viewed' => 'boolean',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(GeniusProfile::class, 'student_id');
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(LifeEventsCatalog::class, 'event_id');
    }

    // Scopes
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeResolved($query)
    {
        return $query->where('status', 'resolved');
    }

    // Methods
    public function resolve(string $choiceId): ?array
    {
        $choices = $this->event->choices ?? [];
        $selectedChoice = collect($choices)->firstWhere('id', $choiceId);

        if (!$selectedChoice) {
            return null;
        }

        $outcome = $selectedChoice['outcome'] ?? [];

        $this->update([
            'status' => 'resolved',
            'choice_selected' => $choiceId,
            'resolved_at' => now(),
            'outcome_applied' => $outcome,
            'coins_change' => $outcome['coins'] ?? 0,
            'mood_change' => $outcome['mood'] ?? 0,
        ]);

        return $outcome;
    }
}
