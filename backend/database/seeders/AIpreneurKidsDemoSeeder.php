<?php

namespace Database\Seeders;

use App\Models\AIpreneurBusiness;
use App\Models\AIpreneurCampaign;
use App\Models\AIpreneurClassBooking;
use App\Models\AIpreneurClassSlot;
use App\Models\AIpreneurDailyStats;
use App\Models\AIpreneurDecoration;
use App\Models\AIpreneurDecorationItem;
use App\Models\AIpreneurInfluencerCampaign;
use App\Models\AIpreneurInnovation;
use App\Models\AIpreneurInterview;
use App\Models\AIpreneurMarketingAsset;
use App\Models\AIpreneurProduct;
use App\Models\AIpreneurReward;
use App\Models\AIpreneurStaff;
use App\Models\AIpreneurToken;
use App\Models\AIpreneurTransaction;
use App\Models\ChildPersonaProfile;
use App\Models\GeniusProfile;
use App\Models\Redemption;
use App\Models\Reward;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use InvalidArgumentException;

class AIpreneurKidsDemoSeeder extends Seeder
{
    private const DEMO_BADGES = [
        'first_steps',
        'product_master',
        'team_builder',
        'week_champion',
        'grand_opening',
        'money_maker',
        'level_master',
        'token_collector',
        'marketing_guru',
        'tech_innovator',
        'decorator_pro',
        'influencer_king',
        'daily_warrior',
        'community_hero',
        'green_champion',
        'charity_star',
    ];

    private const PREMIUM_EXTERIOR_ITEM_IDS = [
        'banner_neon',
        'banner_wood',
        'banner_tech',
        'wall_glass',
        'wall_wood',
        'wall_paint_pink',
        'wall_dark',
        'lights_string',
        'lights_spot',
        'lights_neon',
    ];

