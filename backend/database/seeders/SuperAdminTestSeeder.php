<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class SuperAdminTestSeeder extends Seeder
{
    /**
     * Test superadmin login account:
     * Email: superadmin@test.com
     * Password: SuperAdmin123!
     */
    public function run(): void
    {
        $user = User::updateOrCreate(
            ['email' => 'superadmin@test.com'],
            [
                'name' => 'Superadmin Test',
                'role' => 'master',
                'is_superadmin' => true,
                'password_hash' => Hash::make('SuperAdmin123!'),
            ]
        );

        if (!$user->is_superadmin) {
            $user->is_superadmin = true;
            $user->save();
        }
    }
}
