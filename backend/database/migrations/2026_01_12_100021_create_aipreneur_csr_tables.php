<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * AIpreneur CSR Tables
     *
     * Corporate Social Responsibility tables.
     */
    public function up(): void
    {
        // CSR donations
        Schema::create('aipreneur_csr_donations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('student_id');
            $table->string('cause'); // children, environment, animals, elderly, health, indigenous
            $table->decimal('amount', 12, 2);
            $table->text('message')->nullable();
            $table->integer('impact_points_earned')->default(0);

            $table->timestamps();

            $table->foreign('student_id')->references('id')->on('genius_profiles')->onDelete('cascade');
            $table->index('student_id');
            $table->index('cause');
        });

        // CSR projects
        Schema::create('aipreneur_csr_projects', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('student_id');
            $table->string('project_name');
            $table->text('description')->nullable();
            $table->string('cause');
            $table->decimal('goal_amount', 12, 2)->default(0);
            $table->decimal('raised_amount', 12, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamp('completed_at')->nullable();

            $table->timestamps();

            $table->foreign('student_id')->references('id')->on('genius_profiles')->onDelete('cascade');
            $table->index('student_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('aipreneur_csr_projects');
        Schema::dropIfExists('aipreneur_csr_donations');
    }
};
