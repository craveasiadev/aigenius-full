<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * AIpreneur Influencer Campaigns Table
     *
     * Influencer marketing campaigns with simulated results.
     */
    public function up(): void
    {
        Schema::create('aipreneur_influencer_campaigns', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('student_id');

            // Influencer details
            $table->string('influencer_name');
            $table->string('influencer_avatar_url')->nullable();
            $table->string('influencer_tier')->nullable(); // nano, micro, mid, macro, mega
            $table->string('influencer_niche')->nullable(); // gaming, food, fashion
            $table->integer('follower_count')->default(0);

            // Campaign details
            $table->string('campaign_type')->nullable(); // post, story, reel, review, collab
            $table->integer('cost_coins');

            // Results
            $table->integer('reach')->default(0);
            $table->integer('engagement')->default(0);
            $table->integer('new_visitors')->default(0);
            $table->decimal('sales_generated', 12, 2)->default(0);

            // Timing
            $table->timestamp('started_at')->useCurrent();
            $table->timestamp('ended_at')->nullable();

            // Status
            $table->string('status')->default('active'); // pending, active, completed, cancelled

            $table->timestamps();

            $table->foreign('student_id')->references('id')->on('genius_profiles')->onDelete('cascade');
            $table->index('student_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('aipreneur_influencer_campaigns');
    }
};
