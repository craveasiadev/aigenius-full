<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Transaction ledger for coins and tokens.
     * Tracks all financial activities in the AIpreneur system.
     */
    public function up(): void
    {
        Schema::create('aipreneur_transactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('student_id');

            // Transaction type
            $table->enum('type', ['income', 'expense']);

            // Category for tracking
            $table->enum('category', [
                // Income categories
                'product_sale',
                'campaign_reward',
                'quest_reward',
                'daily_bonus',
                'achievement_bonus',
                'starting_bonus',
                // Expense categories
                'staff_salary',
                'decoration',
                'marketing',
                'innovation',
                'token_purchase',
                'ai_generation'
            ]);

            // Transaction details
            $table->string('description');
            $table->integer('amount')->default(0);              // Coins amount (positive for income, positive for expense)
            $table->integer('tokens')->nullable();              // Token amount if applicable
            $table->integer('coin_balance_after')->default(0);  // Running coin balance
            $table->integer('token_balance_after')->nullable(); // Running token balance if applicable

            // Metadata for additional context
            $table->json('metadata')->nullable();

            $table->timestamps();

            $table->foreign('student_id')
                ->references('id')
                ->on('genius_profiles')
                ->onDelete('cascade');

            // Index for faster queries
            $table->index(['student_id', 'created_at']);
            $table->index(['student_id', 'type']);
            $table->index(['student_id', 'category']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('aipreneur_transactions');
    }
};
