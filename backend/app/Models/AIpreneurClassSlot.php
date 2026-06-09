<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AIpreneurClassSlot extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'aipreneur_class_slots';

    protected $fillable = [
        'class_id',
        'start_time',
        'end_time',
        'capacity',
        'booked_count',
        'location',
        'status',
    ];

    protected $casts = [
        'start_time' => 'datetime',
        'end_time' => 'datetime',
        'capacity' => 'integer',
        'booked_count' => 'integer',
    ];

    public function course(): BelongsTo
    {
        return $this->belongsTo(AIpreneurClass::class, 'class_id');
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(AIpreneurClassBooking::class, 'slot_id');
    }
}
