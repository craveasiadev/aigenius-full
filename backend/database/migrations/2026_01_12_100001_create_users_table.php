<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Users Table
     *
     * Core users table for parents, teachers, and admins.
     * Students use genius_profiles table instead.
     */
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('email')->unique();
            $table->string('password_hash');
            $table->string('name');
            $table->enum('role', ['student', 'parent', 'teacher', 'master']);
            $table->uuid('teacher_id')->nullable();
            $table->json('parent_ids')->nullable();

            // Persona quiz fields
            $table->boolean('persona_quiz_completed')->default(false);
            $table->timestamp('persona_quiz_date')->nullable();

            // Parent-specific fields
            $table->string('phone_number')->nullable();
            $table->string('country_code')->nullable();
            $table->string('location')->nullable();
            $table->integer('age')->nullable();
            $table->string('grade')->nullable();
            $table->string('city')->nullable();
            $table->string('state')->nullable();
            $table->string('referral_code')->nullable();

            // Authentication token
            $table->string('remember_token', 100)->nullable();

            $table->timestamps();

            $table->index('email');
            $table->index('role');
            $table->index('teacher_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
