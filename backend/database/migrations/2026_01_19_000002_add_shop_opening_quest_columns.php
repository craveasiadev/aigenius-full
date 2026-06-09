<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Adds columns for shop opening quest system and staff behavior traits.
     */
    public function up(): void
    {
        // Business table - quest and traffic tracking
        Schema::table('aipreneur_business', function (Blueprint $table) {
            // Shop opening quest system
            $table->json('opening_checklist')->nullable()->after('shop_launched'); // Track individual quest items
            $table->boolean('ribbon_cutting_completed')->default(false)->after('opening_checklist');
            $table->timestamp('ribbon_cutting_at')->nullable()->after('ribbon_cutting_completed');

            // Marketing integration - traffic modifiers
            $table->float('traffic_multiplier')->default(1.0)->after('ribbon_cutting_at'); // Boosted by active campaigns
            $table->timestamp('traffic_boost_expires_at')->nullable()->after('traffic_multiplier');
        });

        // Staff table - behavior traits from interviews
        Schema::table('aipreneur_staff', function (Blueprint $table) {
            // Behavior traits derived from interview/personality
            $table->json('behavior_traits')->nullable()->after('personality'); // lazy, energetic, star_employee, thief, etc.
            $table->float('speed_modifier')->default(1.0)->after('behavior_traits'); // 0.5 = slow (lazy), 1.5 = fast (energetic)
            $table->float('efficiency_modifier')->default(1.0)->after('speed_modifier'); // Affects customer satisfaction/sales
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('aipreneur_business', function (Blueprint $table) {
            $table->dropColumn([
                'opening_checklist',
                'ribbon_cutting_completed',
                'ribbon_cutting_at',
                'traffic_multiplier',
                'traffic_boost_expires_at'
            ]);
        });

        Schema::table('aipreneur_staff', function (Blueprint $table) {
            $table->dropColumn(['behavior_traits', 'speed_modifier', 'efficiency_modifier']);
        });
    }
};
