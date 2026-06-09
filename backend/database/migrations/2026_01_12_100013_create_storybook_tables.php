<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Storybook Tables
     *
     * Storybook templates and personalized storybooks.
     */
    public function up(): void
    {
        // Storybook templates
        Schema::create('storybook_templates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('title');
            $table->string('icon')->default('book');
            $table->string('one_liner');
            $table->text('description');
            $table->json('focus_areas')->nullable();
            $table->json('activities')->nullable();
            $table->json('creative_outputs')->nullable();
            $table->string('reward_badge');
            $table->string('grade_level')->default('5-12');
            $table->boolean('is_active')->default(true);

            $table->timestamps();

            $table->index('is_active');
        });

        // Personalized storybooks
        Schema::create('personalized_storybooks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('genius_id');
            $table->uuid('template_id');
            $table->string('title');
            $table->json('personalized_benefits')->nullable();
            $table->json('questionnaire_responses')->nullable();
            $table->json('story_content')->nullable();
            $table->integer('current_page')->default(1);
            $table->boolean('completed')->default(false);
            $table->boolean('badge_earned')->default(false);
            $table->timestamp('completed_at')->nullable();

            $table->timestamps();

            $table->foreign('genius_id')->references('id')->on('genius_profiles')->onDelete('cascade');
            $table->foreign('template_id')->references('id')->on('storybook_templates');
            $table->index('genius_id');
            $table->index('template_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('personalized_storybooks');
        Schema::dropIfExists('storybook_templates');
    }
};
