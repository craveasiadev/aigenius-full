<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Assessment Tables
     *
     * Genius assessment quizzes and AI analysis results.
     */
    public function up(): void
    {
        // Assessment quizzes
        Schema::create('assessment_quizzes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('genius_id');
            $table->json('questions')->nullable();
            $table->timestamp('completed_at')->nullable();

            $table->timestamps();

            $table->foreign('genius_id')->references('id')->on('genius_profiles')->onDelete('cascade');
            $table->index('genius_id');
        });

        // AI assessments
        Schema::create('ai_assessments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('genius_id');
            $table->uuid('quiz_id');
            $table->json('strengths')->nullable();
            $table->json('weaknesses')->nullable();
            $table->json('recommendations')->nullable();
            $table->json('selected_priorities')->nullable();
            $table->text('ai_analysis')->nullable();

            $table->timestamps();

            $table->foreign('genius_id')->references('id')->on('genius_profiles')->onDelete('cascade');
            $table->foreign('quiz_id')->references('id')->on('assessment_quizzes')->onDelete('cascade');
            $table->index('genius_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_assessments');
        Schema::dropIfExists('assessment_quizzes');
    }
};
