<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AIpreneurMarketingAsset extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'aipreneur_marketing_assets';

    protected $fillable = [
        'student_id',
        'asset_type',
        'asset_name',
        'asset_url',
        'asset_config',
        'placement',
        'is_active',
        'impressions',
        'clicks',
        'expires_at',
    ];

    protected $casts = [
        'asset_config' => 'array',
        'is_active' => 'boolean',
        'expires_at' => 'datetime',
    ];

    protected $appends = [
        'active',
    ];

    public function getActiveAttribute(): bool
    {
        return (bool) $this->is_active;
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(GeniusProfile::class, 'student_id');
    }
}
