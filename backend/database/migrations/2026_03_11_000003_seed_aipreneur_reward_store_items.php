<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        if (!DB::getSchemaBuilder()->hasTable('store_items')) {
            return;
        }

        $existingCount = (int) DB::table('store_items')->count();
        if ($existingCount > 0) {
            return;
        }

        $now = now();

        $items = [
            [
                'name' => 'Entrance Ticket (1 Pax)',
                'description' => 'Single-entry WonderPark access.',
                'details' => 'Perfect for a quick solo adventure day.',
                'type' => 'ticket',
                'category' => 'theme_park',
                'price_coins' => 600,
                'stock' => 120,
                'image_url' => '/assets/8%20-%20AiPreneur%20WP%20Promo/1-Entrance-Ticket-for-1.jpg',
                'partner' => 'WonderPark',
                'is_active' => true,
                'sort_order' => 1,
            ],
            [
                'name' => 'Family Pass + Meals',
                'description' => '4 tickets + 4 meals bundle.',
                'details' => 'Family bundle with full-day park fun.',
                'type' => 'ticket',
                'category' => 'theme_park',
                'price_coins' => 2200,
                'stock' => 60,
                'image_url' => '/assets/8%20-%20AiPreneur%20WP%20Promo/2-Family-Pass-4tic4meal.jpg',
                'partner' => 'WonderPark',
                'is_active' => true,
                'sort_order' => 2,
            ],
            [
                'name' => 'RM5 RedBus Voucher',
                'description' => 'Travel discount voucher.',
                'details' => 'Use during checkout for selected routes.',
                'type' => 'voucher',
                'category' => 'travel',
                'price_coins' => 250,
                'stock' => 200,
                'image_url' => '/assets/8%20-%20AiPreneur%20WP%20Promo/3-RM5discountvoucherredbus.jpg',
                'partner' => 'RedBus',
                'is_active' => true,
                'sort_order' => 3,
            ],
            [
                'name' => 'RM5 Watson Voucher',
                'description' => 'Health & beauty savings.',
                'details' => 'Voucher for participating Watson stores.',
                'type' => 'voucher',
                'category' => 'beauty',
                'price_coins' => 250,
                'stock' => 200,
                'image_url' => '/assets/8%20-%20AiPreneur%20WP%20Promo/4-RM5discountvoucherwatson.jpg',
                'partner' => 'Watson',
                'is_active' => true,
                'sort_order' => 4,
            ],
            [
                'name' => 'Medical Checkup Voucher',
                'description' => 'Basic health screening offer.',
                'details' => 'Great wellness reward for your family.',
                'type' => 'voucher',
                'category' => 'health',
                'price_coins' => 850,
                'stock' => 90,
                'image_url' => '/assets/8%20-%20AiPreneur%20WP%20Promo/5-medicalcheckupvoucher.jpg',
                'partner' => 'Healthcare Partner',
                'is_active' => true,
                'sort_order' => 5,
            ],
            [
                'name' => 'Homestay Voucher',
                'description' => 'Staycation discount reward.',
                'details' => 'Redeem for selected homestay listings.',
                'type' => 'voucher',
                'category' => 'travel',
                'price_coins' => 1400,
                'stock' => 50,
                'image_url' => '/assets/8%20-%20AiPreneur%20WP%20Promo/6-homestay.jpg',
                'partner' => 'Travel Partner',
                'is_active' => true,
                'sort_order' => 6,
            ],
            [
                'name' => 'Goldsand 2H1M Free',
                'description' => 'Special activity package.',
                'details' => 'Includes 2 hours + 1 meal package.',
                'type' => 'voucher',
                'category' => 'more',
                'price_coins' => 1200,
                'stock' => 70,
                'image_url' => '/assets/8%20-%20AiPreneur%20WP%20Promo/7-goldsand2h1mfree.jpg',
                'partner' => 'Goldsand',
                'is_active' => true,
                'sort_order' => 7,
            ],
            [
                'name' => 'Aquaria Discount Voucher',
                'description' => 'Aquaria ticket discount.',
                'details' => 'Save more on your next ocean adventure.',
                'type' => 'voucher',
                'category' => 'theme_park',
                'price_coins' => 700,
                'stock' => 100,
                'image_url' => '/assets/8%20-%20AiPreneur%20WP%20Promo/8-aquariadiscountvoucher.jpg',
                'partner' => 'Aquaria',
                'is_active' => true,
                'sort_order' => 8,
            ],
            [
                'name' => 'Legoland Discount Voucher',
                'description' => 'Theme park savings deal.',
                'details' => 'Lower ticket cost for selected entries.',
                'type' => 'voucher',
                'category' => 'theme_park',
                'price_coins' => 950,
                'stock' => 85,
                'image_url' => '/assets/8%20-%20AiPreneur%20WP%20Promo/9-legolanddiscountvoucher.jpg',
                'partner' => 'Legoland',
                'is_active' => true,
                'sort_order' => 9,
            ],
            [
                'name' => 'KFC Voucher',
                'description' => 'Food redemption voucher.',
                'details' => 'Enjoy a meal with token redemption.',
                'type' => 'voucher',
                'category' => 'food',
                'price_coins' => 400,
                'stock' => 150,
                'image_url' => '/assets/8%20-%20AiPreneur%20WP%20Promo/10-kfcvoucher.jpg',
                'partner' => 'KFC',
                'is_active' => true,
                'sort_order' => 10,
            ],
        ];

        foreach ($items as $item) {
            DB::table('store_items')->insert([
                'id' => (string) Str::uuid(),
                'name' => $item['name'],
                'description' => $item['description'],
                'details' => $item['details'],
                'type' => $item['type'],
                'category' => $item['category'],
                'price_coins' => $item['price_coins'],
                'stock' => $item['stock'],
                'image_url' => $item['image_url'],
                'partner' => $item['partner'],
                'is_active' => $item['is_active'],
                'sort_order' => $item['sort_order'],
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        if (!DB::getSchemaBuilder()->hasTable('store_items')) {
            return;
        }

        $names = [
            'Entrance Ticket (1 Pax)',
            'Family Pass + Meals',
            'RM5 RedBus Voucher',
            'RM5 Watson Voucher',
            'Medical Checkup Voucher',
            'Homestay Voucher',
            'Goldsand 2H1M Free',
            'Aquaria Discount Voucher',
            'Legoland Discount Voucher',
            'KFC Voucher',
        ];

        DB::table('store_items')->whereIn('name', $names)->delete();
    }
};

