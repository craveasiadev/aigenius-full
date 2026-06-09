<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Generated Chapters Table
     *
     * Stores student's generated storybook content.
     */
    public function up(): void
    {
        Schema::create('generated_chapters', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('student_id');
            $table->string('chapter_code')->nullable();

            // Content
            $table->json('cover')->nullable();
            $table->json('pages')->nullable();
            $table->integer('current_page_index')->default(0);
            $table->boolean('completed')->default(false);

            // Progress tracking
            $table->enum('status', ['not_started', 'in_progress', 'completed'])->default('not_started');
            $table->integer('progress_percentage')->default(0);
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();

            $table->timestamps();

            $table->foreign('student_id')->references('id')->on('genius_profiles')->onDelete('cascade');
            $table->index('student_id');
            $table->index('chapter_code');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('generated_chapters');
    }
};
