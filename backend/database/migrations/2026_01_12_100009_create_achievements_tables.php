<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Achievements Tables
     *
     * Achievement definitions and student progress.
     */
    public function up(): void
    {
        // Achievements catalog
        Schema::create('achievements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->text('description');
            $table->string('icon');
            $table->string('icon_color');
            $table->integer('requirement');
            $table->enum('requirement_type', ['chapters', 'pages', 'coins', 'streak', 'level']);

            $table->timestamps();
        });

        // Student achievements
        Schema::create('student_achievements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('student_id');
            $table->uuid('achievement_id');
            $table->integer('progress')->default(0);
            $table->boolean('completed')->default(false);
            $table->timestamp('completed_at')->nullable();

            $table->timestamps();

            $table->foreign('student_id')->references('id')->on('genius_profiles')->onDelete('cascade');
            $table->foreign('achievement_id')->references('id')->on('achievements')->onDelete('cascade');
            $table->unique(['student_id', 'achievement_id']);
            $table->index('student_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_achievements');
        Schema::dropIfExists('achievements');
    }
};