    public function run(): void
    {
        $parentEmail = trim((string) env('AIPRENEUR_DEMO_PARENT_EMAIL', 'parent@aigenius.com.my'));
        $parentPassword = (string) env('AIPRENEUR_DEMO_PARENT_PASSWORD', 'Parent123!');
        $parentName = trim((string) env('AIPRENEUR_DEMO_PARENT_NAME', 'Demo Parent'));

        $geniusId = trim((string) env('AIPRENEUR_DEMO_GENIUS_ID', 'GENIUS-DEMO'));
        $kidPassword = (string) env('AIPRENEUR_DEMO_KID_PASSWORD', 'Kid123!');
        $kidName = trim((string) env('AIPRENEUR_DEMO_KID_NAME', 'Demo Kid'));
        $shopName = trim((string) env('AIPRENEUR_DEMO_SHOP_NAME', 'Star Spark Lab'));
        $kidAge = (int) env('AIPRENEUR_DEMO_KID_AGE', 10);

        if (
            $parentEmail === ''
            || $parentPassword === ''
            || $geniusId === ''
            || $kidPassword === ''
            || $kidName === ''
            || $shopName === ''
        ) {
            throw new InvalidArgumentException('Demo seeder credentials and names must not be empty.');
        }

        $now = now();

        DB::transaction(function () use (
            $parentEmail,
            $parentPassword,
            $parentName,
            $geniusId,
            $kidPassword,
            $kidName,
            $shopName,
            $kidAge,
            $now
        ) {
            $parent = User::updateOrCreate(
                ['email' => $parentEmail],
                [
                    'name' => $parentName,
                    'role' => 'parent',
                    'password_hash' => Hash::make($parentPassword),
                    'is_superadmin' => false,
                ]
            );

            $profile = GeniusProfile::updateOrCreate(
                ['genius_id' => $geniusId],
                [
                    'parent_id' => $parent->id,
                    'genius_name' => $kidName,
                    'password_hash' => Hash::make($kidPassword),
                    'gender' => 'other',
                    'profile_picture_url' => '/uman1.png',
                    'selfie_url' => '/uman1.png',
                    'signboard_url' => '/building.png',
                    'age' => max(6, $kidAge),
                    'persona_quiz_completed' => true,
                    'persona_quiz_date' => $now->copy()->subDays(12),
                    'passion_category' => 'toys_and_games',
                    'aipreneur_shop_name' => $shopName,
                    'aipreneur_onboarding_completed' => true,
                    'onboarding_stage' => 'completed',
                    'remember_token' => null,
                ]
            );

            $this->resetDemoProfileState($profile->id);

            Reward::create([
                'student_id' => $profile->id,
                'coins' => 5000,
                'xp' => 1400,
                'level' => 5,
                'streak_days' => 18,
                'last_check_in' => $now->copy()->subDay(),
                'badges' => ['Demo Explorer', 'Build Master', 'Showcase Ready'],
            ]);

            AIpreneurReward::create([
                'student_id' => $profile->id,
                'coins' => 0,
                'ai_tokens' => 25000,
                'stars' => 220,
                'xp' => 88,
                'level' => 12,
                'badges' => self::DEMO_BADGES,
                'current_streak' => 14,
                'longest_streak' => 21,
                'last_activity_date' => $now->copy()->subDay(),
                'last_daily_claim_date' => $now->copy()->subDay(),
            ]);

            AIpreneurToken::create([
                'student_id' => $profile->id,
                'tokens' => 25000,
                'tokens_used' => 3200,
                'tokens_earned' => 28200,
            ]);

            AIpreneurTransaction::insert([
                [
                    'id' => (string) Str::uuid(),
                    'student_id' => $profile->id,
                    'type' => AIpreneurTransaction::TYPE_INCOME,
                    'category' => AIpreneurTransaction::CATEGORY_TOKEN_PURCHASE,
                    'description' => 'Demo balance loaded for QA.',
                    'amount' => 0,
                    'tokens' => 25000,
                    'coin_balance_after' => 0,
                    'token_balance_after' => 25000,
                    'metadata' => json_encode(['source' => 'AIpreneurKidsDemoSeeder']),
                    'created_at' => $now->copy()->subDays(7),
                    'updated_at' => $now->copy()->subDays(7),
                ],
                [
                    'id' => (string) Str::uuid(),
                    'student_id' => $profile->id,
                    'type' => AIpreneurTransaction::TYPE_EXPENSE,
                    'category' => AIpreneurTransaction::CATEGORY_MARKETING,
                    'description' => 'Demo campaign history.',
                    'amount' => 0,
                    'tokens' => 450,
                    'coin_balance_after' => 0,
                    'token_balance_after' => 24550,
                    'metadata' => json_encode(['source' => 'AIpreneurKidsDemoSeeder']),
                    'created_at' => $now->copy()->subDays(3),
                    'updated_at' => $now->copy()->subDays(3),
                ],
            ]);

            ChildPersonaProfile::create([
                'user_id' => $profile->id,
                'strengths' => ['Creative Ideas', 'Smart Thinking'],
                'growth_areas' => ['Staying on Task', 'Patience'],
                'learning_style' => 'builder',
                'fun_facts' => [
                    'Learning style: builder',
                    'Curiosity: inventor',
                    'Behavior: helper',
                ],
                'trait_scores' => [
                    'Agility' => 82,
                    'Intelligence' => 91,
                    'Creativity' => 95,
                    'Focus' => 74,
                    'Empathy' => 86,
                ],
            ]);

            AIpreneurBusiness::create([
                'student_id' => $profile->id,
                'shop_theme' => 'futuristic_techy',
                'shop_url_slug' => Str::slug($shopName) . '-demo',
                'shop_image_url' => '/assets/shops/shop3.png',
                'shop_scene_image_url' => '/building.png',
                'shop_image_status' => 'completed',
                'questionnaire_answers' => [
                    'businessType' => 'toys_and_games',
                    'vibe' => 'futuristic_techy',
                    'shop_theme' => 'futuristic_techy',
                    'colors' => ['cyan', 'blue', 'pink'],
                    'superpower' => 'Invents playful products that make learning fun.',
                    'shopName' => $shopName,
                ],
                'exterior_config' => [
                    'banner' => 'banner_neon',
                    'wall' => 'wall_glass',
                    'lights' => 'lights_neon',
                ],
                'interior_config' => [
                    'table' => 'table_tech',
                    'shelf' => 'shelf_neon',
                    'wallColor' => 'iwall_sky',
                    'floorColor' => 'ifloor_tile',
                    'tv_poster_url' => '/building.png',
                    'wall_posters' => [
                        '/assets/shops/shop1.png',
                        '/assets/shops/shop2.png',
                        '/assets/shops/shop3.png',
                    ],
                    'layout' => [
                        'leftShelf' => ['x' => 12, 'y' => 27, 'rotation' => 0],
                        'rightShelf' => ['x' => 66, 'y' => 27, 'rotation' => 0],
                        'counter' => ['x' => 34, 'y' => 7, 'rotation' => 0],
                        'office' => ['x' => 82, 'y' => 5, 'rotation' => 0],
                        'table' => ['x' => 44, 'y' => 58, 'rotation' => 0],
                        'atm' => ['x' => 3, 'y' => 93, 'rotation' => 0],
                        'vending' => ['x' => 91, 'y' => 93, 'rotation' => 0],
                        'bench' => ['x' => 13, 'y' => 89, 'rotation' => 0],
                        'books1' => ['x' => 15, 'y' => 4, 'rotation' => 0],
                        'books2' => ['x' => 79, 'y' => 4, 'rotation' => 0],
                        '_v' => 2,
                    ],
                    'economy_meta' => [
                        'version' => 1,
                        'free_exterior_changes_used' => 3,
                        'purchased_items' => self::PREMIUM_EXTERIOR_ITEM_IDS,
                        'updated_at' => $now->toIso8601String(),
                    ],
                ],
                'module_product_progress' => 100,
                'module_decorate_progress' => 100,
                'module_operation_progress' => 100,
                'module_marketing_progress' => 100,
                'module_innovation_progress' => 100,
                'module_csr_progress' => 100,
                'total_sales' => 4860,
                'total_costs' => 1930,
                'total_profit' => 2930,
                'shop_launched' => true,
                'launched_at' => $now->copy()->subDays(10),
                'charity_percentage' => 15,
                'selected_cause' => 'ocean_cleanup',
                'total_donated' => 280,
                'impact_points' => 640,
                'staff_overall_mood' => 94,
                'popularity_level' => 88,
                'store_visitors' => 1380,
                'store_likes' => 412,
                'store_reviews_count' => 57,
                'store_rating' => 4.9,
                'current_quest' => 'Demo profile ready for QA checks.',
                'streak_days' => 14,
                'last_activity_date' => $now->copy()->subDay(),
                'last_csr_action_date' => $now->copy()->subDays(2),
                'last_finance_game_date' => $now->copy()->subDays(1),
                'opening_checklist' => [
                    'products_created' => true,
                    'staff_hired' => true,
                ],
                'ribbon_cutting_completed' => true,
                'ribbon_cutting_at' => $now->copy()->subDays(10),
                'traffic_multiplier' => 2.8,
                'traffic_boost_expires_at' => $now->copy()->addDays(14),
            ]);

            $this->seedProducts($profile->id, $now);
            $this->seedStaff($profile->id, $now);
            $this->seedDecorationData($profile->id, $now);
            $this->seedCampaigns($profile->id, $now);
            $this->seedMarketingAssets($profile->id, $now);
            $this->seedInfluencerCampaigns($profile->id, $now);
            $this->seedInnovations($profile->id, $now);
            $this->seedDailyStats($profile->id, $now);
            $this->seedClassBooking($parent, $profile, $now);
        });

        $this->command?->info('AIpreneur demo kid seeded successfully.');
        $this->command?->line('Parent login: ' . $parentEmail . ' / ' . $parentPassword);
        $this->command?->line('Kid login: ' . $geniusId . ' / ' . $kidPassword);
    }

