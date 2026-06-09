<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Story Sessions Table
     *
     * Stores active story generation sessions.
     */
    public function up(): void
    {
        Schema::create('story_sessions', function (Blueprint $table) {
            $table->uuid('session_id')->primary();
            $table->uuid('genius_profile_id')->nullable();
            $table->string('chapter_code');
            $table->string('chapter_title')->nullable();
            $table->string('chapter_theme')->nullable();
            $table->string('genius_name');
            $table->integer('age');
            $table->string('gender')->nullable();

            // Extended fields
            $table->json('persona_traits')->nullable();
            $table->json('learning_goals')->nullable();
            $table->json('interests')->nullable();
            $table->json('previous_choices')->nullable();
            $table->text('story_context')->nullable();

            $table->json('titles')->nullable();
            $table->json('pages')->nullable();

            $table->timestamps();

            $table->foreign('genius_profile_id')->references('id')->on('genius_profiles')->nullOnDelete();
            $table->index('genius_profile_id');
            $table->index('chapter_code');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('story_sessions');
    }
};
