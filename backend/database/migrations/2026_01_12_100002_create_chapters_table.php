<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Chapters Table
     *
     * Available chapter templates for storybook creation.
     */
    public function up(): void
    {
        Schema::create('chapters', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('chapter_code')->unique();
            $table->string('title');
            $table->text('description');
            $table->string('subject');
            $table->string('grade_level');
            $table->integer('page_count');

            // Display fields
            $table->string('display_title')->nullable();
            $table->string('display_subtitle')->nullable();
            $table->text('display_description')->nullable();
            $table->string('display_icon')->nullable();
            $table->string('display_banner_url')->nullable();
            $table->integer('display_order')->default(0);
            $table->string('difficulty_level')->default('beginner');
            $table->integer('estimated_minutes')->default(30);
            $table->json('learning_outcomes')->nullable();
            $table->json('prerequisites')->nullable();
            $table->json('keywords')->nullable();
            $table->string('category')->nullable();
            $table->boolean('is_premium')->default(false);
            $table->boolean('is_active')->default(true);

            $table->timestamps();

            $table->index('chapter_code');
            $table->index('category');
            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chapters');
    }
};
