<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AIpreneurPricingPackage extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'aipreneur_pricing_packages';

    protected $fillable = [
        'code',
        'name',
        'description',
        'package_type',
        'tokens_amount',
        'bonus_tokens',
        'price_rm',
        'original_price_rm',
        'badge',
        'is_active',
        'sort_order',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'tokens_amount' => 'integer',
        'bonus_tokens' => 'integer',
        'price_rm' => 'decimal:2',
        'original_price_rm' => 'decimal:2',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];
}
