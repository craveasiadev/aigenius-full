<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SeasonalContent extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'seasonal_content';

    protected $fillable = [
        'content_code',
        'content_name',
        'content_type',
        'season',
        'available_start',
        'available_end',
        'is_recurring_yearly',
        'content_data',
        'unlock_cost',
        'image_url',
        'icon',
        'theme_color',
        'required_level',
        'required_module',
        'is_active',
        'featured',
    ];

    protected $casts = [
        'available_start' => 'date',
        'available_end' => 'date',
        'is_recurring_yearly' => 'boolean',
        'content_data' => 'array',
        'is_active' => 'boolean',
        'featured' => 'boolean',
    ];

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeCurrentlyAvailable($query)
    {
        $today = now()->toDateString();
        return $query->where('available_start', '<=', $today)
            ->where('available_end', '>=', $today);
    }

    public function scopeFeatured($query)
    {
        return $query->where('featured', true);
    }

    public function scopeByType($query, string $type)
    {
        return $query->where('content_type', $type);
    }

    public function scopeBySeason($query, string $season)
    {
        return $query->where('season', $season);
    }
}
