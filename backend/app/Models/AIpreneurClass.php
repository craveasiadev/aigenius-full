<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AIpreneurClass extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'aipreneur_classes';

    protected $fillable = [
        'title',
        'category',
        'description',
        'level',
        'price',
        'duration_minutes',
        'cover_image_url',
        'is_active',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'duration_minutes' => 'integer',
        'is_active' => 'boolean',
    ];

    public function slots(): HasMany
    {
        return $this->hasMany(AIpreneurClassSlot::class, 'class_id');
    }
}
