<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StorySession extends Model
{
    use HasFactory, HasUuids;

    protected $primaryKey = 'session_id';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'session_id',
        'genius_profile_id',
        'chapter_code',
        'chapter_title',
        'chapter_theme',
        'genius_name',
        'age',
        'gender',
        'persona_traits',
        'learning_goals',
        'interests',
        'previous_choices',
        'story_context',
        'titles',
        'pages',
    ];

    protected $casts = [
        'persona_traits' => 'array',
        'learning_goals' => 'array',
        'interests' => 'array',
        'previous_choices' => 'array',
        'titles' => 'array',
        'pages' => 'array',
    ];

    public function geniusProfile(): BelongsTo
    {
        return $this->belongsTo(GeniusProfile::class, 'genius_profile_id');
    }
}
