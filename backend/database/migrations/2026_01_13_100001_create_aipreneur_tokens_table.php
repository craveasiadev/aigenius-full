<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Tokens are used for AI image generation (shop images, product images, etc.)
     * Starting amount: 200 tokens
     */
    public function up(): void
    {
        Schema::create('aipreneur_tokens', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('student_id')->unique();

            // Token balances
            $table->integer('tokens')->default(200);           // Current available tokens
            $table->integer('tokens_used')->default(0);        // Total tokens spent lifetime
            $table->integer('tokens_earned')->default(0);      // Bonus tokens earned (quests, achievements)

            $table->timestamps();

            $table->foreign('student_id')
                ->references('id')
                ->on('genius_profiles')
                ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('aipreneur_tokens');
    }
};
