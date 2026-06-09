<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * workshop_shops — partner shops (Zus, Mamee, KitKat, AirAsia, …)
 * that appear on a student's AIpreneur globe once a workshop staff
 * member scans the student's QR pass. Managed by superadmins via
 * /superadmin/event-workshops.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('workshop_shops', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name', 120);
            $table->string('company_name', 160);
            $table->text('business_nature')->nullable();
            // Path under /storage (public disk) — e.g. workshop-shops/01HKZ.jpg
            $table->string('shop_image_path', 255);
            // JSON array of module ids (cafe, factory, marketing, …)
            $table->json('modules')->nullable();
            $table->boolean('is_active')->default(true);
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Hot path for the public catalog read.
            $table->index('is_active');
            // Admin search.
            $table->index('name');
            $table->index('company_name');
        });

        // Seed the four shops the wp-aigenius client already references
        // by local PNG path so a fresh install has something to show.
        $now = now();
        $seed = [
            [
                'name' => 'Zus Coffee',
                'company_name' => 'Zus Holdings',
                'business_nature' => 'Specialty coffee chain — café service, barista skills, loyalty programs.',
                'shop_image_path' => 'workshop-shops/seed/Zus.png',
                'modules' => json_encode(['cafe', 'marketing']),
                'is_active' => true,
            ],
            [
                'name' => 'Mamee',
                'company_name' => 'Mamee-Double Decker',
                'business_nature' => 'Snack manufacturer — production lines, FMCG distribution, brand mascots.',
                'shop_image_path' => 'workshop-shops/seed/Mamee.png',
                'modules' => json_encode(['factory', 'marketing']),
                'is_active' => true,
            ],
            [
                'name' => 'Jungle Gym',
                'company_name' => 'Jungle Gym Sdn Bhd',
                'business_nature' => 'Kids fitness centre — class scheduling, instructor coaching, membership.',
                'shop_image_path' => 'workshop-shops/seed/junglegym.png',
                'modules' => json_encode(['service', 'operations']),
                'is_active' => true,
            ],
            [
                'name' => 'AirAsia',
                'company_name' => 'AirAsia Group',
                'business_nature' => 'Budget airline — flight ops, customer service, dynamic pricing.',
                'shop_image_path' => 'workshop-shops/seed/airport.png',
                'modules' => json_encode(['logistics', 'operations']),
                'is_active' => true,
            ],
        ];

        $rows = array_map(static function (array $row) use ($now) {
            return array_merge($row, [
                'id' => (string) Str::uuid(),
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }, $seed);

        DB::table('workshop_shops')->insert($rows);
    }

    public function down(): void
    {
        Schema::dropIfExists('workshop_shops');
    }
};
