<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Move legacy reward coins into AI token balance and zero out coins.
     */
    public function up(): void
    {
        if (!Schema::hasTable('aipreneur_rewards')) {
            return;
        }

        if (!Schema::hasColumn('aipreneur_rewards', 'coins') || !Schema::hasColumn('aipreneur_rewards', 'ai_tokens')) {
            return;
        }

        DB::statement(
            'UPDATE aipreneur_rewards
             SET ai_tokens = COALESCE(ai_tokens, 0) + COALESCE(coins, 0),
                 coins = 0
             WHERE COALESCE(coins, 0) > 0'
        );
    }

    /**
     * Irreversible data migration.
     */
    public function down(): void
    {
        // No-op.
    }
};

