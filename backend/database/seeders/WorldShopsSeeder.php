<?php

namespace Database\Seeders;

use App\Models\AIpreneurBusiness;
use App\Models\GeniusProfile;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Seeds a batch of OTHER players' launched shops so the multi-user world
 * system has enough data to populate World 2+ (the home world holds 8
 * others, every world after holds 9, so ~20 shops gives 3 worlds).
 *
 * Idempotent: keyed on a stable `genius_id` per shop, so re-running updates
 * rather than duplicates. These are intentionally lightweight records —
 * just enough for the world feed + preview card (name, owner, image,
 * level, rating). Run with:
 *
 *     php artisan db:seed --class=Database\\Seeders\\WorldShopsSeeder
 */
class WorldShopsSeeder extends Seeder
{
    /** How many other shops to create. Home world holds 8 others, every
     *  world after holds 9, so worlds = 1 + ceil((COUNT - 8) / 9).
     *  60 → 7 worlds to page through in the demo. */
    private const SHOP_COUNT = 60;

    /** Cycled through for variety on the preview cards. */
    private const SHOP_IMAGES = [
        '/assets/shops/shop1.png',
        '/assets/shops/shop2.png',
        '/assets/shops/shop3.png',
        '/assets/shops/shop4.png',
        '/building.png',
    ];

    private const PASSIONS = [
        'ice_cream', 'pets', 'games', 'bakery', 'cars', 'drinks', 'art', 'nature',
    ];

    private const THEMES = [
        'fun', 'modern', 'luxury', 'eco', 'gamer', 'colorful', 'cozy', 'fancy', 'playful',
    ];

    // ── Decoration preset pools (combined for a unique look per shop) ──
    private const EXT_BANNERS = ['banner_neon', 'banner_wood', 'banner_tech', 'banner_classic', 'banner_floral', 'banner_sport', 'banner_candy'];
    private const EXT_WALLS   = ['wall_glass', 'wall_wood', 'wall_paint_pink', 'wall_dark', 'wall_brick', 'wall_stone', 'wall_pastel'];
    private const EXT_LIGHTS  = ['lights_string', 'lights_spot', 'lights_neon', 'lights_lantern', 'lights_fairy'];
    private const INT_WALLS   = ['iwall_sky', 'iwall_cream', 'iwall_mint', 'iwall_peach', 'iwall_lavender', 'iwall_coral', 'iwall_sand'];
    private const INT_FLOORS  = ['ifloor_tile', 'ifloor_wood', 'ifloor_checker', 'ifloor_marble', 'ifloor_grass', 'ifloor_carpet', 'ifloor_stone'];

    /** 60 UNIQUE shop names — no duplicates across any world. Paired with a
     *  varied owner name (owners may repeat; shop names never do). */
    private const SHOPS = [
        ['Frozen Paradise', 'Timmy'],        ['Bark Avenue Cafe', 'Sofia'],
        ['Pixel Arcade', 'Leo'],             ['Sunrise Bakery', 'Maya'],
        ['Turbo Toy Garage', 'Ethan'],       ['Bubble Tea Bay', 'Hana'],
        ['Doodle Art Studio', 'Aiden'],      ['Green Sprout Shop', 'Lily'],
        ['Scoops & Smiles', 'Noah'],         ['Whisker Wonderland', 'Zoe'],
        ['Game Over Lounge', 'Kai'],         ['Sweet Crumb Corner', 'Aria'],
        ['Speedy Wheels', 'Lucas'],          ['Fizz & Pop Drinks', 'Mila'],
        ['Rainbow Canvas', 'Oliver'],        ['Leafy Greens Market', 'Ava'],
        ['Gelato Galaxy', 'Ryan'],           ['Pawfect Pet Stop', 'Emma'],
        ['Joystick Junction', 'Mason'],      ['Muffin Magic', 'Chloe'],
        ['Cosmic Cones', 'Ravi'],            ['Puppy Palace', 'Nadia'],
        ['Retro Realm', 'Jayden'],           ['Crusty Loaf Bakehouse', 'Isla'],
        ['Mega Motors Mini', 'Diego'],       ['Slushie Station', 'Yuki'],
        ['Splatter Studio', 'Omar'],         ['Fern & Petal', 'Grace'],
        ['Sundae Funday', 'Marcus'],         ['Cuddle Critters', 'Priya'],
        ['Level Up Lab', 'Finn'],            ['Honey Bun Bakery', 'Sara'],
        ['Drift Kings', 'Tariq'],            ['Smoothie Splash', 'Elena'],
        ['Brush & Bloom', 'Hugo'],           ['Sprout & Soil', 'Naomi'],
        ['Choco Swirl', 'Bruno'],            ['Feather & Fur', 'Layla'],
        ['Boss Battle Arcade', 'Caleb'],     ['Golden Crust', 'Mei'],
        ['Nitro Garage', 'Andre'],           ['Zest Juice Bar', 'Tara'],
        ['Canvas Dreams', 'Felix'],          ['Wild Garden Co', 'Ingrid'],
        ['Vanilla Sky Treats', 'Pedro'],     ['Happy Tails Hub', 'Rina'],
        ['Pixel Punch', 'Soren'],            ['Maple Morning Bakery', 'Aisha'],
        ['Velocity Motors', 'Kofi'],         ['Citrus Burst', 'Nora'],
        ['Palette Place', 'Dmitri'],         ['Bloom Room', 'Keiko'],
        ['Frosty Cloud', 'Samir'],           ['Paws & Play', 'Bianca'],
        ['Arcade Asylum', 'Theo'],           ['Buttercup Bakehouse', 'Wei'],
        ['Rocket Racers', 'Malik'],          ['Tropic Sip', 'Carmen'],
        ['Color Lab', 'Viktor'],             ['Evergreen Nook', 'Anya'],
    ];

