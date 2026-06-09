<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * WPay Users Table
     * 
     * This table stores all user wallet/payment data for the WPay system.
     * Users are identified by their email address.
     * 
     * Tier System:
     * - Bronze: 0 - 299 lifetime topups
     * - Silver: 300 - 999 lifetime topups
     * - Gold: 1000 - 2499 lifetime topups
     * - Platinum: 2500 - 4999 lifetime topups
     * - VIP: 5000+ lifetime topups
     */
    public function up(): void
    {
        Schema::create('wpay_users', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('email')->unique();
            $table->decimal('lifetime_topups', 12, 2)->default(0.00);
            $table->decimal('wbalance', 12, 2)->default(0.00);
            $table->decimal('bonus', 12, 2)->default(0.00);
            $table->integer('stars')->default(0);
            $table->enum('tier_type', ['bronze', 'silver', 'gold', 'platinum', 'vip'])->default('bronze');
            $table->decimal('tier_factor', 5, 2)->default(1.00); // Multiplier for stars earning
            $table->timestamps();

            $table->index('email');
            $table->index('tier_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wpay_users');
    }
};
