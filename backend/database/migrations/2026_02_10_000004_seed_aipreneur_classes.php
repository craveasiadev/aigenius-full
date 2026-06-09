<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Carbon\Carbon;

return new class extends Migration
{
    public function up(): void
    {
        $now = Carbon::now();

        $contentClassId = (string) Str::uuid();
        $codingClassId = (string) Str::uuid();

        DB::table('aipreneur_classes')->insert([
            [
                'id' => $contentClassId,
                'title' => 'Content Creator Bootcamp',
                'category' => 'content',
                'description' => 'Learn how to plan, record, and edit short videos for TikTok/Reels.',
                'level' => 'Beginner',
                'price' => 39.00,
                'duration_minutes' => 60,
                'cover_image_url' => null,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'id' => $codingClassId,
                'title' => 'Mini Coding Adventure',
                'category' => 'coding',
                'description' => 'Build fun mini games and learn loops, logic, and sprites.',
                'level' => 'Beginner',
                'price' => 49.00,
                'duration_minutes' => 75,
                'cover_image_url' => null,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);

        $slots = [];
        $contentDates = [2, 5, 9];
        foreach ($contentDates as $dayOffset) {
            $start = $now->copy()->addDays($dayOffset)->setTime(16, 0);
            $slots[] = [
                'id' => (string) Str::uuid(),
                'class_id' => $contentClassId,
                'start_time' => $start,
                'end_time' => $start->copy()->addMinutes(60),
                'capacity' => 25,
                'booked_count' => 0,
                'location' => 'Online (Zoom)',
                'status' => 'open',
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        $codingDates = [3, 7, 11];
        foreach ($codingDates as $dayOffset) {
            $start = $now->copy()->addDays($dayOffset)->setTime(10, 30);
            $slots[] = [
                'id' => (string) Str::uuid(),
                'class_id' => $codingClassId,
                'start_time' => $start,
                'end_time' => $start->copy()->addMinutes(75),
                'capacity' => 20,
                'booked_count' => 0,
                'location' => 'Online (Zoom)',
                'status' => 'open',
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        DB::table('aipreneur_class_slots')->insert($slots);
    }

    public function down(): void
    {
        DB::table('aipreneur_class_slots')->delete();
        DB::table('aipreneur_classes')->delete();
    }
};