    public function run(): void
    {
        $now = now();

        // A single shared "demo" parent owns all the generated kids — keeps
        // the seeded data easy to find and clean up.
        $parent = User::updateOrCreate(
            ['email' => 'world-shops@aigenius.com.my'],
            [
                'name' => 'World Shops Demo Parent',
                'role' => 'parent',
                'password_hash' => Hash::make('WorldShops123!'),
                'is_superadmin' => false,
            ],
        );

        DB::transaction(function () use ($parent, $now) {
            for ($i = 0; $i < self::SHOP_COUNT; $i++) {
                [$displayName, $ownerName] = self::SHOPS[$i % count(self::SHOPS)];
                $n = $i + 1;
                $geniusId = sprintf('GENIUS-WORLD-%02d', $n);

                // Unique decoration preset per shop. Mixed-radix indexing
                // (each pool advances at a different "digit") guarantees every
                // shop gets a distinct exterior combo — no two are the same.
                $nb = count(self::EXT_BANNERS); // 7
                $nw = count(self::EXT_WALLS);   // 7
                $nl = count(self::EXT_LIGHTS);  // 5  → 7*7*5 = 245 unique combos
                $exterior = [
                    'banner' => self::EXT_BANNERS[$i % $nb],
                    'wall'   => self::EXT_WALLS[intdiv($i, $nb) % $nw],
                    'lights' => self::EXT_LIGHTS[intdiv($i, $nb * $nw) % $nl],
                ];
                $iw = count(self::INT_WALLS);  // 7
                $if = count(self::INT_FLOORS); // 7  → 7*7 = 49, plus theme(9)
                $interior = [
                    'theme'      => self::THEMES[$i % count(self::THEMES)],
                    'wallColor'  => self::INT_WALLS[$i % $iw],
                    'floorColor' => self::INT_FLOORS[intdiv($i, $iw) % $if],
                ];

                $profile = GeniusProfile::updateOrCreate(
                    ['genius_id' => $geniusId],
                    [
                        'parent_id' => $parent->id,
                        'genius_name' => $ownerName,
                        'password_hash' => Hash::make('WorldKid123!'),
                        'gender' => 'other',
                        'age' => 10,
                        'passion_category' => self::PASSIONS[$i % count(self::PASSIONS)],
                        'aipreneur_shop_name' => $displayName,
                        'aipreneur_onboarding_completed' => true,
                        'onboarding_stage' => 'completed',
                    ],
                );

                AIpreneurBusiness::updateOrCreate(
                    ['student_id' => $profile->id],
                    [
                        'shop_theme' => self::THEMES[$i % count(self::THEMES)],
                        'shop_url_slug' => Str::slug($displayName) . '-w' . $n,
                        'shop_image_url' => self::SHOP_IMAGES[($i * 3) % count(self::SHOP_IMAGES)],
                        'shop_image_status' => 'completed',
                        'exterior_config' => $exterior,
                        'interior_config' => $interior,
                        'shop_launched' => true,
                        // Stagger launch dates so the deterministic
                        // created_at ordering produces a stable world order.
                        'launched_at' => $now->copy()->subDays(self::SHOP_COUNT - $i),
                        'popularity_level' => 5 + (($i * 3) % 40),       // Lv 5–44
                        'store_rating' => round(3.5 + (($i % 15) / 10), 1), // 3.5–4.9
                        'store_likes' => 20 + ($i * 17) % 500,
                        'store_visitors' => 100 + ($i * 53) % 2000,
                        'store_reviews_count' => 3 + ($i % 40),
                    ],
                );
            }
        });

        $this->command?->info(sprintf(
            'Seeded %d launched world shops (parent: world-shops@aigenius.com.my).',
            self::SHOP_COUNT,
        ));
        $this->command?->line('That is the home world + extra worlds to page through.');
    }
}
