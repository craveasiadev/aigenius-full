<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * AIpreneur Classes Table
     *
     * Stores live workshop definitions (content creation, coding, etc.)
     */
    public function up(): void
    {
        Schema::create('aipreneur_classes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('title');
            $table->string('category');
            $table->text('description')->nullable();
            $table->string('level')->default('Beginner');
            $table->decimal('price', 10, 2)->default(0);
            $table->integer('duration_minutes')->default(60);
            $table->string('cover_image_url')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('category');
            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('aipreneur_classes');
    }
};

