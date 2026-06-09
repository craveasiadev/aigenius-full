<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Chapter Questions Table
     *
     * Stores questions for each chapter.
     */
    public function up(): void
    {
        Schema::create('chapter_questions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('chapter_code');
            $table->integer('question_order');

            $table->text('question_text');
            $table->enum('question_type', ['multiple_choice', 'text', 'drawing', 'selection']);
            $table->json('options')->nullable();
            $table->text('correct_answer')->nullable();

            $table->string('personality_dimension')->nullable();
            $table->json('trait_mappings')->nullable();

            $table->boolean('is_required')->default(true);
            $table->boolean('is_active')->default(true);

            $table->timestamps();

            $table->index('chapter_code');
            $table->index(['chapter_code', 'question_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chapter_questions');
    }
};
