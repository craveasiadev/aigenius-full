<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Adds columns for AI-generated product images following the shop image pattern.
     */
    public function up(): void
    {
        Schema::table('aipreneur_products', function (Blueprint $table) {
            // Image generation status tracking (same pattern as shop images)
            $table->string('image_status')->nullable()->after('image_source'); // pending, generating, completed, failed
            $table->string('image_error')->nullable()->after('image_status'); // Error message if failed
            $table->text('image_prompt')->nullable()->after('image_error'); // Store AI prompt for reproducibility
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('aipreneur_products', function (Blueprint $table) {
            $table->dropColumn(['image_status', 'image_error', 'image_prompt']);
        });
    }
};
