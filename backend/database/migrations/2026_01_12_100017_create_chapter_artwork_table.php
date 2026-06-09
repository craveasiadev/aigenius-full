<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Chapter Artwork Table
     *
     * Stores student artwork uploads for chapters.
     */
    public function up(): void
    {
        Schema::create('chapter_artwork', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('student_id');
            $table->string('chapter_id');
            $table->integer('page_number');
            $table->string('image_url');
            $table->text('description')->nullable();
            $table->boolean('completed')->default(false);

            $table->timestamps();

            $table->foreign('student_id')->references('id')->on('genius_profiles')->onDelete('cascade');
            $table->index('student_id');
            $table->index('chapter_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chapter_artwork');
    }
};
