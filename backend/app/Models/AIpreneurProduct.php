<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AIpreneurProduct extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'aipreneur_products';

    protected $fillable = [
        'student_id',
        'product_name',
        'description',
        'price',
        'positioning_strategy',
        'image_url',
        'image_source',
        'image_status',
        'image_error',
        'image_prompt',
        'units_sold',
        'revenue_generated',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'revenue_generated' => 'decimal:2',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(GeniusProfile::class, 'student_id');
    }
}
