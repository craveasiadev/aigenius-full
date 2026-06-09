<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * AIpreneur Class Bookings Table
     *
     * Stores RSVP + payment status for class slots.
     */
    public function up(): void
    {
        Schema::create('aipreneur_class_bookings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('slot_id');
            $table->uuid('student_id');
            $table->uuid('parent_id')->nullable();
            $table->string('order_id')->unique();
            $table->string('customer_name')->nullable();
            $table->string('customer_email')->nullable();
            $table->decimal('amount', 10, 2)->default(0);
            $table->string('payment_method')->nullable();
            $table->string('payment_status')->default('pending');
            $table->string('status')->default('pending');
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->foreign('slot_id')->references('id')->on('aipreneur_class_slots')->onDelete('cascade');
            $table->foreign('student_id')->references('id')->on('genius_profiles')->onDelete('cascade');
            $table->index(['student_id', 'slot_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('aipreneur_class_bookings');
    }
};

