<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('store_items')) {
            return;
        }

        Schema::table('store_items', function (Blueprint $table) {
            if (!Schema::hasColumn('store_items', 'details')) {
                $table->text('details')->nullable()->after('description');
            }
            if (!Schema::hasColumn('store_items', 'category')) {
                $table->string('category', 32)->default('more')->after('type');
            }
            if (!Schema::hasColumn('store_items', 'image_url')) {
                $table->string('image_url')->nullable()->after('stock');
            }
            if (!Schema::hasColumn('store_items', 'partner')) {
                $table->string('partner', 120)->nullable()->after('image_url');
            }
            if (!Schema::hasColumn('store_items', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('partner');
            }
            if (!Schema::hasColumn('store_items', 'sort_order')) {
                $table->integer('sort_order')->default(0)->after('is_active');
            }
        });

    }

    public function down(): void
    {
        if (!Schema::hasTable('store_items')) {
            return;
        }

        Schema::table('store_items', function (Blueprint $table) {
            if (Schema::hasColumn('store_items', 'sort_order')) {
                $table->dropColumn('sort_order');
            }
            if (Schema::hasColumn('store_items', 'is_active')) {
                $table->dropColumn('is_active');
            }
            if (Schema::hasColumn('store_items', 'partner')) {
                $table->dropColumn('partner');
            }
            if (Schema::hasColumn('store_items', 'image_url')) {
                $table->dropColumn('image_url');
            }
            if (Schema::hasColumn('store_items', 'category')) {
                $table->dropColumn('category');
            }
            if (Schema::hasColumn('store_items', 'details')) {
                $table->dropColumn('details');
            }
        });
    }
};
