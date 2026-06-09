<?php

namespace Tests\Unit;

use App\Models\AIpreneurPricingRule;
use App\Models\SystemConfig;
use App\Services\AIpreneurPricingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AIpreneurPricingServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_feature_free_access_overrides_saved_token_cost_without_mutating_rule(): void
    {
        $rule = AIpreneurPricingRule::query()
            ->where('operation_key', 'marketing_asset')
            ->firstOrFail();

        $rule->fill([
            'operation_name' => 'Marketing Asset Generation',
            'description' => 'Create posters and banners.',
            'token_cost' => 35,
            'is_active' => true,
            'sort_order' => 40,
        ]);
        $rule->save();

        $service = app(AIpreneurPricingService::class);
        $this->assertSame(35, $service->getTokenCost('marketing_asset', 35));

        SystemConfig::query()->create([
            'config_key' => 'aipreneur_free_access_marketing_asset',
            'config_value' => true,
            'description' => 'Allow marketing asset generation for free.',
            'category' => 'gameplay',
            'data_type' => 'boolean',
            'default_value' => false,
            'updated_at' => now(),
        ]);

        $service = app(AIpreneurPricingService::class);

        $this->assertSame(0, $service->getTokenCost('marketing_asset', 35));
        $this->assertTrue($service->isFeatureFree('marketing_asset'));

        $rule->refresh();
        $this->assertSame(35, (int) $rule->token_cost, 'Saved pricing rule should remain unchanged.');
    }
}
