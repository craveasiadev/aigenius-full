<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('openai_usage_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('user_type', 20)->default('genius');
            $table->uuid('user_id')->nullable();
            $table->string('service', 50);
            $table->string('model', 50)->default('gpt-4o-mini');
            $table->unsignedInteger('prompt_tokens')->default(0);
            $table->unsignedInteger('completion_tokens')->default(0);
            $table->unsignedInteger('total_tokens')->default(0);
            $table->decimal('estimated_cost_usd', 10, 6)->default(0);
            $table->string('purpose', 50)->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index('user_id');
            $table->index('service');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('openai_usage_logs');
    }
};