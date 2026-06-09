<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('redemptions')) {
            return;
        }

        Schema::table('redemptions', function (Blueprint $table) {
            if (!Schema::hasColumn('redemptions', 'tokens_spent')) {
                $table->integer('tokens_spent')->default(0)->after('status');
            }
            if (!Schema::hasColumn('redemptions', 'item_name_snapshot')) {
                $table->string('item_name_snapshot')->nullable()->after('tokens_spent');
            }
            if (!Schema::hasColumn('redemptions', 'item_price_snapshot')) {
                $table->integer('item_price_snapshot')->default(0)->after('item_name_snapshot');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('redemptions')) {
            return;
        }

        Schema::table('redemptions', function (Blueprint $table) {
            if (Schema::hasColumn('redemptions', 'item_price_snapshot')) {
                $table->dropColumn('item_price_snapshot');
            }
            if (Schema::hasColumn('redemptions', 'item_name_snapshot')) {
                $table->dropColumn('item_name_snapshot');
            }
            if (Schema::hasColumn('redemptions', 'tokens_spent')) {
                $table->dropColumn('tokens_spent');
            }
        });
    }
};

