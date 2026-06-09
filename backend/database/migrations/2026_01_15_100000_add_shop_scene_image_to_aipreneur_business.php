<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Add column for second shop image (with scene/background):
     * - shop_image_url: Shop only, transparent PNG (already exists)
     * - shop_scene_image_url: Shop with person and background scene
     */
    public function up(): void
    {
        Schema::table('aipreneur_business', function (Blueprint $table) {
            // Shop scene image (with background and person)
            if (!Schema::hasColumn('aipreneur_business', 'shop_scene_image_url')) {
                $table->string('shop_scene_image_url')->nullable()->after('shop_image_url');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('aipreneur_business', function (Blueprint $table) {
            if (Schema::hasColumn('aipreneur_business', 'shop_scene_image_url')) {
                $table->dropColumn('shop_scene_image_url');
            }
        });
    }
};
