<?php

namespace App\Services;

use App\Models\AIpreneurPricingPackage;
use App\Models\AIpreneurPricingRule;
use App\Models\AIpreneurPopularityRange;
use App\Models\SystemConfig;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;

class AIpreneurPricingService
{
    public const DEFAULT_TOKEN_COSTS = [
        'product_image' => 35,
        'product_regenerate' => 45,
        'interior_item' => 35,
        'marketing_asset' => 35,
        'marketing_content' => 5,
        'shop_exterior' => 70,
        'ai_chat' => 10,
    ];

    public const DEFAULT_INFLUENCER_TIER_COSTS = [
        'nano' => 120,
        'micro' => 500,
        'macro' => 2000,
        'mega' => 10000,
    ];

    public const DEFAULT_INFLUENCER_BOOST_PERCENT_RANGES = [
        'nano' => ['min' => 2, 'max' => 4],
        'micro' => ['min' => 5, 'max' => 8],
        'macro' => ['min' => 10, 'max' => 15],
        'mega' => ['min' => 18, 'max' => 25],
    ];

    public const DEFAULT_INFLUENCER_DURATION_MULTIPLIERS_PERCENT = [
        '1h' => 10,
        '6h' => 30,
        '12h' => 50,
        '24h' => 100,
        '72h' => 250,
        '168h' => 500,
    ];

    public const DEFAULT_INNOVATION_UNLOCK_COSTS = [
        'ai_kiosk' => 500,
        'smart_qds' => 300,
        'targeting_ai' => 800,
        'robotic_cleaner' => 450,
        'analytics_hub' => 1500,
        'smart_inventory' => 1800,
        'drone_delivery' => 2200,
        'eco_energy_grid' => 2000,
    ];

    public const DEFAULT_STAFF_HIRE_COST = 20;
    public const DEFAULT_INNOVATION_UPGRADE_STEP_COST = 80;
    public const DEFAULT_DECORATE_TOKEN_DIVISOR = 20;
    public const DEFAULT_DECORATE_FREE_EXTERIOR_CHANGES = 3;

    public const DEFAULT_ECONOMY_RULES = [
        'economy_profit_per_visitor_min' => 2,
        'economy_profit_per_visitor_max' => 8,
        'economy_visitor_purchase_chance_percent' => 50,
        'economy_passive_visitor_interval_seconds' => 240,
        'economy_popularity_bracket_size' => 5,
        'economy_daily_visitors_base' => 3,
        'economy_daily_visitors_increment_per_bracket' => 1,
        'economy_daily_visitors_cap' => 55,
        'economy_traffic_multiplier_min_percent' => 75,
        'economy_traffic_multiplier_max_percent' => 160,
        'economy_product_bonus_every_n' => 4,
        'economy_product_bonus_cap' => 4,
        'economy_staff_bonus_every_n' => 2,
        'economy_staff_bonus_cap' => 3,
        'economy_innovation_bonus_every_n' => 1,
        'economy_innovation_bonus_cap' => 3,
        'economy_conversion_profit_per_token' => 25,
        'economy_conversion_min_profit' => 25,
        'economy_target_profit_percent' => 60,
        'economy_action_base_cost' => 50,
        'influencer_duration_default_hours' => 168,
        'influencer_marketing_boost_cap_percent' => 75,
        'influencer_popularity_boost_nano_min_percent' => 2,
        'influencer_popularity_boost_nano_max_percent' => 4,
        'influencer_popularity_boost_micro_min_percent' => 5,
        'influencer_popularity_boost_micro_max_percent' => 8,
        'influencer_popularity_boost_macro_min_percent' => 10,
        'influencer_popularity_boost_macro_max_percent' => 15,
        'influencer_popularity_boost_mega_min_percent' => 18,
        'influencer_popularity_boost_mega_max_percent' => 25,
        'influencer_duration_multiplier_1h_percent' => 10,
        'influencer_duration_multiplier_6h_percent' => 30,
        'influencer_duration_multiplier_12h_percent' => 50,
        'influencer_duration_multiplier_24h_percent' => 100,
        'influencer_duration_multiplier_72h_percent' => 250,
        'influencer_duration_multiplier_168h_percent' => 500,
    ];

