<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Activity Feed Table
     *
     * Tracks student activity for the feed.
     */
    public function up(): void
    {
        Schema::create('activity_feed', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('student_id');
            $table->uuid('teacher_id')->nullable();
            $table->enum('action_type', ['page_completed', 'badge_earned', 'artwork_uploaded', 'quiz_completed', 'chapter_started', 'level_up']);
            $table->text('action_description');
            $table->string('icon');

            $table->timestamps();

            $table->foreign('student_id')->references('id')->on('genius_profiles')->onDelete('cascade');
            $table->index('student_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_feed');
    }
};
