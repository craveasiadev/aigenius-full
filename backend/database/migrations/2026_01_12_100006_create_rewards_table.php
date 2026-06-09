<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Rewards Table
     *
     * Stores student rewards, coins, XP, and badges.
     */
    public function up(): void
    {
        Schema::create('rewards', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('student_id')->unique();

            $table->integer('coins')->default(0);
            $table->integer('xp')->default(0);
            $table->integer('level')->default(1);
            $table->integer('streak_days')->default(0);
            $table->timestamp('last_check_in')->nullable();
            $table->json('badges')->nullable();

            $table->timestamps();

            $table->foreign('student_id')->references('id')->on('genius_profiles')->onDelete('cascade');
            $table->index('student_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rewards');
    }
};
