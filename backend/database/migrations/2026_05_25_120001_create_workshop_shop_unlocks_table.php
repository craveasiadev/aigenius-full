<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * workshop_shop_unlocks — one row per (student × workshop_shop) scan.
 * The student's globe carousel reads this table to know which partner
 * shops to render.
 *
 * Composite unique keeps re-scanning the same pair idempotent.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('workshop_shop_unlocks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            // genius_profiles.id is UUID — student identifier.
            $table->uuid('student_id');
            $table->uuid('workshop_shop_id');
            // The staff user who scanned. Null when admin grants
            // manually (e.g. seeding or migration).
            $table->uuid('scanned_by_user_id')->nullable();
            $table->timestamp('scanned_at')->useCurrent();
            $table->timestamps();
            $table->softDeletes();

            // Hot path: "which shops appear on this student's globe?"
            $table->index(['student_id', 'scanned_at']);
            // Idempotency — same student × same shop = one row.
            $table->unique(['student_id', 'workshop_shop_id']);
            // Foreign keys with cascade so a shop or student delete
            // cleans up downstream automatically.
            $table->foreign('student_id')
                  ->references('id')->on('genius_profiles')
                  ->cascadeOnDelete();
            $table->foreign('workshop_shop_id')
                  ->references('id')->on('workshop_shops')
                  ->cascadeOnDelete();
            $table->foreign('scanned_by_user_id')
                  ->references('id')->on('users')
                  ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('workshop_shop_unlocks');
    }
};
