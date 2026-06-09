<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * AI Genius Purchases Table
     * Records all AI Token and Coin purchases via Fiuu payment gateway
     */
    public function up(): void
    {
        Schema::create('aigenius_purchases', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('student_id');

            // Order details
            $table->string('order_id')->unique();
            $table->enum('package_type', ['ai_tokens', 'coins']);
            $table->string('package_name');
            $table->integer('package_amount'); // Amount of tokens/coins purchased (including bonus)

            // Payment details
            $table->decimal('amount_paid', 10, 2); // Amount in MYR
            $table->string('payment_method'); // fpx, card, tng, grabpay, boost
            $table->enum('status', ['pending', 'completed', 'failed'])->default('pending');

            // Fiuu transaction details
            $table->string('fiuu_transaction_id')->nullable();
            $table->string('fiuu_status_code')->nullable();
            $table->json('fiuu_response')->nullable();

            // Balance tracking
            $table->integer('balance_before')->default(0);
            $table->integer('balance_after')->default(0);

            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->foreign('student_id')
                ->references('id')
                ->on('genius_profiles')
                ->onDelete('cascade');

            $table->index(['student_id', 'created_at']);
            $table->index(['student_id', 'status']);
            $table->index('order_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('aigenius_purchases');
    }
};
