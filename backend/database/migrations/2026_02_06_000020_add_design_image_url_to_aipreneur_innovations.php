<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add design image URL to innovations.
     */
    public function up(): void
    {
        Schema::table('aipreneur_innovations', function (Blueprint $table) {
            $table->string('design_image_url')->nullable()->after('tech_project');
        });
    }

    public function down(): void
    {
        Schema::table('aipreneur_innovations', function (Blueprint $table) {
            $table->dropColumn('design_image_url');
        });
    }
};
