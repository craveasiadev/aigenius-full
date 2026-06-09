<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('aipreneur_staff', function (Blueprint $table) {
            $table->text('uniform_image_url')->nullable()->after('avatar_url');
            $table->string('uniform_source', 50)->nullable()->after('uniform_image_url');
        });
    }

    public function down(): void
    {
        Schema::table('aipreneur_staff', function (Blueprint $table) {
            $table->dropColumn(['uniform_image_url', 'uniform_source']);
        });
    }
};
