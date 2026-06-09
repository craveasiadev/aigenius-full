<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AIpreneurPricingRule extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'aipreneur_pricing_rules';

    protected $fillable = [
        'operation_key',
        'operation_name',
        'description',
        'token_cost',
        'metadata',
        'is_active',
        'sort_order',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'token_cost' => 'integer',
        'metadata' => 'array',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];
}
