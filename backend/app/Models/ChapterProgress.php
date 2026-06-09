<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChapterProgress extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'chapter_progress';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'student_id',
        'chapter_code',
        'current_step',
        'total_steps',
        'progress_percentage',
        'status',
        'started_at',
        'completed_at',
        'last_activity_at',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'last_activity_at' => 'datetime',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(GeniusProfile::class, 'student_id');
    }
}
