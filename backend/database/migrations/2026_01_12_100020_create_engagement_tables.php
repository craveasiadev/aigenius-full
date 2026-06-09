<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Engagement Tables
     *
     * Events, challenges, life events, market trends, and seasonal content.
     */
    public function up(): void
    {
        // Events catalog
        Schema::create('events_catalog', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('event_code')->unique();
            $table->string('event_name');
            $table->text('description');
            $table->enum('event_type', ['seasonal', 'random', 'market', 'special', 'community']);

            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->boolean('is_recurring')->default(false);
            $table->string('recurrence_pattern')->nullable();
            $table->integer('duration_days')->default(7);

            $table->integer('target_age_min')->nullable();
            $table->integer('target_age_max')->nullable();
            $table->string('required_module')->nullable();

            $table->decimal('impact_sales_multiplier', 3, 2)->default(1.0);
            $table->decimal('impact_traffic_multiplier', 3, 2)->default(1.0);
            $table->integer('impact_mood_change')->default(0);
            $table->decimal('impact_cost_multiplier', 3, 2)->default(1.0);

            $table->integer('reward_coins')->default(0);
            $table->string('reward_badge')->nullable();
            $table->string('reward_unlock')->nullable();

            $table->string('image_url')->nullable();
            $table->text('notification_text')->nullable();

            $table->boolean('is_active')->default(true);
            $table->integer('priority')->default(0);

            $table->timestamps();

            $table->index('event_type');
            $table->index('is_active');
            $table->index(['start_date', 'end_date']);
        });

        // Active events
        Schema::create('active_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('student_id');
            $table->uuid('event_id');

            $table->timestamp('started_at')->useCurrent();
            $table->timestamp('expires_at');

            $table->boolean('is_completed')->default(false);
            $table->timestamp('completed_at')->nullable();
            $table->integer('progress_percentage')->default(0);

            $table->integer('times_viewed')->default(0);
            $table->json('actions_taken')->nullable();

            $table->boolean('reward_claimed')->default(false);
            $table->json('outcome_data')->nullable();

            $table->timestamps();

            $table->foreign('student_id')->references('id')->on('genius_profiles')->onDelete('cascade');
            $table->foreign('event_id')->references('id')->on('events_catalog')->onDelete('cascade');
            $table->index('student_id');
        });

        // Challenges catalog
        Schema::create('challenges_catalog', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('challenge_code')->unique();
            $table->string('challenge_name');
            $table->text('description');
            $table->enum('challenge_type', ['daily', 'weekly', 'monthly', 'achievement']);

            $table->enum('difficulty', ['easy', 'medium', 'hard', 'expert']);
            $table->integer('estimated_duration_minutes')->nullable();

            $table->string('required_module')->nullable();
            $table->integer('required_level')->default(1);
            $table->json('requirements')->nullable();

            $table->integer('reward_coins');
            $table->integer('reward_experience')->default(0);
            $table->string('reward_badge')->nullable();
            $table->decimal('streak_bonus_multiplier', 3, 2)->default(1.0);

            $table->string('learning_topic')->nullable();
            $table->text('learning_objective')->nullable();
            $table->text('hint_text')->nullable();

            $table->integer('target_age_min')->nullable();
            $table->integer('target_age_max')->nullable();

            $table->boolean('is_active')->default(true);
            $table->integer('rotation_priority')->default(0);

            $table->timestamps();

            $table->index('challenge_type');
            $table->index('is_active');
        });

        // Student challenges
        Schema::create('student_challenges', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('student_id');
            $table->uuid('challenge_id');

            $table->timestamp('assigned_at')->useCurrent();
            $table->timestamp('expires_at')->nullable();

            $table->enum('status', ['active', 'completed', 'expired', 'skipped'])->default('active');
            $table->integer('progress_current')->default(0);
            $table->integer('progress_target');
            $table->integer('progress_percentage')->default(0);

            $table->timestamp('completed_at')->nullable();
            $table->integer('time_taken_minutes')->nullable();
            $table->boolean('reward_claimed')->default(false);

            $table->boolean('is_streak_challenge')->default(false);
            $table->integer('streak_day')->nullable();

            $table->json('challenge_data')->nullable();

            $table->timestamps();

            $table->foreign('student_id')->references('id')->on('genius_profiles')->onDelete('cascade');
            $table->foreign('challenge_id')->references('id')->on('challenges_catalog')->onDelete('cascade');
            $table->index('student_id');
        });

        // Life events catalog
        Schema::create('life_events_catalog', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('event_code')->unique();
            $table->string('event_name');
            $table->enum('event_category', ['staff', 'customer', 'shop', 'supplier', 'community']);

            $table->text('description');
            $table->text('scenario_text');
            $table->string('character_name')->nullable();
            $table->string('character_role')->nullable();

            $table->decimal('trigger_probability', 3, 2)->default(0.1);
            $table->integer('cooldown_days')->default(7);

            $table->json('choices');

            $table->boolean('requires_staff')->default(false);
            $table->string('requires_module')->nullable();
            $table->integer('min_business_age_days')->default(0);

            $table->boolean('is_active')->default(true);
            $table->text('educational_value')->nullable();

            $table->timestamps();

            $table->index('event_category');
            $table->index('is_active');
        });

        // Student life events
        Schema::create('student_life_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('student_id');
            $table->uuid('event_id');

            $table->timestamp('triggered_at')->useCurrent();
            $table->timestamp('expires_at')->nullable();

            $table->enum('status', ['pending', 'resolved', 'expired'])->default('pending');
            $table->string('choice_selected')->nullable();
            $table->timestamp('resolved_at')->nullable();

            $table->json('outcome_applied')->nullable();
            $table->integer('coins_change')->default(0);
            $table->integer('mood_change')->default(0);

            $table->text('reflection_text')->nullable();
            $table->boolean('viewed')->default(false);

            $table->timestamps();

            $table->foreign('student_id')->references('id')->on('genius_profiles')->onDelete('cascade');
            $table->foreign('event_id')->references('id')->on('life_events_catalog')->onDelete('cascade');
            $table->index('student_id');
        });

        // Market trends
        Schema::create('market_trends', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('trend_code')->unique();
            $table->string('trend_name');
            $table->text('description')->nullable();

            $table->date('start_date');
            $table->date('end_date');
            $table->date('peak_date')->nullable();

            $table->json('affected_categories')->nullable();
            $table->decimal('popularity_multiplier', 3, 2)->default(1.0);
            $table->decimal('price_tolerance_change', 3, 2)->default(0);

            $table->json('target_age_groups')->nullable();
            $table->json('geographic_regions')->nullable();

            $table->boolean('is_active')->default(true);
            $table->boolean('auto_generated')->default(false);

            $table->timestamps();

            $table->index(['start_date', 'end_date']);
            $table->index('is_active');
        });

        // Seasonal content
        Schema::create('seasonal_content', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('content_code')->unique();
            $table->string('content_name');
            $table->enum('content_type', ['decoration', 'product', 'theme', 'badge', 'challenge']);
            $table->enum('season', ['spring', 'summer', 'fall', 'winter', 'holiday', 'special']);

            $table->date('available_start');
            $table->date('available_end');
            $table->boolean('is_recurring_yearly')->default(true);

            $table->json('content_data');
            $table->integer('unlock_cost')->default(0);

            $table->string('image_url')->nullable();
            $table->string('icon')->nullable();
            $table->string('theme_color')->nullable();

            $table->integer('required_level')->default(1);
            $table->string('required_module')->nullable();

            $table->boolean('is_active')->default(true);
            $table->boolean('featured')->default(false);

            $table->timestamps();

            $table->index(['available_start', 'available_end']);
            $table->index('content_type');
            $table->index('is_active');
        });

        // System config
        Schema::create('system_config', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('config_key')->unique();
            $table->json('config_value');
            $table->text('description')->nullable();
            $table->enum('category', ['events', 'challenges', 'life_events', 'rewards', 'gameplay', 'engagement']);
            $table->enum('data_type', ['boolean', 'number', 'string', 'json']);
            $table->json('default_value')->nullable();

            $table->timestamp('updated_at')->nullable();
            $table->uuid('updated_by')->nullable();

            $table->index('category');
        });

        // Student engagement stats
        Schema::create('student_engagement_stats', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('student_id')->unique();

            $table->integer('current_streak_days')->default(0);
            $table->integer('longest_streak_days')->default(0);
            $table->date('last_active_date')->nullable();

            $table->integer('total_challenges_completed')->default(0);
            $table->integer('daily_challenges_completed')->default(0);
            $table->integer('weekly_challenges_completed')->default(0);
            $table->integer('monthly_challenges_completed')->default(0);

            $table->integer('total_events_participated')->default(0);
            $table->integer('total_events_completed')->default(0);

            $table->integer('total_life_events_resolved')->default(0);

            $table->integer('total_sessions')->default(0);
            $table->integer('total_time_minutes')->default(0);
            $table->decimal('average_session_minutes', 8, 2)->default(0);

            $table->date('last_challenge_date')->nullable();
            $table->date('last_event_date')->nullable();
            $table->date('last_life_event_date')->nullable();

            $table->timestamps();

            $table->foreign('student_id')->references('id')->on('genius_profiles')->onDelete('cascade');
            $table->index('student_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_engagement_stats');
        Schema::dropIfExists('system_config');
        Schema::dropIfExists('seasonal_content');
        Schema::dropIfExists('market_trends');
        Schema::dropIfExists('student_life_events');
        Schema::dropIfExists('life_events_catalog');
        Schema::dropIfExists('student_challenges');
        Schema::dropIfExists('challenges_catalog');
        Schema::dropIfExists('active_events');
        Schema::dropIfExists('events_catalog');
    }
};
