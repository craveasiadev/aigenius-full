<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        try {
            Schema::table('users', function (Blueprint $table): void {
                $table->dropUnique('users_email_unique');
            });
        } catch (\Throwable $exception) {
            // Ignore if already dropped in partial environments.
        }
    }

    public function down(): void
    {
        try {
            Schema::table('users', function (Blueprint $table): void {
                $table->unique('email', 'users_email_unique');
            });
        } catch (\Throwable $exception) {
            // Ignore if index already restored.
        }
    }
};

