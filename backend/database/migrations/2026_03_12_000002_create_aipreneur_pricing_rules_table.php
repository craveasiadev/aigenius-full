<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('aipreneur_pricing_rules', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('operation_key')->unique();
            $table->string('operation_name');
            $table->text('description')->nullable();
            $table->unsignedInteger('token_cost');
            $table->json('metadata')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();

            $table->index(['is_active', 'sort_order']);
        });

        $now = now();
        $defaultRules = [
            ['operation_key' => 'product_image', 'operation_name' => 'Product Image Generation', 'description' => 'Create AI product image from upload/drawing.', 'token_cost' => 35, 'sort_order' => 10],
            ['operation_key' => 'product_regenerate', 'operation_name' => 'Product Image Remix', 'description' => 'Regenerate/remix product image.', 'token_cost' => 45, 'sort_order' => 20],
            ['operation_key' => 'interior_item', 'operation_name' => 'Interior Asset Generation', 'description' => 'Generate AI interior decoration asset.', 'token_cost' => 35, 'sort_order' => 30],
            ['operation_key' => 'marketing_asset', 'operation_name' => 'Marketing Asset Generation', 'description' => 'Generate AI banners, posters, flyers, social creatives.', 'token_cost' => 35, 'sort_order' => 40],
            ['operation_key' => 'marketing_content', 'operation_name' => 'Marketing Content Ideas', 'description' => 'Generate script/content ideas.', 'token_cost' => 5, 'sort_order' => 50],
            ['operation_key' => 'shop_exterior', 'operation_name' => 'Shop Exterior Regeneration', 'description' => 'Regenerate onboarding shop exterior image.', 'token_cost' => 70, 'sort_order' => 60],
            ['operation_key' => 'ai_chat', 'operation_name' => 'AI Chat Assist', 'description' => 'Use AI helper/chat operation.', 'token_cost' => 10, 'sort_order' => 70],
            ['operation_key' => 'staff_hire', 'operation_name' => 'Hire Staff (Interview)', 'description' => 'Hire staff from interview flow.', 'token_cost' => 20, 'sort_order' => 80],
            ['operation_key' => 'influencer_nano', 'operation_name' => 'Influencer Campaign (Nano)', 'description' => 'Base cost for nano influencer.', 'token_cost' => 120, 'sort_order' => 100],
            ['operation_key' => 'influencer_micro', 'operation_name' => 'Influencer Campaign (Micro)', 'description' => 'Base cost for micro influencer.', 'token_cost' => 500, 'sort_order' => 110],
            ['operation_key' => 'influencer_macro', 'operation_name' => 'Influencer Campaign (Macro)', 'description' => 'Base cost for macro influencer.', 'token_cost' => 2000, 'sort_order' => 120],
            ['operation_key' => 'influencer_mega', 'operation_name' => 'Influencer Campaign (Mega)', 'description' => 'Base cost for mega influencer.', 'token_cost' => 10000, 'sort_order' => 130],
            ['operation_key' => 'innovation_unlock_ai_kiosk', 'operation_name' => 'Unlock Innovation: Robot Greeter', 'description' => 'Token cost to unlock innovation.', 'token_cost' => 500, 'sort_order' => 200],
            ['operation_key' => 'innovation_unlock_smart_qds', 'operation_name' => 'Unlock Innovation: Fast Line Screen', 'description' => 'Token cost to unlock innovation.', 'token_cost' => 300, 'sort_order' => 210],
            ['operation_key' => 'innovation_unlock_targeting_ai', 'operation_name' => 'Unlock Innovation: Toy Finder', 'description' => 'Token cost to unlock innovation.', 'token_cost' => 800, 'sort_order' => 220],
            ['operation_key' => 'innovation_unlock_robotic_cleaner', 'operation_name' => 'Unlock Innovation: Sparkle Bot', 'description' => 'Token cost to unlock innovation.', 'token_cost' => 450, 'sort_order' => 230],
            ['operation_key' => 'innovation_unlock_analytics_hub', 'operation_name' => 'Unlock Innovation: Future Scope', 'description' => 'Token cost to unlock innovation.', 'token_cost' => 1500, 'sort_order' => 240],
            ['operation_key' => 'innovation_unlock_smart_inventory', 'operation_name' => 'Unlock Innovation: Smart Inventory', 'description' => 'Token cost to unlock innovation.', 'token_cost' => 1800, 'sort_order' => 250],
            ['operation_key' => 'innovation_unlock_drone_delivery', 'operation_name' => 'Unlock Innovation: Drone Delivery', 'description' => 'Token cost to unlock innovation.', 'token_cost' => 2200, 'sort_order' => 260],
            ['operation_key' => 'innovation_unlock_eco_energy_grid', 'operation_name' => 'Unlock Innovation: Eco Energy Grid', 'description' => 'Token cost to unlock innovation.', 'token_cost' => 2000, 'sort_order' => 270],
            ['operation_key' => 'innovation_upgrade_step', 'operation_name' => 'Innovation Upgrade Step Factor', 'description' => 'Upgrade cost formula = factor x next level.', 'token_cost' => 80, 'sort_order' => 300],
            ['operation_key' => 'decorate_token_divisor', 'operation_name' => 'Decorate Token Divisor', 'description' => 'Decorate cost formula = ceil(legacy_cost/divisor).', 'token_cost' => 20, 'sort_order' => 310],
            ['operation_key' => 'decorate_free_exterior_changes_total', 'operation_name' => 'Decorate Free Exterior Changes', 'description' => 'How many paid exterior unlocks are free.', 'token_cost' => 3, 'sort_order' => 320],
        ];

        $rows = array_map(static function (array $row) use ($now) {
            return array_merge($row, [
                'id' => (string) Str::uuid(),
                'metadata' => null,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }, $defaultRules);

        DB::table('aipreneur_pricing_rules')->insert($rows);
    }

    public function down(): void
    {
        Schema::dropIfExists('aipreneur_pricing_rules');
    }
};
