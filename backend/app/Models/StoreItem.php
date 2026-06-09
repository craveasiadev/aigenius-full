<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StoreItem extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'store_items';

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'name',
        'description',
        'details',
        'type',
        'category',
        'price_coins',
        'stock',
        'image_url',
        'partner',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'price_coins' => 'integer',
        'stock' => 'integer',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function redemptions(): HasMany
    {
        return $this->hasMany(Redemption::class, 'item_id');
    }
}

