<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AIpreneurCampaign extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'aipreneur_campaigns';

    protected $fillable = [
        'student_id',
        'campaign_name',
        'marketing_goal',
        'color_style',
        'channels',
        'budget_coins',
        'reach',
        'likes',
        'new_visitors',
        'profit_generated',
        'roi',
        'launched_at',
    ];

    protected $casts = [
        'channels' => 'array',
        'profit_generated' => 'decimal:2',
        'roi' => 'decimal:2',
        'launched_at' => 'datetime',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(GeniusProfile::class, 'student_id');
    }
}
