<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AIpreneurPopularityRange extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'aipreneur_popularity_ranges';

    protected $fillable = [
        'min_popularity',
        'max_popularity',
        'daily_visitors',
        'is_active',
        'sort_order',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'min_popularity' => 'integer',
        'max_popularity' => 'integer',
        'daily_visitors' => 'integer',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];
}
