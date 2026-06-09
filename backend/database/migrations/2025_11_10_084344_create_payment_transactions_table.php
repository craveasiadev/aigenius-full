<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('payment_transactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            // Store UUIDs without foreign keys since customers/products are in Supabase
            $table->uuid('customer_id')->nullable();
            $table->string('product_id')->nullable(); // Can be UUID or string like 'TOPUP-1'
            $table->string('order_id')->unique();
            $table->decimal('amount', 10, 2);
            $table->string('currency', 3)->default('MYR');
            $table->string('payment_method', 50);
            $table->string('payment_channel', 50); // Increased from 10 to 50 for 'TNG-EWALLET'
            $table->enum('status', ['pending', 'completed', 'failed', 'cancelled'])->default('pending');
            $table->string('fiuu_transaction_id')->nullable();
            $table->string('fiuu_status_code', 10)->nullable();
            $table->json('fiuu_response')->nullable();
            $table->timestamp('completed_at')->nullable();

            // ✅ ADD THESE COLUMNS
            $table->uuid('shop_order_id')->nullable();  // Links to Supabase shop_orders.id
            $table->uuid('wallet_transaction_id')->nullable();  // Links to Supabase wallet_transactions.id
            $table->uuid('user_id')->nullable();  // User ID from Supabase
            $table->json('metadata')->nullable();  // Additional data (outlet_slug, etc.)

            $table->timestamps();

            $table->index('order_id');
            $table->index('customer_id');
            $table->index('status');
            $table->index('created_at');
            $table->index('shop_order_id');  // ✅ ADD INDEX
            $table->index('wallet_transaction_id');  // ✅ ADD INDEX
            $table->index('user_id');  // ✅ ADD INDEX
        });
    }

    public function down()
    {
        Schema::dropIfExists('payment_transactions');
    }
};
