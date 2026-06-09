<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\GeniusProfile;
use App\Models\AIpreneurReward;
use App\Models\AIpreneurBusiness;
use App\Models\AIpreneurClassSlot;
use App\Models\AIpreneurClassBooking;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AIpreneurAcademySeeder extends Seeder
{
    public function run(): void
    {
        // Master admin account
        $admin = User::firstOrCreate(
            ['email' => 'admin@aigenius.com.my'],
            [
                'name' => 'Master Admin',
                'role' => 'master',
                'is_superadmin' => true,
                'password_hash' => Hash::make('Admin123!'),
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $admin->update(['is_superadmin' => true]);

        // Parent account
        $parent = User::firstOrCreate(
            ['email' => 'parent@aigenius.com.my'],
            [
                'name' => 'Demo Parent',
                'role' => 'parent',
                'password_hash' => Hash::make('Parent123!'),
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        // Genius profile
        $genius = GeniusProfile::firstOrCreate(
            ['genius_id' => 'GENIUS-DEMO'],
            [
                'parent_id' => $parent->id,
                'genius_name' => 'Demo Kid',
                'password_hash' => Hash::make('Kid123!'),
                'age' => 10,
                'gender' => 'other',
                'aipreneur_shop_name' => 'Demo Shop',
                'passion_category' => 'ice_cream',
                'aipreneur_onboarding_completed' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        AIpreneurReward::firstOrCreate(
            ['student_id' => $genius->id],
            [
                'coins' => 2500,
                'xp' => 120,
                'level' => 3,
                'current_streak' => 2,
                'longest_streak' => 4,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        AIpreneurBusiness::firstOrCreate(
            ['student_id' => $genius->id],
            [
                'shop_theme' => 'playful',
                'shop_url_slug' => 'demo-shop',
                'shop_image_url' => null,
                'shop_scene_image_url' => null,
                'questionnaire_answers' => [],
                'exterior_config' => [],
                'interior_config' => [],
                'module_product_progress' => 65,
                'module_decorate_progress' => 55,
                'module_operation_progress' => 45,
                'module_marketing_progress' => 40,
                'module_innovation_progress' => 25,
                'module_csr_progress' => 20,
                'total_sales' => 1200,
                'total_costs' => 520,
                'total_profit' => 680,
                'shop_launched' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        $slot = AIpreneurClassSlot::query()->orderBy('start_time')->first();
        if ($slot && !AIpreneurClassBooking::where('student_id', $genius->id)->exists()) {
            AIpreneurClassBooking::create([
                'slot_id' => $slot->id,
                'student_id' => $genius->id,
                'parent_id' => $parent->id,
                'order_id' => 'CLASS-DEMO-' . strtoupper(Str::random(6)),
                'customer_name' => $parent->name,
                'customer_email' => $parent->email,
                'amount' => $slot->course ? $slot->course->price : 0,
                'payment_status' => 'completed',
                'status' => 'confirmed',
                'paid_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $slot->increment('booked_count');
        }
    }
}
