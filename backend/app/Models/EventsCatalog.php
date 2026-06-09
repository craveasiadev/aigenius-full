<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EventsCatalog extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'events_catalog';

    protected $fillable = [
        'event_code',
        'event_name',
        'description',
        'event_type',
        'start_date',
        'end_date',
        'is_recurring',
        'recurrence_pattern',
        'duration_days',
        'target_age_min',
        'target_age_max',
        'required_module',
        'impact_sales_multiplier',
        'impact_traffic_multiplier',
        'impact_mood_change',
        'impact_cost_multiplier',
        'reward_coins',
        'reward_badge',
        'reward_unlock',
        'image_url',
        'notification_text',
        'is_active',
        'priority',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'is_recurring' => 'boolean',
        'is_active' => 'boolean',
        'impact_sales_multiplier' => 'decimal:2',
        'impact_traffic_multiplier' => 'decimal:2',
        'impact_cost_multiplier' => 'decimal:2',
    ];

    public function activeEvents(): HasMany
    {
        return $this->hasMany(ActiveEvent::class, 'event_id');
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeCurrentlyRunning($query)
    {
        $today = now()->toDateString();
        return $query->where('start_date', '<=', $today)
                     ->where('end_date', '>=', $today);
    }
}
