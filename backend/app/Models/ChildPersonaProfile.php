<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ChildPersonaProfile extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'child_persona_profile';

    protected $fillable = [
        'user_id',
        'strengths',
        'growth_areas',
        'learning_style',
        'fun_facts',
        'trait_scores',
    ];

    protected $casts = [
        'strengths' => 'array',
        'growth_areas' => 'array',
        'fun_facts' => 'array',
        'trait_scores' => 'array',
    ];

    public function geniusProfile()
    {
        return $this->belongsTo(GeniusProfile::class, 'user_id');
    }
}
