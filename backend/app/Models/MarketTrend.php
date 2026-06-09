<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MarketTrend extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'market_trends';

    protected $fillable = [
        'trend_code',
        'trend_name',
        'description',
        'start_date',
        'end_date',
        'peak_date',
        'affected_categories',
        'popularity_multiplier',
        'price_tolerance_change',
        'target_age_groups',
        'geographic_regions',
        'is_active',
        'auto_generated',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'peak_date' => 'date',
        'affected_categories' => 'array',
        'target_age_groups' => 'array',
        'geographic_regions' => 'array',
        'is_active' => 'boolean',
        'auto_generated' => 'boolean',
        'popularity_multiplier' => 'decimal:2',
        'price_tolerance_change' => 'decimal:2',
    ];

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
