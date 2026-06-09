<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Add columns for AI-generated shop image:
     * - shop_image_status: Generation status (pending, generating, completed, failed)
     * - shop_image_error: Error message if generation failed
     * - shop_vibe: Shop vibe/theme from questionnaire
     * - shop_colors: Selected colors from questionnaire
     * - shop_usp: Unique selling point from questionnaire
     *
     * Note: shop_image_url already exists in the table
     */
    public function up(): void
    {
        Schema::table('aipreneur_business', function (Blueprint $table) {
            // Shop image generation status (shop_image_url already exists)
            if (!Schema::hasColumn('aipreneur_business', 'shop_image_status')) {
                $table->enum('shop_image_status', [
                    'pending',
                    'generating',
                    'completed',
                    'failed'
                ])->nullable()->after('shop_image_url');
            }

            if (!Schema::hasColumn('aipreneur_business', 'shop_image_error')) {
                $table->text('shop_image_error')->nullable()->after('shop_image_status');
            }

            // Store questionnaire answers for shop generation
            if (!Schema::hasColumn('aipreneur_business', 'shop_vibe')) {
                $table->string('shop_vibe')->nullable()->after('shop_image_error');
            }

            if (!Schema::hasColumn('aipreneur_business', 'shop_colors')) {
                $table->json('shop_colors')->nullable()->after('shop_vibe');
            }

            if (!Schema::hasColumn('aipreneur_business', 'shop_usp')) {
                $table->string('shop_usp')->nullable()->after('shop_colors');
            }

            // Store original selfie and signboard URLs used for generation
            if (!Schema::hasColumn('aipreneur_business', 'selfie_used_url')) {
                $table->string('selfie_used_url')->nullable()->after('shop_usp');
            }

            if (!Schema::hasColumn('aipreneur_business', 'signboard_used_url')) {
                $table->string('signboard_used_url')->nullable()->after('selfie_used_url');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('aipreneur_business', function (Blueprint $table) {
            $columns = [
                'shop_image_status',
                'shop_image_error',
                'shop_vibe',
                'shop_colors',
                'shop_usp',
                'selfie_used_url',
                'signboard_used_url'
            ];

            foreach ($columns as $column) {
                if (Schema::hasColumn('aipreneur_business', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
