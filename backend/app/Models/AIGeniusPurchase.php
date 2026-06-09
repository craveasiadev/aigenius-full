<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AIGeniusPurchase extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'aigenius_purchases';

    protected $fillable = [
        'student_id',
        'order_id',
        'package_type',
        'package_name',
        'package_amount',
        'amount_paid',
        'payment_method',
        'status',
        'fiuu_transaction_id',
        'fiuu_status_code',
        'fiuu_response',
        'balance_before',
        'balance_after',
        'completed_at',
    ];

    protected $casts = [
        'amount_paid' => 'decimal:2',
        'fiuu_response' => 'array',
        'completed_at' => 'datetime',
    ];

    /**
     * Get the student (genius profile) that owns this purchase
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(GeniusProfile::class, 'student_id');
    }
}
