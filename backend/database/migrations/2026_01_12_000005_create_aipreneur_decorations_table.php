<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * AIpreneur Decorations Table
     *
     * Store decorations affecting customer behavior.
     */
    public function up(): void
    {
        Schema::create('aipreneur_decorations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('student_id');

            // Theme Selection
            $table->string('mood_theme'); // fun_colorful, eco_natural, modern_clean, cute_cozy, futuristic_techy, holiday_travel, luxury_premium, retro_vintage
            $table->string('decoration_focus')->nullable(); // furniture, art, lights
            $table->decimal('happiness_boost', 5, 2)->default(0);
            $table->decimal('price_willingness_multiplier', 5, 2)->default(1.0);
            $table->integer('uniqueness_score')->default(0);
            $table->decimal('cost', 10, 2)->default(0);

            $table->timestamp('applied_at')->useCurrent();
            $table->timestamps();

            $table->foreign('student_id')->references('id')->on('genius_profiles')->onDelete('cascade');
            $table->index('student_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('aipreneur_decorations');
    }
};
