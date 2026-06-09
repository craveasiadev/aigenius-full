<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * AI Settings Tables
     *
     * AI configuration and usage logging.
     */
    public function up(): void
    {
        // AI settings
        Schema::create('ai_settings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('setting_key')->unique();
            $table->text('setting_value')->nullable();
            $table->enum('setting_type', ['api_key', 'text_model', 'image_model', 'config']);
            $table->text('description')->nullable();
            $table->uuid('updated_by')->nullable();

            $table->timestamps();

            $table->index('setting_key');
        });

        // AI usage logs
        Schema::create('ai_usage_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->enum('service_type', ['gpt4', 'gpt4-turbo', 'dalle', 'dalle3']);
            $table->integer('prompt_tokens')->default(0);
            $table->integer('completion_tokens')->default(0);
            $table->decimal('total_cost', 10, 6)->default(0);
            $table->uuid('genius_id')->nullable();
            $table->enum('purpose', ['assessment', 'story_generation', 'benefits_analysis', 'questionnaire_generation', 'image_generation']);

            $table->timestamps();

            $table->foreign('genius_id')->references('id')->on('genius_profiles')->nullOnDelete();
            $table->index('genius_id');
            $table->index('purpose');
            $table->index('created_at');
        });

        // Token usage counter
        Schema::create('user_token_usage', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('user_id')->unique();
            $table->integer('total_tokens')->default(0);
            $table->integer('prompt_tokens')->default(0);
            $table->integer('completion_tokens')->default(0);
            $table->timestamp('last_updated')->nullable();

            $table->timestamps();

            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_token_usage');
        Schema::dropIfExists('ai_usage_logs');
        Schema::dropIfExists('ai_settings');
    }
};