    public const FREE_ACCESS_FEATURES = [
        'all' => [
            'config_key' => 'aipreneur_free_access_all',
            'label' => 'Unlock all AI features',
            'description' => 'Make every AI-token-gated Artventure feature free without changing the saved token pricing rules.',
        ],
        'product_image' => [
            'config_key' => 'aipreneur_free_access_product_image',
            'label' => 'Product image generation',
            'description' => 'Allow AI product image generation for free.',
        ],
        'product_regenerate' => [
            'config_key' => 'aipreneur_free_access_product_regenerate',
            'label' => 'Product remix / regenerate',
            'description' => 'Allow product remix and regeneration for free.',
        ],
        'interior_item' => [
            'config_key' => 'aipreneur_free_access_interior_item',
            'label' => 'Interior AI decor assets',
            'description' => 'Allow AI-generated interior decoration assets for free.',
        ],
        'marketing_asset' => [
            'config_key' => 'aipreneur_free_access_marketing_asset',
            'label' => 'Marketing posters and assets',
            'description' => 'Allow AI posters, banners, flyers, and other marketing assets for free.',
        ],
        'marketing_content' => [
            'config_key' => 'aipreneur_free_access_marketing_content',
            'label' => 'Marketing content ideas',
            'description' => 'Allow marketing script and content idea generation for free.',
        ],
        'shop_exterior' => [
            'config_key' => 'aipreneur_free_access_shop_exterior',
            'label' => 'Shop exterior regenerate',
            'description' => 'Allow shop exterior regeneration for free.',
        ],
        'ai_chat' => [
            'config_key' => 'aipreneur_free_access_ai_chat',
            'label' => 'AI chat tools',
            'description' => 'Allow AI helper/chat actions for free.',
        ],
        'exterior_decorations' => [
            'config_key' => 'aipreneur_free_access_exterior_decorations',
            'label' => 'Exterior decorations unlocks',
            'description' => 'Unlock paid exterior decoration items for free.',
        ],
        'staff_hire' => [
            'config_key' => 'aipreneur_free_access_staff_hire',
            'label' => 'Staff hiring',
            'description' => 'Allow staff hiring flows that spend AI tokens to be free.',
        ],
        'influencer_campaigns' => [
            'config_key' => 'aipreneur_free_access_influencer_campaigns',
            'label' => 'Influencer campaigns',
            'description' => 'Allow influencer campaigns for free while keeping their gameplay effect.',
        ],
        'innovation_unlocks' => [
            'config_key' => 'aipreneur_free_access_innovation_unlocks',
            'label' => 'Innovation unlocks',
            'description' => 'Allow innovation project unlocks for free.',
        ],
        'innovation_upgrades' => [
            'config_key' => 'aipreneur_free_access_innovation_upgrades',
            'label' => 'Innovation upgrades',
            'description' => 'Allow innovation upgrades for free.',
        ],
    ];

    /**
     * @var array<string, int>|null
     */
    private ?array $activeRuleCostMap = null;

    /**
     * @var Collection<int, AIpreneurPopularityRange>|null
     */
    private ?Collection $activePopularityRanges = null;

    /**
     * @var array<string, bool>|null
     */
    private ?array $featureAccessConfigMap = null;

    /**
     * @return Collection<int, AIpreneurPricingPackage>
     */
    public function getActivePackages(): Collection
    {
        return AIpreneurPricingPackage::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();
    }

    public function getPackageByCode(string $code): ?AIpreneurPricingPackage
    {
        return AIpreneurPricingPackage::query()
            ->where('code', $code)
            ->where('is_active', true)
            ->first();
    }

    /**
     * @return Collection<int, AIpreneurPricingRule>
     */
    public function getActiveRules(): Collection
    {
        return AIpreneurPricingRule::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('operation_name')
            ->get();
    }

    /**
     * @return Collection<int, AIpreneurPopularityRange>
     */
    public function getActivePopularityRanges(): Collection
    {
        if ($this->activePopularityRanges instanceof Collection) {
            return $this->activePopularityRanges;
        }

        $this->activePopularityRanges = AIpreneurPopularityRange::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('min_popularity')
            ->get();

        return $this->activePopularityRanges;
    }

    public function getTokenCost(string $operationKey, int $fallback): int
    {
        if ($this->isFeatureFree($operationKey)) {
            return 0;
        }

        return $this->getRuleValue($operationKey, $fallback);
    }

