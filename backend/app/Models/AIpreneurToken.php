<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AIpreneurToken extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'aipreneur_tokens';

    protected $fillable = [
        'student_id',
        'tokens',
        'tokens_used',
        'tokens_earned',
    ];

    protected $casts = [
        'tokens' => 'integer',
        'tokens_used' => 'integer',
        'tokens_earned' => 'integer',
    ];

    // Token costs for various AI operations
    const COST_SHOP_IMAGE = 50;
    const COST_PRODUCT_IMAGE = 20;
    const COST_SIGNBOARD_REGEN = 10;
    const COST_MARKETING_MATERIAL = 15;

    // Starting amount
    const STARTING_TOKENS = 200;

    /**
     * Relationship to genius profile.
     */
    public function geniusProfile(): BelongsTo
    {
        return $this->belongsTo(GeniusProfile::class, 'student_id');
    }

    /**
     * Check if student has enough tokens for an operation.
     */
    public function hasTokens(int $amount): bool
    {
        return $this->tokens >= $amount;
    }

    /**
     * Spend tokens for an AI operation.
     * Returns false if insufficient tokens.
     */
    public function spendTokens(int $amount, string $description = ''): bool
    {
        if (!$this->hasTokens($amount)) {
            return false;
        }

        $this->tokens -= $amount;
        $this->tokens_used += $amount;
        $this->save();

        // Log the transaction
        AIpreneurTransaction::create([
            'student_id' => $this->student_id,
            'type' => 'expense',
            'category' => 'ai_generation',
            'description' => $description ?: 'AI generation',
            'amount' => 0,
            'tokens' => $amount,
            'coin_balance_after' => $this->geniusProfile->rewards?->coins ?? 0,
            'token_balance_after' => $this->tokens,
        ]);

        return true;
    }

    /**
     * Add bonus tokens (from quests, achievements, etc.)
     */
    public function addTokens(int $amount, string $description = '', string $category = 'quest_reward'): void
    {
        $this->tokens += $amount;
        $this->tokens_earned += $amount;
        $this->save();

        // Log the transaction
        AIpreneurTransaction::create([
            'student_id' => $this->student_id,
            'type' => 'income',
            'category' => $category,
            'description' => $description ?: 'Token reward',
            'amount' => 0,
            'tokens' => $amount,
            'coin_balance_after' => $this->geniusProfile->rewards?->coins ?? 0,
            'token_balance_after' => $this->tokens,
        ]);
    }

    /**
     * Get token balance summary.
     */
    public function getSummary(): array
    {
        return [
            'current' => $this->tokens,
            'used' => $this->tokens_used,
            'earned' => $this->tokens_earned,
            'total_received' => self::STARTING_TOKENS + $this->tokens_earned,
        ];
    }
}
