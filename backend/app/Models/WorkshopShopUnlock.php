<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class WorkshopShopUnlock extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'workshop_shop_unlocks';

    protected $fillable = [
        'student_id',
        'workshop_shop_id',
        'scanned_by_user_id',
        'scanned_at',
    ];

    protected $casts = [
        'scanned_at' => 'datetime',
    ];

    public function shop(): BelongsTo
    {
        return $this->belongsTo(WorkshopShop::class, 'workshop_shop_id');
    }

    public function scannedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'scanned_by_user_id');
    }
}
