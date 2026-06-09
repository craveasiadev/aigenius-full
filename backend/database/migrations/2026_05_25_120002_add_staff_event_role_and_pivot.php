<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Adds the `staff_event` role to the users.role enum and creates the
 * pivot that ties a staff_event user to one or more workshop shops.
 *
 * Existing role enum (from 2026_01_12_100001_create_users_table.php):
 *   enum('student', 'parent', 'teacher', 'master')
 */
return new class extends Migration
{
    public function up(): void
    {
        // Extend the role enum. MySQL ENUM is rewritten on ALTER —
        // safe even for a populated table because we add a value;
        // existing rows untouched.
        DB::statement("
            ALTER TABLE users
            MODIFY COLUMN role
            ENUM('student','parent','teacher','master','staff_event')
            NOT NULL DEFAULT 'student'
        ");

        // Pivot: which workshop_shops a given staff_event user can
        // scan into. A user with no rows here can scan into any active
        // shop (handy for superadmins testing in the field).
        Schema::create('workshop_shop_staff', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->uuid('workshop_shop_id');
            $table->timestamps();

            $table->unique(['user_id', 'workshop_shop_id']);
            $table->foreign('user_id')
                  ->references('id')->on('users')
                  ->cascadeOnDelete();
            $table->foreign('workshop_shop_id')
                  ->references('id')->on('workshop_shops')
                  ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('workshop_shop_staff');

        DB::statement("
            ALTER TABLE users
            MODIFY COLUMN role
            ENUM('student','parent','teacher','master')
            NOT NULL DEFAULT 'student'
        ");
    }
};