    private function resetDemoProfileState(string $studentId): void
    {
        $slotIds = AIpreneurClassBooking::query()
            ->where('student_id', $studentId)
            ->pluck('slot_id')
            ->filter()
            ->unique()
            ->values();

        AIpreneurClassBooking::query()->where('student_id', $studentId)->delete();

        if ($slotIds->isNotEmpty()) {
            AIpreneurClassSlot::query()
                ->whereIn('id', $slotIds->all())
                ->get()
                ->each(function (AIpreneurClassSlot $slot) {
                    $slot->update([
                        'booked_count' => AIpreneurClassBooking::query()->where('slot_id', $slot->id)->count(),
                    ]);
                });
        }

        Redemption::query()->where('student_id', $studentId)->delete();
        AIpreneurDailyStats::query()->where('student_id', $studentId)->delete();
        AIpreneurInnovation::query()->where('student_id', $studentId)->delete();
        AIpreneurInfluencerCampaign::query()->where('student_id', $studentId)->delete();
        AIpreneurMarketingAsset::query()->where('student_id', $studentId)->delete();
        AIpreneurCampaign::query()->where('student_id', $studentId)->delete();
        AIpreneurDecorationItem::query()->where('student_id', $studentId)->delete();
        AIpreneurDecoration::query()->where('student_id', $studentId)->delete();
        AIpreneurStaff::query()->where('student_id', $studentId)->delete();
        AIpreneurProduct::query()->where('student_id', $studentId)->delete();
        AIpreneurInterview::query()->where('student_id', $studentId)->delete();
        AIpreneurTransaction::query()->where('student_id', $studentId)->delete();
        AIpreneurToken::query()->where('student_id', $studentId)->delete();
        Reward::query()->where('student_id', $studentId)->delete();
        AIpreneurReward::query()->where('student_id', $studentId)->delete();
        ChildPersonaProfile::query()->where('user_id', $studentId)->delete();
        AIpreneurBusiness::query()->where('student_id', $studentId)->delete();
    }

