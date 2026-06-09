<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * AIpreneur Store Analytics Table
     *
     * Public storefront analytics with AI-generated traffic.
     */
    public function up(): void
    {
        Schema::create('aipreneur_store_analytics', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('student_id')->unique();

            // Public Store Info
            $table->string('store_url_slug')->unique();
            $table->string('template_theme'); // fun, modern, luxury, eco, gamer
            $table->boolean('is_live')->default(false);

            // Daily Analytics (AI-generated)
            $table->integer('daily_visitors')->default(10);
            $table->integer('daily_likes')->default(5);
            $table->integer('daily_orders')->default(0);
            $table->decimal('daily_revenue', 12, 2)->default(0);

            // Cumulative
            $table->integer('total_visitors')->default(10);
            $table->integer('total_likes')->default(5);
            $table->integer('total_orders')->default(0);

            // Reviews & Ratings
            $table->json('reviews')->nullable();
            $table->decimal('average_rating', 2, 1)->default(5.0);

            $table->timestamps();

            $table->foreign('student_id')->references('id')->on('genius_profiles')->onDelete('cascade');
            $table->index('student_id');
            $table->index('store_url_slug');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('aipreneur_store_analytics');
    }
};
