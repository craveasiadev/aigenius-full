<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * AIpreneur Staff Table
     *
     * Staff members with mood and energy tracking.
     */
    public function up(): void
    {
        Schema::create('aipreneur_staff', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('student_id');

            $table->string('staff_role'); // cashier, chef, cleaner, greeter, stock_manager, security
            $table->string('staff_name');
            $table->string('avatar_url')->nullable();
            $table->integer('mood')->default(70);
            $table->integer('energy')->default(80);
            $table->decimal('salary', 10, 2)->default(50);
            $table->json('skills')->nullable();
            $table->json('hobbies')->nullable();
            $table->string('personality')->nullable();

            // Interview tracking
            $table->uuid('interview_id')->nullable();
            $table->boolean('was_interviewed')->default(false);

            // Event Tracking
            $table->string('last_event')->nullable();
            $table->timestamp('last_event_date')->nullable();

            $table->timestamps();

            $table->foreign('student_id')->references('id')->on('genius_profiles')->onDelete('cascade');
            $table->unique(['student_id', 'staff_role']);
            $table->index('student_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('aipreneur_staff');
    }
};
