<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * AIpreneur Marketing Assets Table
     *
     * Student-created marketing materials (banners, billboards, social posts).
     */
    public function up(): void
    {
        Schema::create('aipreneur_marketing_assets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('student_id');

            // Asset details
            $table->string('asset_type'); // banner, billboard, social_post, flyer, video
            $table->string('asset_name')->nullable();
            $table->string('asset_url')->nullable();
            $table->json('asset_config')->nullable(); // colors, text, layout

            // Placement
            $table->string('placement')->nullable(); // shop-front, highway-1, instagram

            // Status
            $table->boolean('is_active')->default(true);
            $table->integer('impressions')->default(0);
            $table->integer('clicks')->default(0);

            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->foreign('student_id')->references('id')->on('genius_profiles')->onDelete('cascade');
            $table->index('student_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('aipreneur_marketing_assets');
    }
};