    private function seedProducts(string $studentId, $now): void
    {
        $products = [
            [
                'product_name' => 'Glow Rocket Kit',
                'description' => 'Build a bright mini rocket and launch creative stories from it.',
                'price' => 12,
                'positioning_strategy' => 'creative',
                'image_url' => '/assets/shops/shop1.png',
                'image_source' => 'generated',
                'image_status' => 'completed',
                'units_sold' => 92,
                'revenue_generated' => 1104,
                'created_at' => $now->copy()->subDays(9),
                'updated_at' => $now->copy()->subDays(2),
            ],
            [
                'product_name' => 'Ocean Rescue Slime',
                'description' => 'Eco-themed slime set that teaches kids how to protect sea life.',
                'price' => 10,
                'positioning_strategy' => 'cause',
                'image_url' => '/assets/shops/shop2.png',
                'image_source' => 'generated',
                'image_status' => 'completed',
                'units_sold' => 118,
                'revenue_generated' => 1180,
                'created_at' => $now->copy()->subDays(8),
                'updated_at' => $now->copy()->subDays(2),
            ],
            [
                'product_name' => 'Future Finder Goggles',
                'description' => 'Pretend-play smart goggles for store adventures and maker missions.',
                'price' => 15,
                'positioning_strategy' => 'tech',
                'image_url' => '/assets/shops/shop3.png',
                'image_source' => 'generated',
                'image_status' => 'completed',
                'units_sold' => 76,
                'revenue_generated' => 1140,
                'created_at' => $now->copy()->subDays(7),
                'updated_at' => $now->copy()->subDays(2),
            ],
            [
                'product_name' => 'Galaxy Snack Box',
                'description' => 'Limited mystery snack box with glow cards and surprise rewards.',
                'price' => 14,
                'positioning_strategy' => 'limited',
                'image_url' => '/building.png',
                'image_source' => 'uploaded',
                'image_status' => 'completed',
                'units_sold' => 52,
                'revenue_generated' => 728,
                'created_at' => $now->copy()->subDays(6),
                'updated_at' => $now->copy()->subDays(2),
            ],
            [
                'product_name' => 'Starter Wonder Pack',
                'description' => 'Budget-friendly first pack for new shoppers visiting the store.',
                'price' => 6,
                'positioning_strategy' => 'volume',
                'image_url' => '/image.png',
                'image_source' => 'uploaded',
                'image_status' => 'completed',
                'units_sold' => 118,
                'revenue_generated' => 708,
                'created_at' => $now->copy()->subDays(5),
                'updated_at' => $now->copy()->subDays(2),
            ],
        ];

        foreach ($products as $product) {
            AIpreneurProduct::create(array_merge($product, ['student_id' => $studentId]));
        }
    }