    public function getStaffHireCost(): int
    {
        if ($this->isFeatureFree('staff_hire')) {
            return 0;
        }

        return $this->getRuleValue('staff_hire', self::DEFAULT_STAFF_HIRE_COST);
    }

    public function getInfluencerTierCost(string $tier): int
    {
        if ($this->isFeatureFree('influencer_campaigns')) {
            return 0;
        }

        return $this->getInfluencerTierBaseCost($tier);
    }

    public function getInfluencerTierBaseCost(string $tier): int
    {
        $fallback = self::DEFAULT_INFLUENCER_TIER_COSTS[$tier] ?? 0;
        return $this->getRuleValue('influencer_' . $tier, $fallback);
    }

    /**
     * @return array{min:int,max:int}
     */
    public function getInfluencerBoostPercentRange(string $tier): array
    {
        $fallback = self::DEFAULT_INFLUENCER_BOOST_PERCENT_RANGES[$tier] ?? ['min' => 0, 'max' => 0];
        $min = max(
            0,
            $this->getRuleValue(
                "influencer_popularity_boost_{$tier}_min_percent",
                (int) $fallback['min']
            )
        );
        $max = max(
            $min,
            $this->getRuleValue(
                "influencer_popularity_boost_{$tier}_max_percent",
                (int) $fallback['max']
            )
        );

        return [
            'min' => $min,
            'max' => $max,
        ];
    }

    public function getAverageInfluencerBoostPercent(string $tier): float
    {
        $range = $this->getInfluencerBoostPercentRange($tier);
        return ((float) $range['min'] + (float) $range['max']) / 2;
    }

    public function getInfluencerDurationDefaultHours(): int
    {
        return max(1, $this->getRuleValue(
            'influencer_duration_default_hours',
            self::DEFAULT_ECONOMY_RULES['influencer_duration_default_hours']
        ));
    }

    public function getInfluencerDurationMultiplier(int $durationHours): float
    {
        $p1 = $this->getRuleValue('influencer_duration_multiplier_1h_percent', self::DEFAULT_INFLUENCER_DURATION_MULTIPLIERS_PERCENT['1h']);
        $p6 = $this->getRuleValue('influencer_duration_multiplier_6h_percent', self::DEFAULT_INFLUENCER_DURATION_MULTIPLIERS_PERCENT['6h']);
        $p12 = $this->getRuleValue('influencer_duration_multiplier_12h_percent', self::DEFAULT_INFLUENCER_DURATION_MULTIPLIERS_PERCENT['12h']);
        $p24 = $this->getRuleValue('influencer_duration_multiplier_24h_percent', self::DEFAULT_INFLUENCER_DURATION_MULTIPLIERS_PERCENT['24h']);
        $p72 = $this->getRuleValue('influencer_duration_multiplier_72h_percent', self::DEFAULT_INFLUENCER_DURATION_MULTIPLIERS_PERCENT['72h']);
        $p168 = $this->getRuleValue('influencer_duration_multiplier_168h_percent', self::DEFAULT_INFLUENCER_DURATION_MULTIPLIERS_PERCENT['168h']);

        $percent = match (true) {
            $durationHours <= 1 => $p1,
            $durationHours <= 6 => $p6,
            $durationHours <= 12 => $p12,
            $durationHours <= 24 => $p24,
            $durationHours <= 72 => $p72,
            default => $p168,
        };

        return max(0.01, ((float) $percent) / 100);
    }

    public function getInfluencerMarketingBoostCapPercent(): int
    {
        return max(0, $this->getRuleValue(
            'influencer_marketing_boost_cap_percent',
            self::DEFAULT_ECONOMY_RULES['influencer_marketing_boost_cap_percent']
        ));
    }

    public function getInnovationUnlockCost(string $projectId): int
    {
        if ($this->isFeatureFree('innovation_unlocks')) {
            return 0;
        }

        $fallback = self::DEFAULT_INNOVATION_UNLOCK_COSTS[$projectId] ?? 0;
        return $this->getRuleValue('innovation_unlock_' . $projectId, $fallback);
    }

    public function getInnovationUpgradeStepCost(): int
    {
        if ($this->isFeatureFree('innovation_upgrades')) {
            return 0;
        }

        return $this->getRuleValue('innovation_upgrade_step', self::DEFAULT_INNOVATION_UPGRADE_STEP_COST);
    }

