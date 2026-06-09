<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Pivot: which workshop_shops a staff_event user can scan into.
 * An empty pivot for a user means "any active shop" — handy for
 * superadmins testing on-site.
 */
class WorkshopShopStaff extends Model
{
    use HasUuids;

    protected $table = 'workshop_shop_staff';

    protected $fillable = [
        'user_id',
        'workshop_shop_id',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function shop(): BelongsTo
    {
        return $this->belongsTo(WorkshopShop::class, 'workshop_shop_id');
    }
}
