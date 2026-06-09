<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LifeEventsCatalog extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'life_events_catalog';

    protected $fillable = [
        'event_code',
        'event_name',
        'event_category',
        'description',
        'scenario_text',
        'character_name',
        'character_role',
        'trigger_probability',
        'cooldown_days',
        'choices',
        'requires_staff',
        'requires_module',
        'min_business_age_days',
        'is_active',
        'educational_value',
    ];

    protected $casts = [
        'choices' => 'array',
        'requires_staff' => 'boolean',
        'is_active' => 'boolean',
        'trigger_probability' => 'decimal:2',
    ];

    public function studentLifeEvents(): HasMany
    {
        return $this->hasMany(StudentLifeEvent::class, 'event_id');
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeByCategory($query, string $category)
    {
        return $query->where('event_category', $category);
    }
}
