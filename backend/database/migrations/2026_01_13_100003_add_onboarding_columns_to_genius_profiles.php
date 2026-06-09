<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Add columns for new onboarding flow:
     * - selfie_url: Photo of the student
     * - signboard_url: Hand-drawn signboard for shop
     * - onboarding_stage: Track progress through onboarding
     */
    public function up(): void
    {
        Schema::table('genius_profiles', function (Blueprint $table) {
            // Onboarding media
            $table->string('selfie_url')->nullable()->after('profile_picture_url');
            $table->string('signboard_url')->nullable()->after('selfie_url');

            // Track onboarding progress
            $table->enum('onboarding_stage', [
                'not_started',
                'boss_intro_completed',
                'selfie_completed',
                'signboard_completed',
                'questionnaire_completed',
                'shop_generating',
                'completed'
            ])->default('not_started')->after('aipreneur_onboarding_completed');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('genius_profiles', function (Blueprint $table) {
            $table->dropColumn(['selfie_url', 'signboard_url', 'onboarding_stage']);
        });
    }
};
