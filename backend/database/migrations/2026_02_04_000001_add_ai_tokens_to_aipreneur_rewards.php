<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add AI Tokens column to aipreneur_rewards table
     * AI Tokens are purchased with real money via Fiuu payment gateway
     */
    public function up(): void
    {
        Schema::table('aipreneur_rewards', function (Blueprint $table) {
            $table->integer('ai_tokens')->default(0)->after('coins');
        });
    }

    public function down(): void
    {
        Schema::table('aipreneur_rewards', function (Blueprint $table) {
            $table->dropColumn('ai_tokens');
        });
    }
};
