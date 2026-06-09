<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AIGeniusPurchase;
use App\Models\AIpreneurClass;
use App\Models\AIpreneurClassSlot;
use App\Models\AIpreneurClassBooking;
use App\Models\ChapterProgress;
use App\Models\GeniusProfile;
use App\Models\User;
use App\Models\WPayTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AIpreneurAdminController extends Controller
{
    protected function wpaySource(): string
    {
        return strtolower((string) config('wpay.superadmin_app_source', 'artventure'));
    }

    protected function ensureMaster(Request $request)
    {
        $user = $request->user();
        if (!$user || $user->role !== 'master') {
            return null;
        }

        return $user;
    }

    public function getDashboardOverview(Request $request)
    {
        if (!$this->ensureMaster($request)) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $wpaySource = $this->wpaySource();
        $totalParents = User::where('role', 'parent')->count();
        $totalGenius = GeniusProfile::count();
        $totalCompletedChapters = ChapterProgress::where('status', 'completed')->count();
        $totalBookings = AIpreneurClassBooking::count();
        $totalAdmins = User::where('role', 'master')->count();

        $currentMonth = now()->startOfMonth();
        $monthlyClassSales = (float) AIpreneurClassBooking::whereIn('payment_status', ['completed', 'pay_later'])
            ->where('created_at', '>=', $currentMonth)
            ->sum('amount');
        $monthlyAIGeniusSales = (float) AIGeniusPurchase::where('status', 'completed')
            ->where('created_at', '>=', $currentMonth)
            ->sum('amount_paid');
        $monthlyWPaySales = (float) WPayTransaction::where('status', 'success')
            ->where('app_source', $wpaySource)
            ->where('created_at', '>=', $currentMonth)
            ->sum('amount');

        $topChapters = ChapterProgress::query()
            ->select('chapter_code', DB::raw('count(*) as count'))
            ->where('status', 'completed')
            ->groupBy('chapter_code')
            ->orderByDesc('count')
            ->limit(5)
            ->get();

        $recentActivity = ChapterProgress::query()
            ->with(['student:id,genius_name'])
            ->where('status', 'completed')
            ->whereNotNull('completed_at')
            ->orderByDesc('completed_at')
            ->limit(10)
            ->get()
            ->map(function (ChapterProgress $progress) {
                return [
                    'genius_name' => $progress->student?->genius_name ?? 'Unknown',
                    'chapter_code' => $progress->chapter_code,
                    'completed_at' => optional($progress->completed_at)->toIso8601String(),
                ];
            })
            ->values();

        return response()->json([
            'success' => true,
            'stats' => [
                'total_parents' => $totalParents,
                'total_genius' => $totalGenius,
                'total_completed_chapters' => $totalCompletedChapters,
                'total_bookings' => $totalBookings,
                'total_admins' => $totalAdmins,
                'monthly_sales' => round($monthlyClassSales + $monthlyAIGeniusSales + $monthlyWPaySales, 2),
            ],
            'top_chapters' => $topChapters,
            'recent_activity' => $recentActivity,
        ]);
    }

    public function getMembers(Request $request)
    {
        if (!$this->ensureMaster($request)) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $parents = User::query()
            ->where('role', 'parent')
            ->withCount('geniusProfiles')
            ->orderByDesc('created_at')
            ->get()
            ->map(function (User $parent) {
                return [
                    'id' => $parent->id,
                    'parent_name' => $parent->name,
                    'parent_email' => $parent->email,
                    'total_children' => $parent->genius_profiles_count,
                    'created_at' => optional($parent->created_at)->toIso8601String(),
                ];
            })
            ->values();

        $genius = GeniusProfile::query()
            ->with([
                'parent:id,name,email',
                'rewards:id,student_id,coins,xp',
                'business:id,student_id,total_sales,total_profit',
                'chapterProgresses' => function ($query) {
                    $query->select('id', 'student_id', 'status', 'completed_at');
                },
            ])
            ->orderByDesc('created_at')
            ->get()
            ->map(function (GeniusProfile $profile) {
                $completedCount = $profile->chapterProgresses
                    ->where('status', 'completed')
                    ->count();

                $lastActivity = $profile->chapterProgresses
                    ->whereNotNull('completed_at')
                    ->sortByDesc('completed_at')
                    ->first()?->completed_at;

                return [
                    'id' => $profile->id,
                    'genius_name' => $profile->genius_name,
                    'genius_uid' => $profile->genius_id,
                    'age' => $profile->age,
                    'parent_id' => $profile->parent_id,
                    'parent_name' => $profile->parent?->name,
                    'parent_email' => $profile->parent?->email,
                    'persona_status' => $profile->persona_quiz_completed ? 'completed' : 'not_started',
                    'completed_chapters' => $completedCount,
                    'last_activity' => optional($lastActivity)->toIso8601String(),
                    'coins' => (int) ($profile->rewards?->coins ?? 0),
                    'xp' => (int) ($profile->rewards?->xp ?? 0),
                    'total_sales' => (float) ($profile->business?->total_sales ?? 0),
                    'total_profit' => (float) ($profile->business?->total_profit ?? 0),
                ];
            })
            ->values();

        return response()->json([
            'success' => true,
            'summary' => [
                'total_parents' => $parents->count(),
                'total_genius' => $genius->count(),
                'total_children' => $parents->sum('total_children'),
            ],
            'parents' => $parents,
            'genius' => $genius,
        ]);
    }

    public function getAcademyOverview(Request $request)
    {
        if (!$this->ensureMaster($request)) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $classes = AIpreneurClass::with(['slots' => function ($query) {
                $query->orderBy('start_time');
            }])
            ->orderBy('category')
            ->orderBy('title')
            ->get();

        $bookings = AIpreneurClassBooking::with(['slot.course', 'student.rewards', 'parent'])
            ->orderBy('created_at', 'desc')
            ->limit(200)
            ->get();

        $students = GeniusProfile::with(['rewards', 'business'])
            ->orderBy('created_at', 'desc')
            ->get();

        $parents = User::where('role', 'parent')
            ->withCount('geniusProfiles')
            ->orderBy('created_at', 'desc')
            ->get();

        $totalClasses = $classes->count();
        $totalSlots = $classes->sum(fn ($cls) => $cls->slots->count());
        $totalBookings = $bookings->count();
        $totalStudents = $students->count();
        $totalParents = $parents->count();
        $totalCoins = $students->sum(fn ($student) => optional($student->rewards)->coins ?? 0);
        $avgXp = $students->count() ? round($students->avg(fn ($student) => optional($student->rewards)->xp ?? 0)) : 0;

        return response()->json([
            'success' => true,
            'stats' => [
                'total_classes' => $totalClasses,
                'total_slots' => $totalSlots,
                'total_bookings' => $totalBookings,
                'total_students' => $totalStudents,
                'total_parents' => $totalParents,
                'total_coins' => $totalCoins,
                'avg_xp' => $avgXp,
            ],
            'classes' => $classes,
            'bookings' => $bookings,
            'students' => $students,
            'parents' => $parents,
        ]);
    }

    public function createClass(Request $request)
    {
        if (!$this->ensureMaster($request)) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'category' => 'required|string|max:50',
            'description' => 'nullable|string',
            'level' => 'required|string|max:50',
            'price' => 'required|numeric|min:0',
            'duration_minutes' => 'required|integer|min:15',
            'cover_image_url' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $class = AIpreneurClass::create($validated);

        return response()->json([
            'success' => true,
            'class' => $class,
        ], 201);
    }

    public function updateClass(Request $request, string $classId)
    {
        if (!$this->ensureMaster($request)) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $class = AIpreneurClass::find($classId);
        if (!$class) {
            return response()->json(['success' => false, 'message' => 'Class not found'], 404);
        }

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'category' => 'sometimes|string|max:50',
            'description' => 'nullable|string',
            'level' => 'sometimes|string|max:50',
            'price' => 'sometimes|numeric|min:0',
            'duration_minutes' => 'sometimes|integer|min:15',
            'cover_image_url' => 'nullable|string',
            'is_active' => 'sometimes|boolean',
        ]);

        $class->update($validated);

        return response()->json([
            'success' => true,
            'class' => $class,
        ]);
    }

    public function createSlot(Request $request, string $classId)
    {
        if (!$this->ensureMaster($request)) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $class = AIpreneurClass::find($classId);
        if (!$class) {
            return response()->json(['success' => false, 'message' => 'Class not found'], 404);
        }

        $validated = $request->validate([
            'start_time' => 'required|date',
            'end_time' => 'required|date|after:start_time',
            'capacity' => 'required|integer|min:1',
            'location' => 'nullable|string|max:255',
        ]);

        $slot = AIpreneurClassSlot::create([
            'class_id' => $class->id,
            'start_time' => $validated['start_time'],
            'end_time' => $validated['end_time'],
            'capacity' => $validated['capacity'],
            'location' => $validated['location'] ?? null,
            'status' => 'open',
        ]);

        return response()->json([
            'success' => true,
            'slot' => $slot,
        ], 201);
    }

    public function updateSlot(Request $request, string $slotId)
    {
        if (!$this->ensureMaster($request)) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $slot = AIpreneurClassSlot::find($slotId);
        if (!$slot) {
            return response()->json(['success' => false, 'message' => 'Slot not found'], 404);
        }

        $validated = $request->validate([
            'start_time' => 'sometimes|date',
            'end_time' => 'sometimes|date|after:start_time',
            'capacity' => 'sometimes|integer|min:1',
            'status' => 'sometimes|string|in:open,full,closed',
            'location' => 'nullable|string|max:255',
        ]);

        $slot->update($validated);

        return response()->json([
            'success' => true,
            'slot' => $slot,
        ]);
    }

    public function deleteClass(Request $request, string $classId)
    {
        if (!$this->ensureMaster($request)) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $class = AIpreneurClass::with('slots.bookings')->find($classId);
        if (!$class) {
            return response()->json(['success' => false, 'message' => 'Class not found'], 404);
        }

        $hasBookings = $class->slots->sum(fn ($slot) => $slot->bookings->count()) > 0;
        if ($hasBookings) {
            return response()->json(['success' => false, 'message' => 'Cannot delete class with existing bookings.'], 400);
        }

        $class->delete();

        return response()->json(['success' => true]);
    }

    public function lookupBooking(Request $request)
    {
        if (!$this->ensureMaster($request)) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'order_id' => 'required|string',
        ]);

        $booking = AIpreneurClassBooking::with(['slot.course', 'student', 'parent'])
            ->where('order_id', $validated['order_id'])
            ->first();

        if (!$booking) {
            return response()->json(['success' => false, 'message' => 'Booking not found.'], 404);
        }

        return response()->json([
            'success' => true,
            'booking' => $booking,
        ]);
    }

    public function checkInBooking(Request $request)
    {
        if (!$this->ensureMaster($request)) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'order_id' => 'required|string',
        ]);

        $booking = AIpreneurClassBooking::with(['slot.course', 'student', 'parent'])
            ->where('order_id', $validated['order_id'])
            ->first();

        if (!$booking) {
            return response()->json(['success' => false, 'message' => 'Booking not found.'], 404);
        }

        if ($booking->checked_in_at) {
            return response()->json([
                'success' => false,
                'message' => 'Already checked in at ' . $booking->checked_in_at->format('g:i A, M j'),
                'booking' => $booking,
            ], 400);
        }

        $booking->update(['checked_in_at' => now()]);

        return response()->json([
            'success' => true,
            'message' => 'Check-in successful!',
            'booking' => $booking,
        ]);
    }

    public function deleteSlot(Request $request, string $slotId)
    {
        if (!$this->ensureMaster($request)) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $slot = AIpreneurClassSlot::withCount('bookings')->find($slotId);
        if (!$slot) {
            return response()->json(['success' => false, 'message' => 'Slot not found'], 404);
        }

        if ($slot->bookings_count > 0) {
            return response()->json(['success' => false, 'message' => 'Cannot delete slot with bookings.'], 400);
        }

        $slot->delete();

        return response()->json(['success' => true]);
    }
}