    public function getDecorateTokenDivisor(): int
    {
        return max(1, $this->getRuleValue('decorate_token_divisor', self::DEFAULT_DECORATE_TOKEN_DIVISOR));
    }

    public function getDecorateFreeExteriorChangesTotal(): int
    {
        return max(0, $this->getRuleValue(
            'decorate_free_exterior_changes_total',
            self::DEFAULT_DECORATE_FREE_EXTERIOR_CHANGES
        ));
    }

    public function getProfitPerVisitorMin(): int
    {
        return max(0, $this->getRuleValue(
            'economy_profit_per_visitor_min',
            self::DEFAULT_ECONOMY_RULES['economy_profit_per_visitor_min']
        ));
    }

    public function getProfitPerVisitorMax(): int
    {
        $min = $this->getProfitPerVisitorMin();
        return max(
            $min,
            $this->getRuleValue(
                'economy_profit_per_visitor_max',
                self::DEFAULT_ECONOMY_RULES['economy_profit_per_visitor_max']
            )
        );
    }

    /**
     * @return array{min:int,max:int}
     */
    public function getProfitPerVisitorRange(): array
    {
        return [
            'min' => $this->getProfitPerVisitorMin(),
            'max' => $this->getProfitPerVisitorMax(),
        ];
    }

    public function getVisitorPurchaseChancePercent(): int
    {
        return min(
            100,
            max(
                1,
                $this->getRuleValue(
                    'economy_visitor_purchase_chance_percent',
                    self::DEFAULT_ECONOMY_RULES['economy_visitor_purchase_chance_percent']
                )
            )
        );
    }

    public function getPassiveVisitorIntervalSeconds(): int
    {
        return max(
            15,
            $this->getRuleValue(
                'economy_passive_visitor_interval_seconds',
                self::DEFAULT_ECONOMY_RULES['economy_passive_visitor_interval_seconds']
            )
        );
    }

    public function getPopularityBracketSize(): int
    {
        return max(
            1,
            $this->getRuleValue(
                'economy_popularity_bracket_size',
                self::DEFAULT_ECONOMY_RULES['economy_popularity_bracket_size']
            )
        );
    }

    public function getDailyVisitorsBase(): int
    {
        return max(
            1,
            $this->getRuleValue(
                'economy_daily_visitors_base',
                self::DEFAULT_ECONOMY_RULES['economy_daily_visitors_base']
            )
        );
    }

    public function getDailyVisitorsIncrementPerBracket(): int
    {
        return max(
            0,
            $this->getRuleValue(
                'economy_daily_visitors_increment_per_bracket',
                self::DEFAULT_ECONOMY_RULES['economy_daily_visitors_increment_per_bracket']
            )
        );
    }

    public function getDailyVisitorsCap(): int
    {
        return max(
            1,
            $this->getRuleValue(
                'economy_daily_visitors_cap',
                self::DEFAULT_ECONOMY_RULES['economy_daily_visitors_cap']
            )
        );
    }

    /**
     * @return array{min:float,max:float}
     */
    public function getTrafficMultiplierBounds(): array
    {
        $minPercent = max(
            1,
            $this->getRuleValue(
                'economy_traffic_multiplier_min_percent',
                self::DEFAULT_ECONOMY_RULES['economy_traffic_multiplier_min_percent']
            )
        );
        $maxPercent = max(
            $minPercent,
            $this->getRuleValue(
                'economy_traffic_multiplier_max_percent',
                self::DEFAULT_ECONOMY_RULES['economy_traffic_multiplier_max_percent']
            )
        );

        return [
            'min' => $minPercent / 100,
            'max' => $maxPercent / 100,
        ];
    }

    public function getProductBonusEveryN(): int
    {
        return max(
            1,
            $this->getRuleValue(
                'economy_product_bonus_every_n',
                self::DEFAULT_ECONOMY_RULES['economy_product_bonus_every_n']
            )
        );
    }

    public function getProductBonusCap(): int
    {
        return max(
            0,
            $this->getRuleValue(
                'economy_product_bonus_cap',
                self::DEFAULT_ECONOMY_RULES['economy_product_bonus_cap']
            )
        );
    }

    public function getStaffBonusEveryN(): int
    {
        return max(
            1,
            $this->getRuleValue(
                'economy_staff_bonus_every_n',
                self::DEFAULT_ECONOMY_RULES['economy_staff_bonus_every_n']
            )
        );
    }