    private function seedStaff(string $studentId, $now): void
    {
        $staffMembers = [
            [
                'staff_role' => 'cashier',
                'staff_name' => 'Ayla',
                'avatar_url' => '/assets/character/chinese-woman-shopping.png',
                'mood' => 94,
                'energy' => 88,
                'salary' => 9,
                'skills' => ['Fast math', 'Friendly service'],
                'hobbies' => ['Puzzle games', 'Music'],
                'personality' => 'Cheerful, sharp, and calm under pressure.',
                'was_interviewed' => true,
                'last_event' => 'Handled a queue rush like a pro.',
                'last_event_date' => $now->copy()->subDays(1),
                'behavior_traits' => ['patient', 'helpful', 'focused'],
                'speed_modifier' => 1.35,
                'efficiency_modifier' => 1.4,
            ],
            [
                'staff_role' => 'chef',
                'staff_name' => 'Noah',
                'avatar_url' => '/assets/character/malay-man.png',
                'mood' => 91,
                'energy' => 90,
                'salary' => 10,
                'skills' => ['Creative recipes', 'Safe prep'],
                'hobbies' => ['Cooking', 'Drawing'],
                'personality' => 'Inventive and loves improving every product.',
                'was_interviewed' => true,
                'last_event' => 'Invented a crowd favorite snack combo.',
                'last_event_date' => $now->copy()->subDays(2),
                'behavior_traits' => ['creative', 'steady'],
                'speed_modifier' => 1.2,
                'efficiency_modifier' => 1.28,
            ],
            [
                'staff_role' => 'cleaner',
                'staff_name' => 'Mika',
                'avatar_url' => '/assets/character/indian-woman.png',
                'mood' => 96,
                'energy' => 86,
                'salary' => 8,
                'skills' => ['Organization', 'Attention to detail'],
                'hobbies' => ['Gardening', 'Reading'],
                'personality' => 'Warm, careful, and keeps everything sparkling.',
                'was_interviewed' => true,
                'last_event' => 'Boosted the shop mood with a tidy refresh.',
                'last_event_date' => $now->copy()->subDays(1),
                'behavior_traits' => ['careful', 'reliable'],
                'speed_modifier' => 1.12,
                'efficiency_modifier' => 1.18,
            ],
            [
                'staff_role' => 'greeter',
                'staff_name' => 'Ray',
                'avatar_url' => '/assets/character/malay-woman.png',
                'mood' => 98,
                'energy' => 93,
                'salary' => 8,
                'skills' => ['Welcoming guests', 'Storytelling'],
                'hobbies' => ['Dance', 'Photography'],
                'personality' => 'Outgoing and great at turning visitors into fans.',
                'was_interviewed' => true,
                'last_event' => 'Helped a family stay longer in the store.',
                'last_event_date' => $now->copy()->subDays(1),
                'behavior_traits' => ['outgoing', 'empathetic'],
                'speed_modifier' => 1.16,
                'efficiency_modifier' => 1.26,
            ],
        ];

        foreach ($staffMembers as $staffMember) {
            AIpreneurStaff::create(array_merge($staffMember, ['student_id' => $studentId]));
        }
    }

    private function seedDecorationData(string $studentId, $now): void
    {
        AIpreneurDecoration::create([
            'student_id' => $studentId,
            'mood_theme' => 'futuristic_techy',
            'decoration_focus' => 'furniture',
            'happiness_boost' => 18,
            'price_willingness_multiplier' => 1.35,
            'uniqueness_score' => 95,
            'cost' => 1200,
            'applied_at' => $now->copy()->subDays(6),
        ]);

        $items = [
            [
                'item_type' => 'exterior',
                'item_name' => 'Neon Banner',
                'item_config' => ['id' => 'banner_neon'],
                'zone' => 'facade',
                'position_x' => 50,
                'position_y' => 10,
                'is_active' => true,
            ],
            [
                'item_type' => 'wall',
                'item_name' => 'Sky Paint',
                'item_config' => ['id' => 'iwall_sky'],
                'zone' => 'interior',
                'position_x' => 40,
                'position_y' => 30,
                'is_active' => true,
            ],
            [
                'item_type' => 'floor',
                'item_name' => 'Blue Tile Floor',
                'item_config' => ['id' => 'ifloor_tile'],
                'zone' => 'interior',
                'position_x' => 40,
                'position_y' => 70,
                'is_active' => true,
            ],
            [
                'item_type' => 'display',
                'item_name' => 'Neon Display Shelf',
                'item_config' => ['id' => 'shelf_neon'],
                'zone' => 'left_wall',
                'position_x' => 15,
                'position_y' => 32,
                'is_active' => true,
            ],
        ];

        foreach ($items as $item) {
            AIpreneurDecorationItem::create(array_merge($item, ['student_id' => $studentId]));
        }
    }

