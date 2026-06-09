<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\QueryException;

class AIpreneurDailyStats extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'aipreneur_daily_stats';

    protected $fillable = [
        'student_id',
        'stat_date',
        'visitors',
        'customers',
        'total_sales_count',
        'total_units_sold',
        'total_revenue',
        'total_profit',
        'coins_earned',
        'base_traffic',
        'marketing_boost',
        'innovation_boost',
        'decoration_boost',
        'final_multiplier',
    ];

    protected $casts = [
        'stat_date' => 'date',
        'visitors' => 'integer',
        'customers' => 'integer',
        'total_sales_count' => 'integer',
        'total_units_sold' => 'integer',
        'total_revenue' => 'decimal:2',
        'total_profit' => 'decimal:2',
        'coins_earned' => 'integer',
        'base_traffic' => 'decimal:2',
        'marketing_boost' => 'decimal:2',
        'innovation_boost' => 'decimal:2',
        'decoration_boost' => 'decimal:2',
        'final_multiplier' => 'decimal:2',
    ];

    // Relationships
    public function student(): BelongsTo
    {
        return $this->belongsTo(GeniusProfile::class, 'student_id');
    }

    /**
     * Get or create today's stats record for a student.
     */
    public static function getOrCreateToday(string $studentId): self
    {
        $today = now()->toDateString();

        $existing = self::query()
            ->where('student_id', $studentId)
            ->whereDate('stat_date', $today)
            ->first();

        if ($existing) {
            return $existing;
        }

        try {
            return self::create([
                'student_id' => $studentId,
                'stat_date' => $today,
                'visitors' => 0,
                'customers' => 0,
                'total_sales_count' => 0,
                'total_units_sold' => 0,
                'total_revenue' => 0,
                'total_profit' => 0,
                'coins_earned' => 0,
                'base_traffic' => 1.0,
                'marketing_boost' => 0,
                'innovation_boost' => 0,
                'decoration_boost' => 0,
                'final_multiplier' => 1.0,
            ]);
        } catch (QueryException $e) {
            $isUniqueConstraint = (string) $e->getCode() === '23000'
                || str_contains(strtolower($e->getMessage()), 'unique');

            if ($isUniqueConstraint) {
                $raced = self::query()
                    ->where('student_id', $studentId)
                    ->whereDate('stat_date', $today)
                    ->first();

                if ($raced) {
                    return $raced;
                }
            }

            throw $e;
        }
    }

    /**
     * Record a visitor (someone who entered the shop).
     */
    public function recordVisitor(): void
    {
        $this->increment('visitors');
    }

    /**
     * Record a sale transaction.
     */
    public function recordSale(int $quantity, float $revenue, float $profit, int $coinsEarned): void
    {
        $this->increment('customers');
        $this->increment('total_sales_count');
        $this->increment('total_units_sold', $quantity);
        $this->increment('total_revenue', $revenue);
        $this->increment('total_profit', $profit);
        $this->increment('coins_earned', $coinsEarned);
    }

    /**
     * Update the traffic multipliers.
     */
    public function updateTrafficBoosts(float $marketing, float $innovation, float $decoration, float $finalMultiplier): void
    {
        $this->update([
            'marketing_boost' => $marketing,
            'innovation_boost' => $innovation,
            'decoration_boost' => $decoration,
            'final_multiplier' => $finalMultiplier,
        ]);
    }
}
