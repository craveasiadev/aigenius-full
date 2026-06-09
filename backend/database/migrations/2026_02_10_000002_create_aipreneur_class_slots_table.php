<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * AIpreneur Class Slots Table
     *
     * Stores scheduled times for each class.
     */
    public function up(): void
    {
        Schema::create('aipreneur_class_slots', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('class_id');
            $table->dateTime('start_time');
            $table->dateTime('end_time');
            $table->integer('capacity')->default(20);
            $table->integer('booked_count')->default(0);
            $table->string('location')->nullable();
            $table->string('status')->default('open');
            $table->timestamps();

            $table->foreign('class_id')->references('id')->on('aipreneur_classes')->onDelete('cascade');
            $table->index('class_id');
            $table->index('status');
            $table->index('start_time');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('aipreneur_class_slots');
    }
};

