<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AIpreneurStaff extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'aipreneur_staff';

    protected $fillable = [
        'student_id',
        'staff_role',
        'staff_name',
        'avatar_url',
        'uniform_image_url',
        'uniform_source',
        'mood',
        'energy',
        'salary',
        'skills',
        'hobbies',
        'personality',
        'interview_id',
        'was_interviewed',
        'last_event',
        'last_event_date',
        // Behavior traits from interviews
        'behavior_traits',
        'speed_modifier',
        'efficiency_modifier',
    ];

    protected $casts = [
        'skills' => 'array',
        'hobbies' => 'array',
        'salary' => 'decimal:2',
        'was_interviewed' => 'boolean',
        'last_event_date' => 'datetime',
        // Behavior traits
        'behavior_traits' => 'array',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(GeniusProfile::class, 'student_id');
    }

    public function interview(): BelongsTo
    {
        return $this->belongsTo(AIpreneurInterview::class, 'interview_id');
    }
}
