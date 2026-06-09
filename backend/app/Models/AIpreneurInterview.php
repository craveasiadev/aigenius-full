<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AIpreneurInterview extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'aipreneur_interviews';

    protected $fillable = [
        'student_id',
        'npc_name',
        'npc_avatar_url',
        'npc_personality',
        'questions_asked',
        'responses',
        'decision',
        'hired_role',
    ];

    protected $casts = [
        'npc_personality' => 'array',
        'questions_asked' => 'array',
        'responses' => 'array',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(GeniusProfile::class, 'student_id');
    }
}
