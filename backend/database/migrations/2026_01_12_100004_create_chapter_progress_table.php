<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Chapter Progress Table
     *
     * Tracks individual student progress for each chapter.
     */
    public function up(): void
    {
        Schema::create('chapter_progress', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('student_id');
            $table->string('chapter_code');

            $table->integer('current_step')->default(0);
            $table->integer('total_steps')->default(0);
            $table->integer('progress_percentage')->default(0);

            $table->enum('status', ['not_started', 'in_progress', 'completed'])->default('not_started');
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('last_activity_at')->nullable();

            $table->timestamps();

            $table->foreign('student_id')->references('id')->on('genius_profiles')->onDelete('cascade');
            $table->unique(['student_id', 'chapter_code']);
            $table->index('student_id');
            $table->index('chapter_code');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chapter_progress');
    }
};
