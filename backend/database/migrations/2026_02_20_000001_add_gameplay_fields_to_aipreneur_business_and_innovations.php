<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add gameplay balancing fields for popularity, daily limits, and innovation management.
     */
    public function up(): void
    {
        Schema::table('aipreneur_business', function (Blueprint $table) {
            if (!Schema::hasColumn('aipreneur_business', 'popularity_level')) {
                $table->decimal('popularity_level', 5, 2)->default(20)->after('staff_overall_mood');
            }

            if (!Schema::hasColumn('aipreneur_business', 'last_csr_action_date')) {
                $table->date('last_csr_action_date')->nullable()->after('last_activity_date');
            }

            if (!Schema::hasColumn('aipreneur_business', 'last_finance_game_date')) {
                $table->date('last_finance_game_date')->nullable()->after('last_csr_action_date');
            }
        });

        Schema::table('aipreneur_innovations', function (Blueprint $table) {
            if (!Schema::hasColumn('aipreneur_innovations', 'is_active')) {
                $table->boolean('is_active')->default(false)->after('happiness_boost');
            }

            if (!Schema::hasColumn('aipreneur_innovations', 'upgrade_level')) {
                $table->unsignedTinyInteger('upgrade_level')->default(1)->after('is_active');
            }
        });
    }

    public function down(): void
    {
        Schema::table('aipreneur_business', function (Blueprint $table) {
            if (Schema::hasColumn('aipreneur_business', 'last_finance_game_date')) {
                $table->dropColumn('last_finance_game_date');
            }

            if (Schema::hasColumn('aipreneur_business', 'last_csr_action_date')) {
                $table->dropColumn('last_csr_action_date');
            }

            if (Schema::hasColumn('aipreneur_business', 'popularity_level')) {
                $table->dropColumn('popularity_level');
            }
        });

        Schema::table('aipreneur_innovations', function (Blueprint $table) {
            if (Schema::hasColumn('aipreneur_innovations', 'upgrade_level')) {
                $table->dropColumn('upgrade_level');
            }

            if (Schema::hasColumn('aipreneur_innovations', 'is_active')) {
                $table->dropColumn('is_active');
            }
        });
    }
};
