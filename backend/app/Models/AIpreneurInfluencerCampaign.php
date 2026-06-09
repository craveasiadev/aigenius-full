<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AIpreneurInfluencerCampaign extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'aipreneur_influencer_campaigns';

    protected $fillable = [
        'student_id',
        'influencer_name',
        'influencer_avatar_url',
        'influencer_tier',
        'influencer_niche',
        'follower_count',
        'campaign_type',
        'cost_coins',
        'reach',
        'engagement',
        'new_visitors',
        'sales_generated',
        'started_at',
        'ended_at',
        'status',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
        'cost_coins' => 'integer',
        'reach' => 'integer',
        'engagement' => 'integer',
        'new_visitors' => 'integer',
        'sales_generated' => 'float',
    ];

    protected $appends = [
        'influencer_avatar',
        'cost',
        'conversions',
    ];

    public function getInfluencerAvatarAttribute(): ?string
    {
        return $this->influencer_avatar_url;
    }

    public function getCostAttribute(): int
    {
        return (int) ($this->cost_coins ?? 0);
    }

    public function getConversionsAttribute(): int
    {
        return (int) ($this->new_visitors ?? 0);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(GeniusProfile::class, 'student_id');
    }
}
