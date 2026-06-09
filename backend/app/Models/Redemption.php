<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Redemption extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'redemptions';

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'student_id',
        'item_id',
        'code',
        'status',
        'tokens_spent',
        'item_name_snapshot',
        'item_price_snapshot',
    ];

    protected $casts = [
        'tokens_spent' => 'integer',
        'item_price_snapshot' => 'integer',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(GeniusProfile::class, 'student_id');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(StoreItem::class, 'item_id');
    }
}

