<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * AIpreneur Innovations Table
     *
     * Technology upgrades and innovations.
     */
    public function up(): void
    {
        Schema::create('aipreneur_innovations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('student_id');

            $table->string('tech_project'); // robot_staff, self_service_kiosks, smart_payment, auto_inventory, cleaning_robot, voice_assistant, ai_brain, cloud_manager, app_sync, eco_energy
            $table->json('quiz_answers')->nullable();
            $table->decimal('efficiency_boost', 5, 2)->default(0);
            $table->decimal('cost_increase', 5, 2)->default(0);
            $table->decimal('happiness_boost', 5, 2)->default(0);
            $table->integer('lab_level')->default(1);

            $table->timestamp('unlocked_at')->useCurrent();
            $table->timestamps();

            $table->foreign('student_id')->references('id')->on('genius_profiles')->onDelete('cascade');
            $table->index('student_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('aipreneur_innovations');
    }
};
