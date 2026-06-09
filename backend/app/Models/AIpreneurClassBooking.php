<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AIpreneurClassBooking extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'aipreneur_class_bookings';

    protected $fillable = [
        'slot_id',
        'student_id',
        'parent_id',
        'order_id',
        'customer_name',
        'customer_email',
        'amount',
        'payment_method',
        'payment_status',
        'status',
        'paid_at',
        'checked_in_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'paid_at' => 'datetime',
        'checked_in_at' => 'datetime',
    ];

    public function slot(): BelongsTo
    {
        return $this->belongsTo(AIpreneurClassSlot::class, 'slot_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(GeniusProfile::class, 'student_id');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'parent_id');
    }
}
