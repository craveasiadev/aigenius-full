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
        Schema::create('aipreneur_pricing_packages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code')->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->enum('package_type', ['ai_tokens'])->default('ai_tokens');
            $table->unsignedInteger('tokens_amount');
            $table->unsignedInteger('bonus_tokens')->default(0);
            $table->decimal('price_rm', 10, 2);
            $table->decimal('original_price_rm', 10, 2)->nullable();
            $table->enum('badge', ['none', 'popular', 'best_value'])->default('none');
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();

            $table->index(['is_active', 'sort_order']);
        });

        $now = now();
        $defaultPackages = [
            [
                'code' => 'tokens_starter',
                'name' => 'Starter Pack',
                'description' => 'Great for first-time explorers.',
                'package_type' => 'ai_tokens',
                'tokens_amount' => 180,
                'bonus_tokens' => 0,
                'price_rm' => 5.90,
                'original_price_rm' => null,
                'badge' => 'none',
                'is_active' => true,
                'sort_order' => 1,
            ],
            [
                'code' => 'tokens_standard',
                'name' => 'Adventurer Pack',
                'description' => 'Most popular balance of value and volume.',
                'package_type' => 'ai_tokens',
                'tokens_amount' => 520,
                'bonus_tokens' => 80,
                'price_rm' => 14.90,
                'original_price_rm' => 19.90,
                'badge' => 'popular',
                'is_active' => true,
                'sort_order' => 2,
            ],
            [
                'code' => 'tokens_premium',
                'name' => 'Warrior Pack',
                'description' => 'Larger bundle for frequent creators.',
                'package_type' => 'ai_tokens',
                'tokens_amount' => 1300,
                'bonus_tokens' => 250,
                'price_rm' => 29.90,
                'original_price_rm' => 43.90,
                'badge' => 'none',
                'is_active' => true,
                'sort_order' => 3,
            ],
            [
                'code' => 'tokens_ultimate',
                'name' => 'Champion Pack',
                'description' => 'Best value for heavy usage.',
                'package_type' => 'ai_tokens',
                'tokens_amount' => 3000,
                'bonus_tokens' => 900,
                'price_rm' => 54.90,
                'original_price_rm' => 86.90,
                'badge' => 'best_value',
                'is_active' => true,
                'sort_order' => 4,
            ],
        ];

        $rows = array_map(static function (array $row) use ($now) {
            return array_merge($row, [
                'id' => (string) Str::uuid(),
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }, $defaultPackages);

        DB::table('aipreneur_pricing_packages')->insert($rows);
    }

    public function down(): void
    {
        Schema::dropIfExists('aipreneur_pricing_packages');
    }
};
