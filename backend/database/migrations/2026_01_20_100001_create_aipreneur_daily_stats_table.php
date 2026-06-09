<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * AIpreneur Daily Stats Table
     *
     * Tracks daily visitors, sales, and earnings for each shop.
     * Enables daily analytics and progress tracking over time.
     */
    public function up(): void
    {
        Schema::create('aipreneur_daily_stats', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('student_id');
            $table->date('stat_date'); // The date these stats are for

            // Visitor tracking
            $table->integer('visitors')->default(0);
            $table->integer('customers')->default(0); // Visitors who made purchases

            // Sales tracking
            $table->integer('total_sales_count')->default(0); // Number of transactions
            $table->integer('total_units_sold')->default(0); // Total items sold
            $table->decimal('total_revenue', 12, 2)->default(0);
            $table->decimal('total_profit', 12, 2)->default(0);

            // Coins earned from sales
            $table->integer('coins_earned')->default(0);

            // Traffic sources (for analytics)
            $table->decimal('base_traffic', 8, 2)->default(1.0); // Base traffic rate
            $table->decimal('marketing_boost', 8, 2)->default(0); // Boost from marketing
            $table->decimal('innovation_boost', 8, 2)->default(0); // Boost from innovations (kiosk, etc.)
            $table->decimal('decoration_boost', 8, 2)->default(0); // Boost from decorations
            $table->decimal('final_multiplier', 8, 2)->default(1.0); // Final calculated multiplier

            $table->timestamps();

            $table->foreign('student_id')->references('id')->on('genius_profiles')->onDelete('cascade');
            $table->unique(['student_id', 'stat_date']); // One record per day per student
            $table->index('student_id');
            $table->index('stat_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('aipreneur_daily_stats');
    }
};
