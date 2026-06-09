<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * AIpreneur Campaigns Table
     *
     * Marketing campaigns with multi-channel support.
     */
    public function up(): void
    {
        Schema::create('aipreneur_campaigns', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('student_id');

            $table->string('campaign_name');
            $table->string('marketing_goal');
            $table->string('color_style')->nullable();

            // Channels
            $table->json('channels')->nullable(); // school, social_media, magazine, friends, video
            $table->integer('budget_coins');

            // Results
            $table->integer('reach')->default(0);
            $table->integer('likes')->default(0);
            $table->integer('new_visitors')->default(0);
            $table->decimal('profit_generated', 12, 2)->default(0);
            $table->decimal('roi', 8, 2)->default(0);

            $table->timestamp('launched_at')->useCurrent();
            $table->timestamps();

            $table->foreign('student_id')->references('id')->on('genius_profiles')->onDelete('cascade');
            $table->index('student_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('aipreneur_campaigns');
    }
};
