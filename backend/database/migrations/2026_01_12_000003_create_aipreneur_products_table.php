<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * AIpreneur Products Table
     *
     * Student-created products with pricing strategies.
     */
    public function up(): void
    {
        Schema::create('aipreneur_products', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('student_id');

            $table->string('product_name');
            $table->text('description')->nullable();
            $table->decimal('price', 10, 2);

            // Positioning Strategy
            $table->string('positioning_strategy'); // premium, volume, marketing, eco, limited, creative, tech, cause

            // Product Image
            $table->string('image_url')->nullable();
            $table->string('image_source')->nullable(); // uploaded, generated

            // Sales Metrics
            $table->integer('units_sold')->default(0);
            $table->decimal('revenue_generated', 12, 2)->default(0);

            $table->timestamps();

            $table->foreign('student_id')->references('id')->on('genius_profiles')->onDelete('cascade');
            $table->index('student_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('aipreneur_products');
    }
};
