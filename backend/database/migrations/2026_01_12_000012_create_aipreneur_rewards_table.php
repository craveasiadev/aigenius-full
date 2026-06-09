<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * AIpreneur Rewards Table
     *
     * Rewards and progression tracking for students.
     */
    public function up(): void
    {
        Schema::create('aipreneur_rewards', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('student_id')->unique();

            $table->integer('coins')->default(100);
            $table->integer('stars')->default(0);
            $table->integer('xp')->default(0);
            $table->integer('level')->default(1);

            // Badges
            $table->json('badges')->nullable();

            // Streaks
            $table->integer('current_streak')->default(0);
            $table->integer('longest_streak')->default(0);
            $table->date('last_activity_date')->nullable();

            $table->timestamps();

            $table->foreign('student_id')->references('id')->on('genius_profiles')->onDelete('cascade');
            $table->index('student_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('aipreneur_rewards');
    }
};
