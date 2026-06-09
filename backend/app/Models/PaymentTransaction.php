<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class PaymentTransaction extends Model
{
    use HasUuids;

    protected $fillable = [
        'customer_id',
        'product_id',
        'order_id',
        'amount',
        'currency',
        'payment_method',
        'payment_channel',
        'status',
        'fiuu_transaction_id',
        'fiuu_status_code',
        'fiuu_response',
        'completed_at',
        'shop_order_id',           // ✅ Added for shop orders
        'wallet_transaction_id',   // ✅ Added for wallet topups
        'user_id',                 // ✅ Added for user tracking
        'metadata',                // ✅ Added for additional data
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'fiuu_response' => 'array',
        'metadata' => 'array',     // ✅ Added to cast metadata as JSON
        'completed_at' => 'datetime',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function isCompleted()
    {
        return $this->status === 'completed';
    }

    public function isPending()
    {
        return $this->status === 'pending';
    }

    public function isFailed()
    {
        return $this->status === 'failed';
    }
}