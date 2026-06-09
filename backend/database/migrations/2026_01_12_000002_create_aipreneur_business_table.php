<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * AIpreneur Business Table
     *
     * Core business metrics and module progress for each student.
     */
    public function up(): void
    {
        Schema::create('aipreneur_business', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('student_id')->unique();

            // Business Identity
            $table->string('shop_theme')->nullable(); // fun, modern, luxury, eco, gamer, colorful, cozy, fancy, playful
            $table->string('shop_url_slug')->unique()->nullable();
            $table->string('shop_image_url')->nullable();

            // Questionnaire data
            $table->json('questionnaire_answers')->nullable();
            $table->json('exterior_config')->nullable();
            $table->json('interior_config')->nullable();
            $table->string('age_group')->nullable(); // kids, teens

            // Module Progress (0-100 for each)
            $table->integer('module_product_progress')->default(0);
            $table->integer('module_decorate_progress')->default(0);
            $table->integer('module_operation_progress')->default(0);
            $table->integer('module_marketing_progress')->default(0);
            $table->integer('module_innovation_progress')->default(0);
            $table->integer('module_csr_progress')->default(0);

            // Financial Metrics
            $table->decimal('total_sales', 12, 2)->default(0);
            $table->decimal('total_costs', 12, 2)->default(0);
            $table->decimal('total_profit', 12, 2)->default(0);

            // Launch Status
            $table->boolean('shop_launched')->default(false);
            $table->timestamp('launched_at')->nullable();

            // CSR Settings
            $table->integer('charity_percentage')->default(10);
            $table->string('selected_cause')->nullable(); // children, environment, animals, elderly, health, indigenous
            $table->decimal('total_donated', 12, 2)->default(0);
            $table->integer('impact_points')->default(0);

            // Staff Overall Mood (affects sales)
            $table->integer('staff_overall_mood')->default(70);

            // Store Stats
            $table->integer('store_visitors')->default(0);
            $table->integer('store_likes')->default(0);
            $table->integer('store_reviews_count')->default(0);
            $table->decimal('store_rating', 2, 1)->default(5.0);

            // Gamification
            $table->string('current_quest')->nullable();
            $table->integer('streak_days')->default(0);
            $table->date('last_activity_date')->nullable();

            $table->timestamps();

            $table->foreign('student_id')->references('id')->on('genius_profiles')->onDelete('cascade');
            $table->index('student_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('aipreneur_business');
    }
};
