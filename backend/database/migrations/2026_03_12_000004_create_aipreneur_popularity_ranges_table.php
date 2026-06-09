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
        Schema::create('aipreneur_popularity_ranges', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->unsignedInteger('min_popularity');
            $table->unsignedInteger('max_popularity');
            $table->unsignedInteger('daily_visitors');
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();

            $table->index(['is_active', 'sort_order']);
            $table->index(['min_popularity', 'max_popularity']);
        });

        $now = now();
        $defaults = [
            ['min_popularity' => 1, 'max_popularity' => 5, 'daily_visitors' => 3, 'sort_order' => 10],
            ['min_popularity' => 6, 'max_popularity' => 10, 'daily_visitors' => 4, 'sort_order' => 20],
            ['min_popularity' => 11, 'max_popularity' => 15, 'daily_visitors' => 5, 'sort_order' => 30],
            ['min_popularity' => 16, 'max_popularity' => 20, 'daily_visitors' => 6, 'sort_order' => 40],
            ['min_popularity' => 21, 'max_popularity' => 25, 'daily_visitors' => 7, 'sort_order' => 50],
            ['min_popularity' => 26, 'max_popularity' => 30, 'daily_visitors' => 8, 'sort_order' => 60],
            ['min_popularity' => 31, 'max_popularity' => 40, 'daily_visitors' => 10, 'sort_order' => 70],
            ['min_popularity' => 41, 'max_popularity' => 50, 'daily_visitors' => 12, 'sort_order' => 80],
            ['min_popularity' => 51, 'max_popularity' => 60, 'daily_visitors' => 14, 'sort_order' => 90],
            ['min_popularity' => 61, 'max_popularity' => 70, 'daily_visitors' => 16, 'sort_order' => 100],
            ['min_popularity' => 71, 'max_popularity' => 80, 'daily_visitors' => 18, 'sort_order' => 110],
            ['min_popularity' => 81, 'max_popularity' => 90, 'daily_visitors' => 20, 'sort_order' => 120],
            ['min_popularity' => 91, 'max_popularity' => 100, 'daily_visitors' => 22, 'sort_order' => 130],
        ];

        $rows = array_map(static function (array $row) use ($now) {
            return array_merge($row, [
                'id' => (string) Str::uuid(),
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }, $defaults);

        DB::table('aipreneur_popularity_ranges')->insert($rows);
    }

    public function down(): void
    {
        Schema::dropIfExists('aipreneur_popularity_ranges');
    }
};
