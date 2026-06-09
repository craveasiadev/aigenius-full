<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Product;

class ProductSeeder extends Seeder
{
    public function run()
    {
        // The Product model was renamed/removed in this branch.
        // Skip gracefully so the rest of the seed chain still runs.
        if (!class_exists(Product::class)) {
            if (isset($this->command)) {
                $this->command->warn('ProductSeeder skipped: App\\Models\\Product not found.');
            }
            return;
        }

        $products = [
            [
                'name' => 'Starter',
                'description' => 'Perfect for beginners',
                'price' => 29.99,
                'is_active' => true,
            ],
            [
                'name' => 'Professional',
                'description' => 'Best for professionals',
                'price' => 79.99,
                'is_active' => true,
            ],
            [
                'name' => 'Business',
                'description' => 'Ideal for businesses',
                'price' => 149.99,
                'is_active' => true,
            ],
            [
                'name' => 'Enterprise',
                'description' => 'For large organizations',
                'price' => 299.99,
                'is_active' => true,
            ],
        ];

        foreach ($products as $product) {
            Product::create($product);
        }
    }
}