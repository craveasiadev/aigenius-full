<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class WPayTransaction extends Model
{
    use HasUuids;

    protected $table = 'wpay_transactions';

    protected $fillable = [
        'wpay_user_id',
        'email',
        'app_source',
        'order_id',
        'payment_category',
        'payment_type',
        'amount',
        'wbalance_used',
        'bonus_used',
        'online_paid',
        'status',
        'topup_amount',
        'bonus_awarded',
        'stars_awarded',
        'fiuu_transaction_id',
        'fiuu_status_code',
        'fiuu_response',
        'metadata',
        'completed_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'wbalance_used' => 'decimal:2',
        'bonus_used' => 'decimal:2',
        'online_paid' => 'decimal:2',
        'topup_amount' => 'decimal:2',
        'bonus_awarded' => 'decimal:2',
        'stars_awarded' => 'integer',
        'fiuu_response' => 'array',
        'metadata' => 'array',
        'completed_at' => 'datetime',
    ];

    /**
     * User relationship
     */
    public function wpayUser()
    {
        return $this->belongsTo(WPayUser::class, 'wpay_user_id');
    }

    /**
     * Check if transaction is completed
     */
    public function isCompleted(): bool
    {
        return $this->status === 'success';
    }

    /**
     * Check if transaction is pending
     */
    public function isPending(): bool
    {
        return in_array($this->status, ['pending', 'processing']);
    }

    /**
     * Check if transaction failed
     */
    public function isFailed(): bool
    {
        return in_array($this->status, ['failed', 'cancelled']);
    }

    /**
     * Mark as success
     */
    public function markAsSuccess(): void
    {
        $this->status = 'success';
        $this->completed_at = now();
        $this->save();
    }

    /**
     * Mark as failed
     */
    public function markAsFailed(): void
    {
        $this->status = 'failed';
        $this->save();
    }
}
