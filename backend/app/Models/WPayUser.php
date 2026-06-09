<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class WPayUser extends Model
{
    use HasUuids;

    protected $table = 'wpay_users';

    protected $fillable = [
        'email',
        'app_source',
        'lifetime_topups',
        'wbalance',
        'bonus',
        'stars',
        'tier_type',
        'tier_factor',
    ];

    protected $casts = [
        'lifetime_topups' => 'decimal:2',
        'wbalance' => 'decimal:2',
        'bonus' => 'decimal:2',
        'stars' => 'integer',
        'tier_factor' => 'decimal:2',
    ];

    /**
     * Tier thresholds based on lifetime topups
     */
    const TIER_THRESHOLDS = [
        'bronze' => 0,
        'silver' => 300,
        'gold' => 1000,
        'platinum' => 2500,
        'vip' => 5000,
    ];

    /**
     * Tier factors for star earning multiplier
     */
    const TIER_FACTORS = [
        'bronze' => 1.0,
        'silver' => 1.2,
        'gold' => 1.5,
        'platinum' => 2.0,
        'vip' => 3.0,
    ];

    /**
     * Bonus percentages for topups based on tier
     */
    const TOPUP_BONUS_PERCENTAGES = [
        'bronze' => 0.00,    // No bonus
        'silver' => 0.05,    // 5% bonus
        'gold' => 0.10,      // 10% bonus
        'platinum' => 0.15,  // 15% bonus
        'vip' => 0.20,       // 20% bonus
    ];

    /**
     * Calculate and update tier based on lifetime topups
     */
    public function recalculateTier(): void
    {
        $amount = (float) $this->lifetime_topups;

        if ($amount >= self::TIER_THRESHOLDS['vip']) {
            $this->tier_type = 'vip';
        } elseif ($amount >= self::TIER_THRESHOLDS['platinum']) {
            $this->tier_type = 'platinum';
        } elseif ($amount >= self::TIER_THRESHOLDS['gold']) {
            $this->tier_type = 'gold';
        } elseif ($amount >= self::TIER_THRESHOLDS['silver']) {
            $this->tier_type = 'silver';
        } else {
            $this->tier_type = 'bronze';
        }

        $this->tier_factor = self::TIER_FACTORS[$this->tier_type];
        $this->save();
    }

    /**
     * Get the bonus percentage for this user's tier
     */
    public function getBonusPercentage(): float
    {
        return self::TOPUP_BONUS_PERCENTAGES[$this->tier_type] ?? 0.00;
    }

    /**
     * Calculate stars to award for a given amount
     * Base rate: 1 star per RM1, multiplied by tier factor
     * Bronze (1x): RM14 = 14 stars
     * Silver (1.5x): RM14 = 21 stars
     * Gold (2x): RM14 = 28 stars
     */
    public function calculateStarsForAmount(float $amount): int
    {
        return (int) floor($amount * $this->tier_factor);
    }

    /**
     * Add to wbalance
     */
    public function addWBalance(float $amount): void
    {
        $this->wbalance = (float) $this->wbalance + $amount;
        $this->save();
    }

    /**
     * Deduct from wbalance
     */
    public function deductWBalance(float $amount): bool
    {
        if ((float) $this->wbalance < $amount) {
            return false;
        }
        $this->wbalance = (float) $this->wbalance - $amount;
        $this->save();
        return true;
    }

    /**
     * Add bonus
     */
    public function addBonus(float $amount): void
    {
        $this->bonus = (float) $this->bonus + $amount;
        $this->save();
    }

    /**
     * Deduct from bonus
     */
    public function deductBonus(float $amount): bool
    {
        if ((float) $this->bonus < $amount) {
            return false;
        }
        $this->bonus = (float) $this->bonus - $amount;
        $this->save();
        return true;
    }

    /**
     * Add stars
     */
    public function addStars(int $amount): void
    {
        $this->stars = (int) $this->stars + $amount;
        $this->save();
    }

    /**
     * Add to lifetime topups and recalculate tier
     */
    public function addLifetimeTopup(float $amount): void
    {
        $this->lifetime_topups = (float) $this->lifetime_topups + $amount;
        $this->save();
        $this->recalculateTier();
    }

    /**
     * Get user profile data
     */
    public function getProfile(): array
    {
        return [
            'email' => $this->email,
            'app_source' => $this->app_source,
            'lifetime_topups' => (float) $this->lifetime_topups,
            'wbalance' => (float) $this->wbalance,
            'bonus' => (float) $this->bonus,
            'stars' => (int) $this->stars,
            'tier_type' => $this->tier_type,
            'tier_factor' => (float) $this->tier_factor,
        ];
    }

    /**
     * Transactions relationship
     */
    public function transactions()
    {
        return $this->hasMany(WPayTransaction::class, 'wpay_user_id');
    }
}
