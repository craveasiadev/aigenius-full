<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * AIpreneur Interviews Table
     *
     * History of NPC interviews for staff hiring decisions.
     */
    public function up(): void
    {
        Schema::create('aipreneur_interviews', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('student_id');

            // NPC details
            $table->string('npc_name');
            $table->string('npc_avatar_url')->nullable();
            $table->json('npc_personality')->nullable(); // traits, skills, quirks

            // Interview flow
            $table->json('questions_asked')->nullable();
            $table->json('responses')->nullable();

            // Decision
            $table->string('decision')->nullable(); // hired, passed, pending
            $table->string('hired_role')->nullable(); // If hired, what role?

            $table->timestamps();

            $table->foreign('student_id')->references('id')->on('genius_profiles')->onDelete('cascade');
            $table->index('student_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('aipreneur_interviews');
    }
};
