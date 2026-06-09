<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add remember_token column to genius_profiles table for student auth.
     */
    public function up(): void
    {
        Schema::table('genius_profiles', function (Blueprint $table) {
            if (!Schema::hasColumn('genius_profiles', 'remember_token')) {
                $table->string('remember_token', 100)->nullable()->after('password_hash');
            }
        });
    }

    public function down(): void
    {
        Schema::table('genius_profiles', function (Blueprint $table) {
            $table->dropColumn('remember_token');
        });
    }
};
