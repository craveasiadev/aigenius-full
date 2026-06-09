<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AIpreneurTransaction extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'aipreneur_transactions';

    protected $fillable = [
        'student_id',
        'type',
        'category',
        'description',
        'amount',
        'tokens',
        'coin_balance_after',
        'token_balance_after',
        'metadata',
    ];

    protected $casts = [
        'amount' => 'integer',
        'tokens' => 'integer',
        'coin_balance_after' => 'integer',
        'token_balance_after' => 'integer',
        'metadata' => 'array',
    ];

    // Transaction types
    const TYPE_INCOME = 'income';
    const TYPE_EXPENSE = 'expense';

    // Categories
    const CATEGORY_PRODUCT_SALE = 'product_sale';
    const CATEGORY_CAMPAIGN_REWARD = 'campaign_reward';
    const CATEGORY_QUEST_REWARD = 'quest_reward';
    const CATEGORY_DAILY_BONUS = 'daily_bonus';
    const CATEGORY_ACHIEVEMENT_BONUS = 'achievement_bonus';
    const CATEGORY_STARTING_BONUS = 'starting_bonus';
    const CATEGORY_STAFF_SALARY = 'staff_salary';
    const CATEGORY_DECORATION = 'decoration';
    const CATEGORY_MARKETING = 'marketing';
    const CATEGORY_INNOVATION = 'innovation';
    const CATEGORY_TOKEN_PURCHASE = 'token_purchase';
    const CATEGORY_AI_GENERATION = 'ai_generation';

    /**
     * Relationship to genius profile.
     */
    public function geniusProfile(): BelongsTo
    {
        return $this->belongsTo(GeniusProfile::class, 'student_id');
    }

    /**
     * Scope for income transactions.
     */
    public function scopeIncome($query)
    {
        return $query->where('type', self::TYPE_INCOME);
    }

    /**
     * Scope for expense transactions.
     */
    public function scopeExpenses($query)
    {
        return $query->where('type', self::TYPE_EXPENSE);
    }

    /**
     * Scope by category.
     */
    public function scopeOfCategory($query, string $category)
    {
        return $query->where('category', $category);
    }

    /**
     * Scope for token transactions.
     */
    public function scopeTokenTransactions($query)
    {
        return $query->whereNotNull('tokens')->where('tokens', '!=', 0);
    }

    /**
     * Scope for coin transactions.
     */
    public function scopeCoinTransactions($query)
    {
        return $query->where('amount', '!=', 0);
    }

    /**
     * Get formatted amount with sign.
     */
    public function getFormattedAmountAttribute(): string
    {
        $prefix = $this->type === self::TYPE_INCOME ? '+' : '-';
        return $prefix . number_format($this->amount);
    }

    /**
     * Get formatted tokens with sign.
     */
    public function getFormattedTokensAttribute(): ?string
    {
        if (!$this->tokens) {
            return null;
        }
        $prefix = $this->type === self::TYPE_INCOME ? '+' : '-';
        return $prefix . number_format($this->tokens);
    }

    /**
     * Record a coin income transaction.
     */
    public static function recordCoinIncome(
        string $studentId,
        int $amount,
        string $category,
        string $description,
        int $balanceAfter,
        ?array $metadata = null
    ): self {
        return self::create([
            'student_id' => $studentId,
            'type' => self::TYPE_INCOME,
            'category' => $category,
            'description' => $description,
            'amount' => $amount,
            'coin_balance_after' => $balanceAfter,
            'metadata' => $metadata,
        ]);
    }

    /**
     * Record a coin expense transaction.
     */
    public static function recordCoinExpense(
        string $studentId,
        int $amount,
        string $category,
        string $description,
        int $balanceAfter,
        ?array $metadata = null
    ): self {
        return self::create([
            'student_id' => $studentId,
            'type' => self::TYPE_EXPENSE,
            'category' => $category,
            'description' => $description,
            'amount' => $amount,
            'coin_balance_after' => $balanceAfter,
            'metadata' => $metadata,
        ]);
    }
}
