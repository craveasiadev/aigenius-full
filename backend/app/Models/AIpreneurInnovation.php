<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AIpreneurInnovation extends Model
{
    use HasFactory, HasUuids;

    public const MAX_ACTIVE_TECH = 5;
    public const MAX_UPGRADE_LEVEL = 6;

    protected $table = 'aipreneur_innovations';

    protected $fillable = [
        'student_id',
        'tech_project',
        'design_image_url',
        'quiz_answers',
        'efficiency_boost',
        'cost_increase',
        'happiness_boost',
        'is_active',
        'upgrade_level',
        'lab_level',
        'unlocked_at',
    ];

    protected $casts = [
        'quiz_answers' => 'array',
        'efficiency_boost' => 'decimal:2',
        'cost_increase' => 'decimal:2',
        'happiness_boost' => 'decimal:2',
        'is_active' => 'boolean',
        'upgrade_level' => 'integer',
        'unlocked_at' => 'datetime',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(GeniusProfile::class, 'student_id');
    }

    /**
     * Get all available tech projects.
     */
    public static function getAvailableProjects(): array
    {
        return array_keys(self::getProjectCatalog());
    }

    /**
     * Get projects available for a specific rewards level.
     */
    public static function getAvailableProjectsForLevel(int $rewardsLevel): array
    {
        return array_values(array_filter(
            array_keys(self::getProjectCatalog()),
            fn(string $project) => self::getProjectCatalog()[$project]['unlock_level'] <= $rewardsLevel
        ));
    }

    /**
     * Get project metadata.
     */
    public static function getProjectCatalog(): array
    {
        return [
            'ai_kiosk' => [
                'name' => 'Robot Greeter',
                'unlock_level' => 1,
                'base_sales_boost' => 1.2,
                'base_popularity_boost' => 1.0,
                'base_mood_boost' => 0.6,
            ],
            'smart_qds' => [
                'name' => 'Fast Queue Screen',
                'unlock_level' => 1,
                'base_sales_boost' => 1.0,
                'base_popularity_boost' => 0.8,
                'base_mood_boost' => 0.8,
            ],
            'targeting_ai' => [
                'name' => 'Smart Targeting AI',
                'unlock_level' => 1,
                'base_sales_boost' => 1.8,
                'base_popularity_boost' => 1.4,
                'base_mood_boost' => 0.3,
            ],
            'robotic_cleaner' => [
                'name' => 'Robot Cleaner',
                'unlock_level' => 1,
                // User-requested baseline: level 1 gives +1% sales and +1% staff mood.
                'base_sales_boost' => 1.0,
                'base_popularity_boost' => 0.8,
                'base_mood_boost' => 1.0,
            ],
            'analytics_hub' => [
                'name' => 'Analytics Hub',
                'unlock_level' => 1,
                'base_sales_boost' => 1.4,
                'base_popularity_boost' => 1.2,
                'base_mood_boost' => 0.5,
            ],
            // Unlocks when player reaches level 10.
            'smart_inventory' => [
                'name' => 'Smart Inventory AI',
                'unlock_level' => 10,
                'base_sales_boost' => 1.8,
                'base_popularity_boost' => 1.1,
                'base_mood_boost' => 0.8,
            ],
            'drone_delivery' => [
                'name' => 'Drone Delivery',
                'unlock_level' => 10,
                'base_sales_boost' => 2.0,
                'base_popularity_boost' => 1.6,
                'base_mood_boost' => 0.4,
            ],
            'eco_energy_grid' => [
                'name' => 'Eco Energy Grid',
                'unlock_level' => 10,
                'base_sales_boost' => 1.1,
                'base_popularity_boost' => 1.7,
                'base_mood_boost' => 1.1,
            ],
        ];
    }

    /**
     * Resolve level-scaled effects (1..6).
     */
    public function getScaledEffects(): array
    {
        $catalog = self::getProjectCatalog();
        $config = $catalog[$this->tech_project] ?? null;
        $level = max(1, min(self::MAX_UPGRADE_LEVEL, (int) ($this->upgrade_level ?? 1)));
        $scale = 1 + (($level - 1) * 0.5); // level 6 ~= 3.5x baseline

        if (!$config) {
            return [
                'sales_boost' => round(1.0 * $scale, 2),
                'popularity_boost' => round(0.8 * $scale, 2),
                'mood_boost' => round(0.5 * $scale, 2),
            ];
        }

        return [
            'sales_boost' => round($config['base_sales_boost'] * $scale, 2),
            'popularity_boost' => round($config['base_popularity_boost'] * $scale, 2),
            'mood_boost' => round($config['base_mood_boost'] * $scale, 2),
        ];
    }
}