    public function getStaffBonusCap(): int
    {
        return max(
            0,
            $this->getRuleValue(
                'economy_staff_bonus_cap',
                self::DEFAULT_ECONOMY_RULES['economy_staff_bonus_cap']
            )
        );
    }

    public function getInnovationBonusEveryN(): int
    {
        return max(
            1,
            $this->getRuleValue(
                'economy_innovation_bonus_every_n',
                self::DEFAULT_ECONOMY_RULES['economy_innovation_bonus_every_n']
            )
        );
    }

    public function getInnovationBonusCap(): int
    {
        return max(
            0,
            $this->getRuleValue(
                'economy_innovation_bonus_cap',
                self::DEFAULT_ECONOMY_RULES['economy_innovation_bonus_cap']
            )
        );
    }

    public function getConversionProfitPerTokenRate(): int
    {
        return max(
            1,
            $this->getRuleValue(
                'economy_conversion_profit_per_token',
                self::DEFAULT_ECONOMY_RULES['economy_conversion_profit_per_token']
            )
        );
    }

    public function getConversionMinProfit(): int
    {
        return max(
            1,
            $this->getRuleValue(
                'economy_conversion_min_profit',
                self::DEFAULT_ECONOMY_RULES['economy_conversion_min_profit']
            )
        );
    }

    public function getGenericActionCost(): int
    {
        return max(
            0,
            $this->getRuleValue(
                'economy_action_base_cost',
                self::DEFAULT_ECONOMY_RULES['economy_action_base_cost']
            )
        );
    }

    public function getTargetProfitPercent(): int
    {
        return min(
            95,
            max(
                5,
                $this->getRuleValue(
                    'economy_target_profit_percent',
                    self::DEFAULT_ECONOMY_RULES['economy_target_profit_percent']
                )
            )
        );
    }

    public function getPopularityDailyVisitorBudget(
        int $popularityLevel,
        float $trafficMultiplier = 1.0,
        int $productsCount = 0,
        int $staffCount = 0,
        int $activeInnovations = 0
    ): int {
        $baseBudget = $this->resolveBaseVisitorsForPopularity($popularityLevel);
        $cap = $this->getDailyVisitorsCap();

        $trafficBounds = $this->getTrafficMultiplierBounds();
        $normalizedTrafficMultiplier = min(
            $trafficBounds['max'],
            max($trafficBounds['min'], $trafficMultiplier)
        );
        $trafficAdjusted = (int) round($baseBudget * $normalizedTrafficMultiplier);

        $productBonus = min(
            $this->getProductBonusCap(),
            (int) floor(max(0, $productsCount) / $this->getProductBonusEveryN())
        );
        $staffBonus = min(
            $this->getStaffBonusCap(),
            (int) floor(max(0, $staffCount) / $this->getStaffBonusEveryN())
        );
        $innovationBonus = min(
            $this->getInnovationBonusCap(),
            (int) floor(max(0, $activeInnovations) / $this->getInnovationBonusEveryN())
        );

        return max(1, min($cap, $trafficAdjusted + $productBonus + $staffBonus + $innovationBonus));
    }

    /**
     * @return array<int, array<string, int|string>>
     */
    public function getPopularityVisitorPreview(int $maxLevel = 100): array
    {
        $normalizedMax = max(1, $maxLevel);
        $ranges = $this->getActivePopularityRanges();
        if ($ranges->isNotEmpty()) {
            return $ranges
                ->map(function (AIpreneurPopularityRange $range): array {
                    $min = (int) $range->min_popularity;
                    $max = (int) $range->max_popularity;
                    return [
                        'id' => (string) $range->id,
                        'min_popularity' => $min,
                        'max_popularity' => $max,
                        'label' => "{$min}-{$max}",
                        'daily_visitors' => (int) $range->daily_visitors,
                    ];
                })
                ->filter(static fn(array $row) => (int) $row['min_popularity'] <= $normalizedMax)
                ->map(function (array $row) use ($normalizedMax): array {
                    $row['max_popularity'] = min((int) $row['max_popularity'], $normalizedMax);
                    $row['label'] = "{$row['min_popularity']}-{$row['max_popularity']}";
                    return $row;
                })
                ->values()
                ->all();
        }

        $preview = [];
        $bracketSize = $this->getPopularityBracketSize();
        $tiers = (int) ceil($normalizedMax / $bracketSize);

        for ($tier = 1; $tier <= max(1, $tiers); $tier++) {
            $minPopularity = (($tier - 1) * $bracketSize) + 1;
            $maxPopularity = min($tier * $bracketSize, $normalizedMax);
            $examplePopularity = (int) floor(($minPopularity + $maxPopularity) / 2);
            $visitors = $this->getPopularityDailyVisitorBudget($examplePopularity, 1.0, 0, 0, 0);

            $preview[] = [
                'tier' => $tier,
                'min_popularity' => $minPopularity,
                'max_popularity' => $maxPopularity,
                'label' => "{$minPopularity}-{$maxPopularity}",
                'daily_visitors' => $visitors,
            ];
        }

        return $preview;
    }

