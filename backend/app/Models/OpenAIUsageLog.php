<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class OpenAIUsageLog extends Model
{
    use HasUuids;

    protected $table = 'openai_usage_logs';

    protected $fillable = [
        'user_type',
        'user_id',
        'service',
        'model',
        'prompt_tokens',
        'completion_tokens',
        'total_tokens',
        'estimated_cost_usd',
        'purpose',
        'metadata',
    ];

    protected $casts = [
        'prompt_tokens' => 'integer',
        'completion_tokens' => 'integer',
        'total_tokens' => 'integer',
        'estimated_cost_usd' => 'decimal:6',
        'metadata' => 'array',
    ];
}