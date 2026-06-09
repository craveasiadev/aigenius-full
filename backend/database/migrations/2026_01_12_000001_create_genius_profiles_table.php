<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Genius Profiles Table
     *
     * Stores child profiles for the AIGenius platform.
     * Each profile belongs to a parent user.
     */
    public function up(): void
    {
        Schema::create('genius_profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('parent_id'); // Reference to parent user in Supabase auth

            // Login credentials
            $table->string('genius_id')->unique(); // e.g., GENIUS-ABC123
            $table->string('genius_name');
            $table->string('password_hash');

            // Profile info
            $table->enum('gender', ['male', 'female', 'other'])->nullable();
            $table->date('date_of_birth')->nullable();
            $table->string('profile_picture_url')->nullable();
            $table->integer('age')->nullable();

            // Persona quiz
            $table->boolean('persona_quiz_completed')->default(false);
            $table->timestamp('persona_quiz_date')->nullable();

            // AIpreneur onboarding
            $table->string('passion_category')->nullable(); // ice_cream, pets, games, bakery, cars, drinks, art, nature
            $table->string('aipreneur_shop_name')->nullable();
            $table->boolean('aipreneur_onboarding_completed')->default(false);

            // Authentication token
            $table->string('remember_token', 100)->nullable();

            $table->timestamps();

            $table->index('parent_id');
            $table->index('genius_id');
            $table->index('aipreneur_onboarding_completed');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('genius_profiles');
    }
};