    /**
     * @return array<int, array<string, int|string>>
     */
    public function getPopularityRangeRows(): array
    {
        return $this->getActivePopularityRanges()
            ->map(function (AIpreneurPopularityRange $range): array {
                $min = (int) $range->min_popularity;
                $max = (int) $range->max_popularity;
                return [
                    'id' => (string) $range->id,
                    'min_popularity' => $min,
                    'max_popularity' => $max,
                    'daily_visitors' => (int) $range->daily_visitors,
                    'label' => "{$min}-{$max}",
                    'sort_order' => (int) $range->sort_order,
                    'is_active' => (bool) $range->is_active,
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @return array<string, array<string, bool|string>>
     */
    public function getFeatureAccessSettings(): array
    {
        $configMap = $this->getFeatureAccessConfigMap();
        $allEnabled = (bool) ($configMap[self::FREE_ACCESS_FEATURES['all']['config_key']] ?? false);

        $settings = [];
        foreach (self::FREE_ACCESS_FEATURES as $featureKey => $meta) {
            $enabled = (bool) ($configMap[$meta['config_key']] ?? false);

            $settings[$featureKey] = [
                'config_key' => $meta['config_key'],
                'label' => $meta['label'],
                'description' => $meta['description'],
                'enabled' => $enabled,
                'effective_enabled' => $featureKey === 'all' ? $enabled : ($allEnabled || $enabled),
            ];
        }

        return $settings;
    }

    public function isFeatureFree(string $featureKey): bool
    {
        $settings = $this->getFeatureAccessSettings();

        return (bool) ($settings[$featureKey]['effective_enabled'] ?? false);
    }

    public function areExteriorDecorationsFree(): bool
    {
        return $this->isFeatureFree('exterior_decorations');
    }

    public function getRuleValue(string $operationKey, ?int $fallback = null): int
    {
        $map = $this->getActiveRuleCostMap();
        if (array_key_exists($operationKey, $map)) {
            return (int) $map[$operationKey];
        }

        return (int) ($fallback ?? 0);
    }

    /**
     * Returns the payload shape used by frontend pages.
     *
     * @return array<string, mixed>
     */
    public function getPricingCatalog(): array
    {
        $packages = $this->getActivePackages()->map(function (AIpreneurPricingPackage $package): array {
            return [
                'id' => $package->id,
                'code' => $package->code,
                'name' => $package->name,
                'description' => $package->description,
                'package_type' => $package->package_type,
                'tokens_amount' => (int) $package->tokens_amount,
                'bonus_tokens' => (int) $package->bonus_tokens,
                'total_tokens' => (int) $package->tokens_amount + (int) $package->bonus_tokens,
                'price_rm' => (float) $package->price_rm,
                'original_price_rm' => $package->original_price_rm !== null ? (float) $package->original_price_rm : null,
                'badge' => $package->badge,
                'popular' => $package->badge === 'popular',
                'best_value' => $package->badge === 'best_value',
                'sort_order' => (int) $package->sort_order,
            ];
        })->values();

        $tokenCosts = [];
        foreach (self::DEFAULT_TOKEN_COSTS as $operationKey => $fallback) {
            $tokenCosts[$operationKey] = $this->getTokenCost($operationKey, $fallback);
        }

        $influencerTierCosts = [];
        foreach (self::DEFAULT_INFLUENCER_TIER_COSTS as $tier => $fallback) {
            $influencerTierCosts[$tier] = $this->getInfluencerTierCost($tier);
        }

        $innovationUnlockCosts = [];
        foreach (self::DEFAULT_INNOVATION_UNLOCK_COSTS as $projectId => $fallback) {
            $innovationUnlockCosts[$projectId] = $this->getInnovationUnlockCost($projectId);
        }

        $influencerBoostRanges = [];
        foreach (array_keys(self::DEFAULT_INFLUENCER_BOOST_PERCENT_RANGES) as $tier) {
            $influencerBoostRanges[$tier] = $this->getInfluencerBoostPercentRange($tier);
        }

        $durationMultipliers = [
            '1h_percent' => $this->getRuleValue('influencer_duration_multiplier_1h_percent', self::DEFAULT_INFLUENCER_DURATION_MULTIPLIERS_PERCENT['1h']),
            '6h_percent' => $this->getRuleValue('influencer_duration_multiplier_6h_percent', self::DEFAULT_INFLUENCER_DURATION_MULTIPLIERS_PERCENT['6h']),
            '12h_percent' => $this->getRuleValue('influencer_duration_multiplier_12h_percent', self::DEFAULT_INFLUENCER_DURATION_MULTIPLIERS_PERCENT['12h']),
            '24h_percent' => $this->getRuleValue('influencer_duration_multiplier_24h_percent', self::DEFAULT_INFLUENCER_DURATION_MULTIPLIERS_PERCENT['24h']),
            '72h_percent' => $this->getRuleValue('influencer_duration_multiplier_72h_percent', self::DEFAULT_INFLUENCER_DURATION_MULTIPLIERS_PERCENT['72h']),
            '168h_percent' => $this->getRuleValue('influencer_duration_multiplier_168h_percent', self::DEFAULT_INFLUENCER_DURATION_MULTIPLIERS_PERCENT['168h']),
        ];

        $trafficBounds = $this->getTrafficMultiplierBounds();
        $profitPerVisitorRange = $this->getProfitPerVisitorRange();
        $popularityRanges = $this->getPopularityRangeRows();

        return [
            'packages' => $packages,
            'token_costs' => $tokenCosts,
            'influencer_tier_costs' => $influencerTierCosts,
            'innovation_unlock_costs' => $innovationUnlockCosts,
            'economy' => [
                'profit_per_visitor' => $profitPerVisitorRange,
                'visitor_purchase_chance_percent' => $this->getVisitorPurchaseChancePercent(),
                'passive_visitor_interval_seconds' => $this->getPassiveVisitorIntervalSeconds(),
                'daily_visitors' => [
                    'popularity_bracket_size' => $this->getPopularityBracketSize(),
                    'base' => $this->getDailyVisitorsBase(),
                    'increment_per_bracket' => $this->getDailyVisitorsIncrementPerBracket(),
                    'cap' => $this->getDailyVisitorsCap(),
                    'max_level' => 100,
                    'ranges' => $popularityRanges,
                    'traffic_multiplier_min' => $trafficBounds['min'],
                    'traffic_multiplier_max' => $trafficBounds['max'],
                    'product_bonus_every_n' => $this->getProductBonusEveryN(),
                    'product_bonus_cap' => $this->getProductBonusCap(),
                    'staff_bonus_every_n' => $this->getStaffBonusEveryN(),
                    'staff_bonus_cap' => $this->getStaffBonusCap(),
                    'innovation_bonus_every_n' => $this->getInnovationBonusEveryN(),
                    'innovation_bonus_cap' => $this->getInnovationBonusCap(),
                    'preview' => $this->getPopularityVisitorPreview(100),
                ],
                'conversion' => [
                    'profit_per_ai_token' => $this->getConversionProfitPerTokenRate(),
                    'min_profit' => $this->getConversionMinProfit(),
                ],
                'target_profit_percent' => $this->getTargetProfitPercent(),
                'influencer' => [
                    'duration_default_hours' => $this->getInfluencerDurationDefaultHours(),
                    'duration_multipliers' => $durationMultipliers,
                    'marketing_boost_cap_percent' => $this->getInfluencerMarketingBoostCapPercent(),
                    'tiers' => [
                        'nano' => [
                            'token_per_day' => $this->getInfluencerTierCost('nano'),
                            'boost_percent_range' => $influencerBoostRanges['nano'],
                        ],
                        'micro' => [
                            'token_per_day' => $this->getInfluencerTierCost('micro'),
                            'boost_percent_range' => $influencerBoostRanges['micro'],
                        ],
                        'macro' => [
                            'token_per_day' => $this->getInfluencerTierCost('macro'),
                            'boost_percent_range' => $influencerBoostRanges['macro'],
                        ],
                        'mega' => [
                            'token_per_day' => $this->getInfluencerTierCost('mega'),
                            'boost_percent_range' => $influencerBoostRanges['mega'],
                        ],
                    ],
                ],
                'action_base_cost' => $this->getGenericActionCost(),
            ],
            'system_costs' => [
                'staff_hire' => $this->getStaffHireCost(),
                'innovation_upgrade_step' => $this->getInnovationUpgradeStepCost(),
                'decorate_token_divisor' => $this->getDecorateTokenDivisor(),
                'decorate_free_exterior_changes_total' => $this->getDecorateFreeExteriorChangesTotal(),
                'exterior_decorations_free' => $this->areExteriorDecorationsFree(),
            ],
            'feature_access' => collect($this->getFeatureAccessSettings())
                ->map(static fn(array $meta): bool => (bool) ($meta['effective_enabled'] ?? false))
                ->all(),
            'rules' => $this->getActiveRules()->map(function (AIpreneurPricingRule $rule): array {
                return [
                    'id' => $rule->id,
                    'operation_key' => $rule->operation_key,
                    'operation_name' => $rule->operation_name,
                    'description' => $rule->description,
                    'token_cost' => (int) $rule->token_cost,
                    'sort_order' => (int) $rule->sort_order,
                ];
            })->values(),
        ];
    }

    /**
     * @return array<string, int>
     */
    private function getActiveRuleCostMap(): array
    {
        if (is_array($this->activeRuleCostMap)) {
            return $this->activeRuleCostMap;
        }

        $this->activeRuleCostMap = AIpreneurPricingRule::query()
            ->where('is_active', true)
            ->pluck('token_cost', 'operation_key')
            ->map(static fn($value) => (int) $value)
            ->toArray();

        return $this->activeRuleCostMap;
    }

    /**
     * @return array<string, bool>
     */
    private function getFeatureAccessConfigMap(): array
    {
        if (is_array($this->featureAccessConfigMap)) {
            return $this->featureAccessConfigMap;
        }

        if (!Schema::hasTable('system_config')) {
            $this->featureAccessConfigMap = [];
            return $this->featureAccessConfigMap;
        }

        $configKeys = array_values(array_map(
            static fn(array $meta): string => (string) $meta['config_key'],
            self::FREE_ACCESS_FEATURES
        ));

        $this->featureAccessConfigMap = SystemConfig::query()
            ->whereIn('config_key', $configKeys)
            ->get()
            ->mapWithKeys(function (SystemConfig $config): array {
                $raw = $config->config_value;
                $value = is_array($raw) && array_key_exists(0, $raw) ? $raw[0] : $raw;

                return [
                    $config->config_key => filter_var($value, FILTER_VALIDATE_BOOLEAN),
                ];
            })
            ->toArray();

        return $this->featureAccessConfigMap;
    }

    private function resolveBaseVisitorsForPopularity(int $popularityLevel): int
    {
        $normalizedPopularity = max(1, $popularityLevel);
        $ranges = $this->getActivePopularityRanges();
        if ($ranges->isNotEmpty()) {
            $matched = $ranges->first(function (AIpreneurPopularityRange $range) use ($normalizedPopularity) {
                return $normalizedPopularity >= (int) $range->min_popularity
                    && $normalizedPopularity <= (int) $range->max_popularity;
            });

            if ($matched) {
                return max(1, (int) $matched->daily_visitors);
            }

            /** @var AIpreneurPopularityRange|null $lastRange */
            $lastRange = $ranges
                ->filter(fn(AIpreneurPopularityRange $range) => (int) $range->max_popularity <= $normalizedPopularity)
                ->last();

            if ($lastRange) {
                return max(1, (int) $lastRange->daily_visitors);
            }
        }

        $bracketSize = $this->getPopularityBracketSize();
        $baseVisitors = $this->getDailyVisitorsBase();
        $incrementPerBracket = $this->getDailyVisitorsIncrementPerBracket();
        $bracket = (int) ceil($normalizedPopularity / $bracketSize);

        return max(1, $baseVisitors + max(0, $bracket - 1) * $incrementPerBracket);
    }
}
