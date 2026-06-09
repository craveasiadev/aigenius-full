<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * AIpreneur Orders Table
     *
     * Simulated customer orders for learning fulfillment.
     */
    public function up(): void
    {
        Schema::create('aipreneur_orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('student_id');
            $table->uuid('product_id');

            $table->string('customer_name');
            $table->decimal('order_amount', 12, 2);
            $table->decimal('charity_donation', 12, 2)->default(0);

            $table->enum('order_status', ['pending', 'packed', 'shipped', 'delivered'])->default('pending');

            $table->timestamp('ordered_at')->useCurrent();
            $table->timestamp('fulfilled_at')->nullable();

            $table->timestamps();

            $table->foreign('student_id')->references('id')->on('genius_profiles')->onDelete('cascade');
            $table->foreign('product_id')->references('id')->on('aipreneur_products')->onDelete('cascade');
            $table->index('student_id');
            $table->index('product_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('aipreneur_orders');
    }
};