    private function seedCampaigns(string $studentId, $now): void
    {
        $campaigns = [
            [
                'campaign_name' => 'Grand Opening Blast',
                'marketing_goal' => 'Bring families into the store.',
                'color_style' => 'neon blue',
                'channels' => ['instagram', 'tiktok'],
                'budget_coins' => 180,
                'reach' => 1900,
                'likes' => 420,
                'new_visitors' => 125,
                'profit_generated' => 610,
                'roi' => 3.39,
                'launched_at' => $now->copy()->subDays(7),
            ],
            [
                'campaign_name' => 'Weekend Maker Challenge',
                'marketing_goal' => 'Drive repeat visits and challenge participation.',
                'color_style' => 'sunset orange',
                'channels' => ['youtube', 'flyer'],
                'budget_coins' => 140,
                'reach' => 1320,
                'likes' => 280,
                'new_visitors' => 92,
                'profit_generated' => 420,
                'roi' => 3.0,
                'launched_at' => $now->copy()->subDays(5),
            ],
            [
                'campaign_name' => 'Ocean Hero Poster Push',
                'marketing_goal' => 'Promote cause-driven products.',
                'color_style' => 'emerald glow',
                'channels' => ['poster', 'school_board'],
                'budget_coins' => 120,
                'reach' => 980,
                'likes' => 210,
                'new_visitors' => 77,
                'profit_generated' => 315,
                'roi' => 2.63,
                'launched_at' => $now->copy()->subDays(3),
            ],
        ];

        foreach ($campaigns as $campaign) {
            AIpreneurCampaign::create(array_merge($campaign, ['student_id' => $studentId]));
        }
    }

    private function seedMarketingAssets(string $studentId, $now): void
    {
        $assets = [
            [
                'asset_type' => 'billboard',
                'asset_name' => 'Future Street Billboard',
                'asset_url' => '/building.png',
                'asset_config' => ['headline' => 'Build. Play. Sell.'],
                'placement' => 'billboard',
                'is_active' => true,
                'impressions' => 2600,
                'clicks' => 310,
                'expires_at' => $now->copy()->addDays(20),
            ],
            [
                'asset_type' => 'poster',
                'asset_name' => 'Wall Poster Alpha',
                'asset_url' => '/assets/shops/shop1.png',
                'asset_config' => ['slot' => 1],
                'placement' => 'wall_poster',
                'is_active' => true,
                'impressions' => 1400,
                'clicks' => 180,
                'expires_at' => $now->copy()->addDays(14),
            ],
            [
                'asset_type' => 'poster',
                'asset_name' => 'Wall Poster Beta',
                'asset_url' => '/assets/shops/shop2.png',
                'asset_config' => ['slot' => 2],
                'placement' => 'wall_poster',
                'is_active' => true,
                'impressions' => 1320,
                'clicks' => 166,
                'expires_at' => $now->copy()->addDays(14),
            ],
            [
                'asset_type' => 'social_post',
                'asset_name' => 'Social Launch Card',
                'asset_url' => '/assets/shops/shop3.png',
                'asset_config' => ['caption' => 'Come explore the lab.'],
                'placement' => 'social_feed',
                'is_active' => true,
                'impressions' => 4200,
                'clicks' => 560,
                'expires_at' => $now->copy()->addDays(10),
            ],
        ];

        foreach ($assets as $asset) {
            AIpreneurMarketingAsset::create(array_merge($asset, ['student_id' => $studentId]));
        }
    }

