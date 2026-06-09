<?php

namespace Tests\Feature;

use App\Models\AIpreneurBusiness;
use App\Models\AIpreneurReward;
use App\Models\GeniusProfile;
use App\Models\SystemConfig;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class AIpreneurBusinessDecorationGuardTest extends TestCase
{
    use RefreshDatabase;

    public function test_update_business_uses_free_exterior_unlock_before_spending_tokens(): void
    {
        [$profile, $business, $rewards, $token] = $this->createStudentWithBusinessAndRewards(
            aiTokens: 50,
            freeExteriorChangesUsed: 0,
            purchasedItems: []
        );

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/aipreneur/business', [
                'exterior_config' => [
                    'wall' => 'wall_glass',
                ],
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('unlock_context.ai_tokens_spent', 0)
            ->assertJsonPath('unlock_context.free_unlocks_used', 1);

        $business->refresh();
        $rewards->refresh();

        $this->assertSame('wall_glass', $business->exterior_config['wall'] ?? null);
        $this->assertSame(50, (int) $rewards->ai_tokens, 'Free unlock should not spend tokens.');

        $economyMeta = $business->interior_config['economy_meta'] ?? [];
        $this->assertSame(1, (int) ($economyMeta['free_exterior_changes_used'] ?? -1));
        $this->assertContains('wall_glass', $economyMeta['purchased_items'] ?? []);
    }

    public function test_update_business_spends_tokens_for_paid_unlock_when_free_changes_are_exhausted(): void
    {
        [$profile, $business, $rewards, $token] = $this->createStudentWithBusinessAndRewards(
            aiTokens: 100,
            freeExteriorChangesUsed: 3,
            purchasedItems: []
        );

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/aipreneur/business', [
                'exterior_config' => [
                    'wall' => 'wall_glass',
                ],
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('unlock_context.ai_tokens_spent', 30)
            ->assertJsonPath('unlock_context.free_unlocks_used', 0);

        $business->refresh();
        $rewards->refresh();

        $this->assertSame('wall_glass', $business->exterior_config['wall'] ?? null);
        $this->assertSame(70, (int) $rewards->ai_tokens, 'Paid unlock should deduct 30 AI tokens.');

        $this->assertDatabaseHas('aipreneur_transactions', [
            'student_id' => $profile->id,
            'type' => 'expense',
            'category' => 'decoration',
            'tokens' => 30,
        ]);
    }

    public function test_update_business_rejects_unowned_paid_equip_when_tokens_are_insufficient(): void
    {
        [$profile, $business, $rewards, $token] = $this->createStudentWithBusinessAndRewards(
            aiTokens: 10,
            freeExteriorChangesUsed: 3,
            purchasedItems: []
        );

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/aipreneur/business', [
                'exterior_config' => [
                    'wall' => 'wall_glass',
                ],
            ]);

        $response->assertStatus(400)
            ->assertJsonPath('success', false);

        $business->refresh();
        $rewards->refresh();

        $this->assertSame('wall_brick', $business->exterior_config['wall'] ?? null, 'Unpaid equip must be rejected.');
        $this->assertSame(10, (int) $rewards->ai_tokens, 'Token balance must remain unchanged on rejection.');

        $this->assertDatabaseMissing('aipreneur_transactions', [
            'student_id' => $profile->id,
            'type' => 'expense',
            'category' => 'decoration',
            'tokens' => 30,
        ]);
    }

    public function test_tampered_economy_meta_cannot_bypass_paid_unlock_cost(): void
    {
        [$profile, $business, $rewards, $token] = $this->createStudentWithBusinessAndRewards(
            aiTokens: 30,
            freeExteriorChangesUsed: 3,
            purchasedItems: []
        );

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/aipreneur/business', [
                'exterior_config' => [
                    'wall' => 'wall_glass',
                ],
                'interior_config' => [
                    'economy_meta' => [
                        'version' => 999,
                        'free_exterior_changes_used' => 0,
                        'purchased_items' => ['wall_glass', 'wall_dark', 'lights_neon'],
                    ],
                ],
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('unlock_context.ai_tokens_spent', 30);

        $business->refresh();
        $rewards->refresh();

        $this->assertSame(0, (int) $rewards->ai_tokens, 'Tampered purchased_items must not bypass token spend.');

        $economyMeta = $business->interior_config['economy_meta'] ?? [];
        $this->assertContains('wall_glass', $economyMeta['purchased_items'] ?? []);
        $this->assertNotContains('wall_dark', $economyMeta['purchased_items'] ?? [], 'Server must sanitize fake owned items.');
        $this->assertNotContains('lights_neon', $economyMeta['purchased_items'] ?? [], 'Server must sanitize fake owned items.');
    }

    public function test_update_business_unlocks_paid_exterior_for_free_when_superadmin_override_is_enabled(): void
    {
        SystemConfig::create([
            'config_key' => 'aipreneur_free_access_exterior_decorations',
            'config_value' => true,
            'description' => 'Allow paid exterior decoration unlocks for free.',
            'category' => 'gameplay',
            'data_type' => 'boolean',
            'default_value' => false,
            'updated_at' => now(),
        ]);

        [$profile, $business, $rewards, $token] = $this->createStudentWithBusinessAndRewards(
            aiTokens: 0,
            freeExteriorChangesUsed: 3,
            purchasedItems: []
        );

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->putJson('/aipreneur/business', [
                'exterior_config' => [
                    'wall' => 'wall_glass',
                ],
            ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('unlock_context.ai_tokens_spent', 0)
            ->assertJsonPath('unlock_context.admin_free_access', true);

        $business->refresh();
        $rewards->refresh();

        $this->assertSame('wall_glass', $business->exterior_config['wall'] ?? null);
        $this->assertSame(0, (int) $rewards->ai_tokens, 'Admin free-access should not spend tokens.');

        $economyMeta = $business->interior_config['economy_meta'] ?? [];
        $this->assertSame(3, (int) ($economyMeta['free_exterior_changes_used'] ?? -1), 'Admin free-access should not consume free-change allowance.');
        $this->assertContains('wall_glass', $economyMeta['purchased_items'] ?? []);
    }

    /**
     * @return array{0:GeniusProfile,1:AIpreneurBusiness,2:AIpreneurReward,3:string}
     */
    private function createStudentWithBusinessAndRewards(
        int $aiTokens,
        int $freeExteriorChangesUsed,
        array $purchasedItems
    ): array {
        $profile = GeniusProfile::create([
            'parent_id' => (string) Str::uuid(),
            'genius_id' => 'GENIUS-' . strtoupper(Str::random(8)),
            'genius_name' => 'Test Kid',
            'password_hash' => 'password123',
            'aipreneur_onboarding_completed' => true,
        ]);

        $business = AIpreneurBusiness::create([
            'student_id' => $profile->id,
            'shop_theme' => 'test',
            'exterior_config' => [
                'wall' => 'wall_brick',
                'banner' => 'banner_plain',
                'lights' => 'lights_none',
            ],
            'interior_config' => [
                'economy_meta' => [
                    'version' => 1,
                    'free_exterior_changes_used' => $freeExteriorChangesUsed,
                    'purchased_items' => $purchasedItems,
                    'updated_at' => now()->toIso8601String(),
                ],
            ],
        ]);

        $rewards = AIpreneurReward::create([
            'student_id' => $profile->id,
            'coins' => 0,
            'ai_tokens' => $aiTokens,
            'xp' => 0,
            'level' => 1,
        ]);

        $token = $profile->createToken('feature-test')->plainTextToken;

        return [$profile, $business, $rewards, $token];
    }
}
