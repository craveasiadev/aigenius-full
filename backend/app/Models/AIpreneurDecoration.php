<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AIpreneurDecoration extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'aipreneur_decorations';

    protected $fillable = [
        'student_id',
        'mood_theme',
        'decoration_focus',
        'happiness_boost',
        'price_willingness_multiplier',
        'uniqueness_score',
        'cost',
        'applied_at',
    ];

    protected $casts = [
        'happiness_boost' => 'decimal:2',
        'price_willingness_multiplier' => 'decimal:2',
        'cost' => 'decimal:2',
        'applied_at' => 'datetime',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(GeniusProfile::class, 'student_id');
    }
}
