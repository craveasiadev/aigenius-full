<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fambox_sessions', function (Blueprint $table) {
            $table->id();
            $table->string('session_id')->unique(); // UUID for public URLs
            $table->string('original_image_path')->nullable();
            $table->string('generated_image_path')->nullable();
            $table->string('theme')->nullable();
            $table->string('status')->default('new'); // new, uploaded, processing, completed, failed
            $table->text('error_message')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fambox_sessions');
    }
};
