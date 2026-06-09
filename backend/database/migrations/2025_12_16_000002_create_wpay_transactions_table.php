<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * WPay Transactions Table
     * 
     * This table logs all transactions processed through WPay.
     * 
     * Payment Categories:
     * - topup: Adding funds to wbalance
     * - checkout: Purchasing items from shop
     * 
     * Payment Types:
     * - online: Using Fiuu payment gateway
     * - wbalance: Using existing wallet balance
     * - free: Using bonus until total is RM0
     */
    public function up(): void
    {
        Schema::create('wpay_transactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('wpay_user_id');
            $table->string('email');
            $table->string('order_id')->unique();
            $table->enum('payment_category', ['topup', 'checkout']);
            $table->enum('payment_type', ['online', 'wbalance', 'free']);
            $table->decimal('amount', 12, 2);
            $table->decimal('wbalance_used', 12, 2)->default(0.00);
            $table->decimal('bonus_used', 12, 2)->default(0.00);
            $table->decimal('online_paid', 12, 2)->default(0.00);
            $table->enum('status', ['pending', 'processing', 'success', 'failed', 'cancelled'])->default('pending');

            // For topup transactions
            $table->decimal('topup_amount', 12, 2)->nullable();
            $table->decimal('bonus_awarded', 12, 2)->nullable();
            $table->integer('stars_awarded')->nullable();

            // Fiuu payment details (for online payments)
            $table->string('fiuu_transaction_id')->nullable();
            $table->string('fiuu_status_code')->nullable();
            $table->json('fiuu_response')->nullable();

            // Additional metadata from Bolt
            $table->json('metadata')->nullable();

            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->foreign('wpay_user_id')->references('id')->on('wpay_users')->onDelete('cascade');
            $table->index('order_id');
            $table->index('email');
            $table->index('status');
            $table->index('payment_category');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wpay_transactions');
    }
};
