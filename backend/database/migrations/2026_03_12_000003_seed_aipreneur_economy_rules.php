<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * @return array<int, array<string, mixed>>
     */
    private function economyRules(): array
    {
        return [
            ['operation_key' => 'economy_profit_per_visitor_min', 'operation_name' => 'Economy: Profit Per Visitor (Min)', 'description' => 'Minimum simulated profit value per converted visitor.', 'token_cost' => 2, 'sort_order' => 500],
            ['operation_key' => 'economy_profit_per_visitor_max', 'operation_name' => 'Economy: Profit Per Visitor (Max)', 'description' => 'Maximum simulated profit value per converted visitor.', 'token_cost' => 8, 'sort_order' => 510],
            ['operation_key' => 'economy_visitor_purchase_chance_percent', 'operation_name' => 'Economy: Visitor Purchase Chance (%)', 'description' => 'Chance that a passive visitor converts into a sale tick.', 'token_cost' => 50, 'sort_order' => 520],
            ['operation_key' => 'economy_passive_visitor_interval_seconds', 'operation_name' => 'Economy: Passive Visitor Interval (Seconds)', 'description' => 'Interval for passive visitor recording while shift is open.', 'token_cost' => 240, 'sort_order' => 530],

            ['operation_key' => 'economy_popularity_bracket_size', 'operation_name' => 'Economy: Popularity Bracket Size', 'description' => 'Popularity points per daily-visitor bracket.', 'token_cost' => 5, 'sort_order' => 540],
            ['operation_key' => 'economy_daily_visitors_base', 'operation_name' => 'Economy: Daily Visitors Base', 'description' => 'Base daily visitor budget at lowest popularity bracket.', 'token_cost' => 3, 'sort_order' => 550],
            ['operation_key' => 'economy_daily_visitors_increment_per_bracket', 'operation_name' => 'Economy: Daily Visitors Increment / Bracket', 'description' => 'Extra daily visitors per popularity bracket.', 'token_cost' => 1, 'sort_order' => 560],
            ['operation_key' => 'economy_daily_visitors_cap', 'operation_name' => 'Economy: Daily Visitors Cap', 'description' => 'Maximum daily visitor budget before bonuses.', 'token_cost' => 55, 'sort_order' => 570],
            ['operation_key' => 'economy_traffic_multiplier_min_percent', 'operation_name' => 'Economy: Traffic Multiplier Min (%)', 'description' => 'Minimum traffic multiplier applied to visitor budget.', 'token_cost' => 75, 'sort_order' => 580],
            ['operation_key' => 'economy_traffic_multiplier_max_percent', 'operation_name' => 'Economy: Traffic Multiplier Max (%)', 'description' => 'Maximum traffic multiplier applied to visitor budget.', 'token_cost' => 160, 'sort_order' => 590],
            ['operation_key' => 'economy_product_bonus_every_n', 'operation_name' => 'Economy: Product Bonus Every N Products', 'description' => 'Adds +1 daily visitor budget per this many products.', 'token_cost' => 4, 'sort_order' => 600],
            ['operation_key' => 'economy_product_bonus_cap', 'operation_name' => 'Economy: Product Bonus Cap', 'description' => 'Maximum daily visitor bonus from products.', 'token_cost' => 4, 'sort_order' => 610],
            ['operation_key' => 'economy_staff_bonus_every_n', 'operation_name' => 'Economy: Staff Bonus Every N Staff', 'description' => 'Adds +1 daily visitor budget per this many staff.', 'token_cost' => 2, 'sort_order' => 620],
            ['operation_key' => 'economy_staff_bonus_cap', 'operation_name' => 'Economy: Staff Bonus Cap', 'description' => 'Maximum daily visitor bonus from staff.', 'token_cost' => 3, 'sort_order' => 630],
            ['operation_key' => 'economy_innovation_bonus_every_n', 'operation_name' => 'Economy: Innovation Bonus Every N Innovations', 'description' => 'Adds +1 daily visitor budget per this many active innovations.', 'token_cost' => 1, 'sort_order' => 640],
            ['operation_key' => 'economy_innovation_bonus_cap', 'operation_name' => 'Economy: Innovation Bonus Cap', 'description' => 'Maximum daily visitor bonus from active innovations.', 'token_cost' => 3, 'sort_order' => 650],

            ['operation_key' => 'economy_conversion_profit_per_token', 'operation_name' => 'Economy: Profit To AI Token Rate', 'description' => 'Profit required to mint 1 AI token.', 'token_cost' => 25, 'sort_order' => 660],
            ['operation_key' => 'economy_conversion_min_profit', 'operation_name' => 'Economy: Minimum Convertible Profit', 'description' => 'Minimum profit amount allowed for conversion.', 'token_cost' => 25, 'sort_order' => 670],
            ['operation_key' => 'economy_target_profit_percent', 'operation_name' => 'Economy: Target Profit Percent', 'description' => 'Target net-profit capture percentage used by preset.', 'token_cost' => 60, 'sort_order' => 675],

            ['operation_key' => 'economy_action_base_cost', 'operation_name' => 'Economy: Generic Action Cost', 'description' => 'Generic action token cost baseline for future balancing.', 'token_cost' => 50, 'sort_order' => 680],

            ['operation_key' => 'influencer_duration_default_hours', 'operation_name' => 'Influencer: Default Duration (Hours)', 'description' => 'Default campaign duration if frontend does not provide one.', 'token_cost' => 168, 'sort_order' => 700],
            ['operation_key' => 'influencer_duration_multiplier_1h_percent', 'operation_name' => 'Influencer: Duration Multiplier 1h (%)', 'description' => 'Cost multiplier for campaigns up to 1 hour.', 'token_cost' => 10, 'sort_order' => 710],
            ['operation_key' => 'influencer_duration_multiplier_6h_percent', 'operation_name' => 'Influencer: Duration Multiplier 6h (%)', 'description' => 'Cost multiplier for campaigns up to 6 hours.', 'token_cost' => 30, 'sort_order' => 720],
            ['operation_key' => 'influencer_duration_multiplier_12h_percent', 'operation_name' => 'Influencer: Duration Multiplier 12h (%)', 'description' => 'Cost multiplier for campaigns up to 12 hours.', 'token_cost' => 50, 'sort_order' => 730],
            ['operation_key' => 'influencer_duration_multiplier_24h_percent', 'operation_name' => 'Influencer: Duration Multiplier 24h (%)', 'description' => 'Cost multiplier for campaigns up to 24 hours.', 'token_cost' => 100, 'sort_order' => 740],
            ['operation_key' => 'influencer_duration_multiplier_72h_percent', 'operation_name' => 'Influencer: Duration Multiplier 72h (%)', 'description' => 'Cost multiplier for campaigns up to 72 hours.', 'token_cost' => 250, 'sort_order' => 750],
            ['operation_key' => 'influencer_duration_multiplier_168h_percent', 'operation_name' => 'Influencer: Duration Multiplier 168h (%)', 'description' => 'Cost multiplier for campaigns above 72 hours.', 'token_cost' => 500, 'sort_order' => 760],
            ['operation_key' => 'influencer_marketing_boost_cap_percent', 'operation_name' => 'Influencer: Marketing Boost Cap (%)', 'description' => 'Maximum influencer contribution to marketing boost.', 'token_cost' => 75, 'sort_order' => 770],

            ['operation_key' => 'influencer_popularity_boost_nano_min_percent', 'operation_name' => 'Influencer Nano Boost Min (%)', 'description' => 'Minimum popularity boost percent from active nano influencer.', 'token_cost' => 2, 'sort_order' => 780],
            ['operation_key' => 'influencer_popularity_boost_nano_max_percent', 'operation_name' => 'Influencer Nano Boost Max (%)', 'description' => 'Maximum popularity boost percent from active nano influencer.', 'token_cost' => 4, 'sort_order' => 781],
            ['operation_key' => 'influencer_popularity_boost_micro_min_percent', 'operation_name' => 'Influencer Micro Boost Min (%)', 'description' => 'Minimum popularity boost percent from active micro influencer.', 'token_cost' => 5, 'sort_order' => 782],
            ['operation_key' => 'influencer_popularity_boost_micro_max_percent', 'operation_name' => 'Influencer Micro Boost Max (%)', 'description' => 'Maximum popularity boost percent from active micro influencer.', 'token_cost' => 8, 'sort_order' => 783],
            ['operation_key' => 'influencer_popularity_boost_macro_min_percent', 'operation_name' => 'Influencer Macro Boost Min (%)', 'description' => 'Minimum popularity boost percent from active macro influencer.', 'token_cost' => 10, 'sort_order' => 784],
            ['operation_key' => 'influencer_popularity_boost_macro_max_percent', 'operation_name' => 'Influencer Macro Boost Max (%)', 'description' => 'Maximum popularity boost percent from active macro influencer.', 'token_cost' => 15, 'sort_order' => 785],
            ['operation_key' => 'influencer_popularity_boost_mega_min_percent', 'operation_name' => 'Influencer Mega Boost Min (%)', 'description' => 'Minimum popularity boost percent from active mega influencer.', 'token_cost' => 18, 'sort_order' => 786],
            ['operation_key' => 'influencer_popularity_boost_mega_max_percent', 'operation_name' => 'Influencer Mega Boost Max (%)', 'description' => 'Maximum popularity boost percent from active mega influencer.', 'token_cost' => 25, 'sort_order' => 787],
        ];
    }

    public function up(): void
    {
        if (!Schema::hasTable('aipreneur_pricing_rules')) {
            return;
        }

        $now = now();
        foreach ($this->economyRules() as $rule) {
            $exists = DB::table('aipreneur_pricing_rules')
                ->where('operation_key', $rule['operation_key'])
                ->exists();

            if ($exists) {
                continue;
            }

            DB::table('aipreneur_pricing_rules')->insert([
                'id' => (string) Str::uuid(),
                'operation_key' => $rule['operation_key'],
                'operation_name' => $rule['operation_name'],
                'description' => $rule['description'],
                'token_cost' => $rule['token_cost'],
                'metadata' => null,
                'is_active' => true,
                'sort_order' => $rule['sort_order'],
                'created_by' => null,
                'updated_by' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('aipreneur_pricing_rules')) {
            return;
        }

        DB::table('aipreneur_pricing_rules')
            ->whereIn('operation_key', array_column($this->economyRules(), 'operation_key'))
            ->delete();
    }
};
