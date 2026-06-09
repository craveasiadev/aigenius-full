<?php

namespace Tests\Feature;

use App\Models\AIpreneurBusiness;
use App\Models\AIpreneurDailyStats;
use App\Models\AIpreneurProduct;
use App\Models\AIpreneurReward;
use App\Models\GeniusProfile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class AIpreneurSimulatorGuardTest extends TestCase
{
    use RefreshDatabase;

    public function test_record_visitor_requires_launched_shop(): void
    {
        [$profile, $business, $token] = $this->createStudentWithBusiness(launched: false);

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/aipreneur/simulator/visitor');

        $response->assertStatus(403)
            ->assertJsonPath('success', false);

        $business->refresh();
        $this->assertSame(0, (int) ($business->store_visitors ?? 0));
    }

    public function test_record_sale_requires_available_visitor_slot(): void
    {
        [$profile, $business, $token] = $this->createStudentWithBusiness(launched: true);
        $product = $this->createProduct($profile);

        $dailyStats = AIpreneurDailyStats::getOrCreateToday($profile->id);
        $dailyStats->update([
            'visitors' => 0,
            'customers' => 0,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/aipreneur/simulator/sale', [
                'product_id' => $product->id,
                'quantity' => 1,
            ]);

        $response->assertStatus(429)
            ->assertJsonPath('success', false)
            ->assertJsonPath('daily_stats.remaining_convertible_visitors', 0);

        $product->refresh();
        $this->assertSame(0, (int) ($product->units_sold ?? 0));
    }

    public function test_record_sale_consumes_existing_visitor_without_incrementing_total_visitors(): void
    {
        [$profile, $business, $token] = $this->createStudentWithBusiness(launched: true, initialVisitors: 12);
        $product = $this->createProduct($profile);

        $dailyStats = AIpreneurDailyStats::getOrCreateToday($profile->id);
        $dailyStats->update([
            'visitors' => 1,
            'customers' => 0,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/aipreneur/simulator/sale', [
                'product_id' => $product->id,
                'quantity' => 1,
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true);

        $business->refresh();
        $dailyStats->refresh();
        $product->refresh();

        $this->assertSame(12, (int) ($business->store_visitors ?? 0), 'Sale must not auto-increment visitors.');
        $this->assertSame(1, (int) ($dailyStats->visitors ?? 0), 'Daily visitors must remain unchanged by sale.');
        $this->assertSame(1, (int) ($dailyStats->customers ?? 0), 'Sale should increase customers only.');
        $this->assertSame(1, (int) ($product->units_sold ?? 0));
    }

    /**
     * @return array{0:GeniusProfile,1:AIpreneurBusiness,2:string}
     */
    private function createStudentWithBusiness(bool $launched, int $initialVisitors = 0): array
    {
        $profile = GeniusProfile::create([
            'parent_id' => (string) Str::uuid(),
            'genius_id' => 'GENIUS-' . strtoupper(Str::random(8)),
            'genius_name' => 'Simulator Guard Kid',
            'password_hash' => 'password123',
            'aipreneur_onboarding_completed' => true,
        ]);

        $business = AIpreneurBusiness::create([
            'student_id' => $profile->id,
            'shop_theme' => 'test',
            'shop_launched' => $launched,
            'store_visitors' => $initialVisitors,
            'exterior_config' => [
                'wall' => 'wall_brick',
                'banner' => 'banner_plain',
                'lights' => 'lights_none',
            ],
            'interior_config' => [],
        ]);

        AIpreneurReward::create([
            'student_id' => $profile->id,
            'coins' => 0,
            'ai_tokens' => 100,
            'xp' => 0,
            'level' => 1,
        ]);

        $token = $profile->createToken('sim-guard-test')->plainTextToken;

        return [$profile, $business, $token];
    }

    private function createProduct(GeniusProfile $profile): AIpreneurProduct
    {
        return AIpreneurProduct::create([
            'student_id' => $profile->id,
            'product_name' => 'Guard Test Product',
            'description' => 'Test',
            'price' => 10,
            'positioning_strategy' => 'premium',
            'image_source' => 'uploaded',
            'image_status' => null,
            'units_sold' => 0,
            'revenue_generated' => 0,
        ]);
    }
}

