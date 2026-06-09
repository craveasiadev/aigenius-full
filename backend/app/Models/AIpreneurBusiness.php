<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AIpreneurBusiness extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'aipreneur_business';

    protected $fillable = [
        'student_id',
        'shop_theme',
        'shop_url_slug',
        'shop_image_url',
        'shop_scene_image_url',  // Shop with person and background scene
        'shop_image_status',
        'shop_image_error',
        'questionnaire_answers',
        'exterior_config',
        'interior_config',
        'age_group',
        'module_product_progress',
        'module_decorate_progress',
        'module_operation_progress',
        'module_marketing_progress',
        'module_innovation_progress',
        'module_csr_progress',
        'total_sales',
        'total_costs',
        'total_profit',
        'shop_launched',
        'launched_at',
        'charity_percentage',
        'selected_cause',
        'total_donated',
        'impact_points',
        'staff_overall_mood',
        'popularity_level',
        'store_visitors',
        'store_likes',
        'store_reviews_count',
        'store_rating',
        'current_quest',
        'streak_days',
        'last_activity_date',
        'last_csr_action_date',
        'last_finance_game_date',
        // Shop opening quest system
        'opening_checklist',
        'ribbon_cutting_completed',
        'ribbon_cutting_at',
        'traffic_multiplier',
        'traffic_boost_expires_at',
    ];

    protected $casts = [
        'questionnaire_answers' => 'array',
        'exterior_config' => 'array',
        'interior_config' => 'array',
        'shop_launched' => 'boolean',
        'launched_at' => 'datetime',
        'last_activity_date' => 'date',
        'total_sales' => 'decimal:2',
        'total_costs' => 'decimal:2',
        'total_profit' => 'decimal:2',
        'total_donated' => 'decimal:2',
        'store_rating' => 'decimal:1',
        'popularity_level' => 'decimal:2',
        // Shop opening quest system
        'opening_checklist' => 'array',
        'ribbon_cutting_completed' => 'boolean',
        'ribbon_cutting_at' => 'datetime',
        'traffic_boost_expires_at' => 'datetime',
        'last_csr_action_date' => 'date',
        'last_finance_game_date' => 'date',
    ];

    // Relationships
    public function student(): BelongsTo
    {
        return $this->belongsTo(GeniusProfile::class, 'student_id');
    }

    // Helper methods
    public function getOverallProgress(): int
    {
        return (int) round((
            $this->module_product_progress +
            $this->module_decorate_progress +
            $this->module_operation_progress +
            $this->module_marketing_progress +
            $this->module_innovation_progress +
            $this->module_csr_progress
        ) / 6);
    }

    public function updateModuleProgress(string $module, int $progress): void
    {
        $column = "module_{$module}_progress";
        if (array_key_exists($column, $this->attributes) || in_array($column, $this->fillable)) {
            $this->$column = min(100, max(0, $progress));
            $this->save();
        }
    }
}
