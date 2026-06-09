<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Track daily reward claim date separately from streak activity date.
     */
    public function up(): void
    {
        Schema::table('aipreneur_rewards', function (Blueprint $table) {
            if (!Schema::hasColumn('aipreneur_rewards', 'last_daily_claim_date')) {
                $table->date('last_daily_claim_date')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('aipreneur_rewards', function (Blueprint $table) {
            if (Schema::hasColumn('aipreneur_rewards', 'last_daily_claim_date')) {
                $table->dropColumn('last_daily_claim_date');
            }
        });
    }
};