    private function seedInfluencerCampaigns(string $studentId, $now): void
    {
        $campaigns = [
            [
                'influencer_name' => 'Luna Builds',
                'influencer_avatar_url' => '/uman1.png',
                'influencer_tier' => 'micro',
                'influencer_niche' => 'maker toys',
                'follower_count' => 18000,
                'campaign_type' => 'post',
                'cost_coins' => 240,
                'reach' => 3400,
                'engagement' => 430,
                'new_visitors' => 96,
                'sales_generated' => 540,
                'started_at' => $now->copy()->subDays(2),
                'ended_at' => $now->copy()->addDays(3),
                'status' => 'active',
            ],
            [
                'influencer_name' => 'Robo Raj',
                'influencer_avatar_url' => '/assets/character/indian-man.png',
                'influencer_tier' => 'macro',
                'influencer_niche' => 'kid tech',
                'follower_count' => 125000,
                'campaign_type' => 'video',
                'cost_coins' => 520,
                'reach' => 9800,
                'engagement' => 1320,
                'new_visitors' => 204,
                'sales_generated' => 980,
                'started_at' => $now->copy()->subDays(4),
                'ended_at' => $now->copy()->addDays(2),
                'status' => 'active',
            ],
            [
                'influencer_name' => 'Mia Makes',
                'influencer_avatar_url' => '/assets/character/malay-woman.png',
                'influencer_tier' => 'nano',
                'influencer_niche' => 'creative crafts',
                'follower_count' => 8200,
                'campaign_type' => 'story',
                'cost_coins' => 120,
                'reach' => 1500,
                'engagement' => 210,
                'new_visitors' => 42,
                'sales_generated' => 210,
                'started_at' => $now->copy()->subDays(8),
                'ended_at' => $now->copy()->subDays(1),
                'status' => 'completed',
            ],
        ];

        foreach ($campaigns as $campaign) {
            AIpreneurInfluencerCampaign::create(array_merge($campaign, ['student_id' => $studentId]));
        }
    }

    private function seedInnovations(string $studentId, $now): void
    {
        $innovations = [
            ['tech_project' => 'ai_kiosk', 'efficiency_boost' => 18, 'cost_increase' => 3, 'happiness_boost' => 12, 'is_active' => true, 'upgrade_level' => 4],
            ['tech_project' => 'smart_qds', 'efficiency_boost' => 16, 'cost_increase' => 2, 'happiness_boost' => 15, 'is_active' => true, 'upgrade_level' => 3],
            ['tech_project' => 'targeting_ai', 'efficiency_boost' => 22, 'cost_increase' => 4, 'happiness_boost' => 10, 'is_active' => true, 'upgrade_level' => 5],
            ['tech_project' => 'robotic_cleaner', 'efficiency_boost' => 14, 'cost_increase' => 1, 'happiness_boost' => 18, 'is_active' => true, 'upgrade_level' => 4],
            ['tech_project' => 'analytics_hub', 'efficiency_boost' => 20, 'cost_increase' => 2, 'happiness_boost' => 11, 'is_active' => true, 'upgrade_level' => 6],
            ['tech_project' => 'smart_inventory', 'efficiency_boost' => 24, 'cost_increase' => 5, 'happiness_boost' => 12, 'is_active' => false, 'upgrade_level' => 3],
            ['tech_project' => 'drone_delivery', 'efficiency_boost' => 26, 'cost_increase' => 6, 'happiness_boost' => 9, 'is_active' => false, 'upgrade_level' => 2],
            ['tech_project' => 'eco_energy_grid', 'efficiency_boost' => 17, 'cost_increase' => 2, 'happiness_boost' => 16, 'is_active' => false, 'upgrade_level' => 3],
        ];

        foreach ($innovations as $index => $innovation) {
            AIpreneurInnovation::create([
                'student_id' => $studentId,
                'tech_project' => $innovation['tech_project'],
                'design_image_url' => '/image.png',
                'quiz_answers' => [
                    ['question' => 'What does this tech improve?', 'answer' => 'Shop performance', 'correct' => true],
                    ['question' => 'How will it help customers?', 'answer' => 'Faster and more fun visits', 'correct' => true],
                    ['question' => 'Why is it useful?', 'answer' => 'It saves time and boosts sales', 'correct' => true],
                ],
                'efficiency_boost' => $innovation['efficiency_boost'],
                'cost_increase' => $innovation['cost_increase'],
                'happiness_boost' => $innovation['happiness_boost'],
                'is_active' => $innovation['is_active'],
                'upgrade_level' => $innovation['upgrade_level'],
                'lab_level' => 1,
                'unlocked_at' => $now->copy()->subDays(8 - min($index, 7)),
            ]);
        }
    }

