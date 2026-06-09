<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use InvalidArgumentException;

class SuperAdminOnlySeeder extends Seeder
{
    /**
     * Seed only a superadmin user.
     *
     * Override defaults with:
     * SUPERADMIN_SEED_EMAIL
     * SUPERADMIN_SEED_PASSWORD
     * SUPERADMIN_SEED_NAME
     */
    public function run(): void
    {
        $email = trim((string) env('SUPERADMIN_SEED_EMAIL', 'superadmin@test.com'));
        $password = (string) env('SUPERADMIN_SEED_PASSWORD', 'SuperAdmin123!');
        $name = trim((string) env('SUPERADMIN_SEED_NAME', 'Superadmin'));

        if ($email === '' || $password === '') {
            throw new InvalidArgumentException('SUPERADMIN_SEED_EMAIL and SUPERADMIN_SEED_PASSWORD must not be empty.');
        }

        User::updateOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'role' => 'master',
                'is_superadmin' => true,
                'password_hash' => Hash::make($password),
            ]
        );

        $this->command?->info("Superadmin seeded: {$email}");
    }
}
