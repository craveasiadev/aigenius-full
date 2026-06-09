<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * AIpreneur Decoration Items Table
     *
     * Individual decoration items placed in the shop (grid-based system).
     */
    public function up(): void
    {
        Schema::create('aipreneur_decoration_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('student_id');

            // Item details
            $table->string('item_type'); // floor, wall, furniture, display, decoration, exterior
            $table->string('item_name');
            $table->json('item_config')->nullable();

            // Position (for grid-based placement)
            $table->string('zone')->nullable(); // entrance, cashier, display-left, window
            $table->integer('position_x')->nullable();
            $table->integer('position_y')->nullable();

            // Status
            $table->boolean('is_active')->default(true);

            $table->timestamps();

            $table->foreign('student_id')->references('id')->on('genius_profiles')->onDelete('cascade');
            $table->index('student_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('aipreneur_decoration_items');
    }
};
