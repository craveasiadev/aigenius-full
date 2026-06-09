<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Persona Tables
     *
     * Child persona quiz responses and profiles.
     */
    public function up(): void
    {
        // Persona responses
        Schema::create('child_persona_responses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->json('questions_asked')->nullable();
            $table->json('answers')->nullable();
            $table->timestamp('completed_at')->nullable();

            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('genius_profiles')->onDelete('cascade');
            $table->index('user_id');
            $table->index('completed_at');
        });

        // Persona profiles
        Schema::create('child_persona_profile', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id')->unique();
            $table->uuid('response_id')->nullable();

            $table->json('strengths')->nullable();
            $table->json('growth_areas')->nullable();
            $table->string('learning_style')->default('balanced');
            $table->json('fun_facts')->nullable();
            $table->json('trait_scores')->nullable();

            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('genius_profiles')->onDelete('cascade');
            $table->foreign('response_id')->references('id')->on('child_persona_responses')->nullOnDelete();
            $table->index('user_id');
        });

        // Persona evolution tracking
        Schema::create('persona_evolution', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('genius_id');

            // Source tracking
            $table->string('source_type'); // quiz, activity, feedback, milestone
            $table->string('source_reference')->nullable();
            $table->text('insight_text')->nullable();
            $table->json('trait_changes')->nullable();
            $table->json('new_interests')->nullable();
            $table->json('milestone_achieved')->nullable();

            // Summary for display
            $table->string('evolution_title')->nullable();
            $table->text('evolution_description')->nullable();
            $table->string('evolution_icon')->nullable();

            $table->boolean('is_featured')->default(false);
            $table->boolean('parent_notified')->default(false);

            $table->timestamps();

            $table->foreign('genius_id')->references('id')->on('genius_profiles')->onDelete('cascade');
            $table->index('genius_id');
            $table->index('is_featured');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('persona_evolution');
        Schema::dropIfExists('child_persona_profile');
        Schema::dropIfExists('child_persona_responses');
    }
};