    private function seedDailyStats(string $studentId, $now): void
    {
        $history = [
            ['days_ago' => 6, 'visitors' => 96, 'customers' => 31, 'sales' => 31, 'units' => 44, 'revenue' => 402, 'profit' => 238, 'multiplier' => 2.1],
            ['days_ago' => 5, 'visitors' => 104, 'customers' => 34, 'sales' => 34, 'units' => 47, 'revenue' => 436, 'profit' => 251, 'multiplier' => 2.2],
            ['days_ago' => 4, 'visitors' => 110, 'customers' => 36, 'sales' => 36, 'units' => 50, 'revenue' => 458, 'profit' => 266, 'multiplier' => 2.3],
            ['days_ago' => 3, 'visitors' => 118, 'customers' => 39, 'sales' => 39, 'units' => 52, 'revenue' => 492, 'profit' => 284, 'multiplier' => 2.45],
            ['days_ago' => 2, 'visitors' => 126, 'customers' => 41, 'sales' => 41, 'units' => 55, 'revenue' => 524, 'profit' => 301, 'multiplier' => 2.55],
            ['days_ago' => 1, 'visitors' => 132, 'customers' => 45, 'sales' => 45, 'units' => 59, 'revenue' => 565, 'profit' => 328, 'multiplier' => 2.7],
            ['days_ago' => 0, 'visitors' => 139, 'customers' => 48, 'sales' => 48, 'units' => 63, 'revenue' => 604, 'profit' => 352, 'multiplier' => 2.8],
        ];

        foreach ($history as $row) {
            AIpreneurDailyStats::create([
                'student_id' => $studentId,
                'stat_date' => $now->copy()->subDays($row['days_ago'])->toDateString(),
                'visitors' => $row['visitors'],
                'customers' => $row['customers'],
                'total_sales_count' => $row['sales'],
                'total_units_sold' => $row['units'],
                'total_revenue' => $row['revenue'],
                'total_profit' => $row['profit'],
                'coins_earned' => 0,
                'base_traffic' => 1.0,
                'marketing_boost' => 0.52,
                'innovation_boost' => 0.48,
                'decoration_boost' => 0.3,
                'final_multiplier' => $row['multiplier'],
                'created_at' => $now->copy()->subDays($row['days_ago']),
                'updated_at' => $now->copy()->subDays($row['days_ago']),
            ]);
        }
    }

    private function seedClassBooking(User $parent, GeniusProfile $profile, $now): void
    {
        $slot = AIpreneurClassSlot::query()
            ->with('course')
            ->orderByRaw("CASE WHEN status = 'active' THEN 0 ELSE 1 END")
            ->orderBy('start_time')
            ->first();

        if (!$slot) {
            return;
        }

        AIpreneurClassBooking::create([
            'slot_id' => $slot->id,
            'student_id' => $profile->id,
            'parent_id' => $parent->id,
            'order_id' => 'DEMO-CLASS-' . strtoupper(Str::random(6)),
            'customer_name' => $parent->name,
            'customer_email' => $parent->email,
            'amount' => (float) ($slot->course->price ?? 0),
            'payment_method' => 'demo',
            'payment_status' => 'completed',
            'status' => 'confirmed',
            'paid_at' => $now->copy()->subDays(2),
            'checked_in_at' => $now->copy()->subDay(),
        ]);

        $slot->update([
            'booked_count' => AIpreneurClassBooking::query()->where('slot_id', $slot->id)->count(),
        ]);
    }
}
