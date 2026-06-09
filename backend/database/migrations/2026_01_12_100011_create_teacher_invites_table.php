<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Teacher Invites Table
     *
     * Tracks teacher referral codes.
     */
    public function up(): void
    {
        Schema::create('teacher_invites', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('teacher_id');
            $table->string('code')->unique();
            $table->integer('conversions')->default(0);

            $table->timestamps();

            $table->foreign('teacher_id')->references('id')->on('users')->onDelete('cascade');
            $table->index('teacher_id');
            $table->index('code');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('teacher_invites');
    }
};
