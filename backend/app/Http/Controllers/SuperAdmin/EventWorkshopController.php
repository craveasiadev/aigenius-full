<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\WorkshopShop;
use App\Models\WorkshopShopStaff;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\View\View;

/**
 * Event Workshops superadmin controller — manage partner shops that
 * appear on student globes after a QR scan, plus the staff_event
 * users authorised to scan into them.
 *
 * Image pipeline: client (`wp-aigenius/src/lib/imageOptimize.ts`)
 * pre-resizes + JPEG-encodes; this controller applies a second pass
 * with PHP-GD (no composer additions) and stores into the public
 * disk under `workshop-shops/`. Cache-friendly, ULID filenames.
 */
class EventWorkshopController extends Controller
{
    // ────────────────────────────────────────────────────────────
    // Superadmin views
    // ────────────────────────────────────────────────────────────

    public function index(Request $request): View
    {
        $search = trim((string) $request->query('q', ''));

        $shops = WorkshopShop::query()
            ->when($search !== '', function ($q) use ($search) {
                $like = '%' . $search . '%';
                $q->where(function ($w) use ($like) {
                    $w->where('name', 'like', $like)
                      ->orWhere('company_name', 'like', $like)
                      ->orWhere('business_nature', 'like', $like);
                });
            })
            ->orderByDesc('is_active')
            ->orderBy('name')
            ->paginate(20)
            ->withQueryString();

        $stats = [
            'total'  => WorkshopShop::count(),
            'active' => WorkshopShop::where('is_active', true)->count(),
            'hidden' => WorkshopShop::where('is_active', false)->count(),
            'scans'  => \DB::table('workshop_shop_unlocks')->whereNull('deleted_at')->count(),
        ];

        $staffUsers = User::where('role', 'staff_event')
            ->orderBy('name')
            ->get(['id', 'name', 'email']);

        return view('superadmin.event-workshops.index', [
            'shops'      => $shops,
            'stats'      => $stats,
            'search'     => $search,
            'staffUsers' => $staffUsers,
        ]);
    }

    public function create(): View
    {
        return view('superadmin.event-workshops.form', [
            'shop' => new WorkshopShop(['is_active' => true, 'modules' => ['cafe']]),
            'mode' => 'create',
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validateForm($request, true);
        $path = $this->processUpload($request->file('shop_image'));

        $shop = WorkshopShop::create([
            'name'             => $data['name'],
            'company_name'     => $data['company_name'],
            'business_nature'  => $data['business_nature'] ?? null,
            'shop_image_path'  => $path,
            'modules'          => $this->parseModules($data['modules'] ?? null),
            'is_active'        => (bool) ($data['is_active'] ?? true),
            'created_by'       => optional($request->attributes->get('superadmin'))->id,
            'updated_by'       => optional($request->attributes->get('superadmin'))->id,
        ]);

        return redirect()
            ->route('superadmin.event-workshops.index')
            ->with('status', "Workshop \"{$shop->name}\" created.");
    }

    public function edit(string $id): View
    {
        $shop = WorkshopShop::findOrFail($id);
        return view('superadmin.event-workshops.form', [
            'shop' => $shop,
            'mode' => 'edit',
        ]);
    }

    public function update(Request $request, string $id): RedirectResponse
    {
        $shop = WorkshopShop::findOrFail($id);
        $data = $this->validateForm($request, false);

        if ($request->hasFile('shop_image')) {
            // Replace the file — only delete the old one after the
            // new file lands successfully to avoid leaving the shop
            // with a broken image link.
            $newPath = $this->processUpload($request->file('shop_image'));
            $oldPath = $shop->shop_image_path;
            $shop->shop_image_path = $newPath;
            if ($oldPath && Storage::disk('public')->exists($oldPath)
                && ! str_starts_with($oldPath, 'workshop-shops/seed/')) {
                Storage::disk('public')->delete($oldPath);
            }
        }

        $shop->name            = $data['name'];
        $shop->company_name    = $data['company_name'];
        $shop->business_nature = $data['business_nature'] ?? null;
        $shop->modules         = $this->parseModules($data['modules'] ?? null);
        $shop->is_active       = (bool) ($data['is_active'] ?? false);
        $shop->updated_by      = optional($request->attributes->get('superadmin'))->id;
        $shop->save();

        return redirect()
            ->route('superadmin.event-workshops.index')
            ->with('status', "Workshop \"{$shop->name}\" updated.");
    }

    public function destroy(string $id): RedirectResponse
    {
        $shop = WorkshopShop::findOrFail($id);
        $shop->delete();
        return redirect()
            ->route('superadmin.event-workshops.index')
            ->with('status', "Workshop \"{$shop->name}\" deleted.");
    }

    public function toggleActive(string $id): RedirectResponse
    {
        $shop = WorkshopShop::findOrFail($id);
        $shop->is_active = ! $shop->is_active;
        $shop->save();
        return back()->with('status', $shop->is_active
            ? "\"{$shop->name}\" is now live."
            : "\"{$shop->name}\" is now hidden.");
    }

    public function scans(string $id): View
    {
        $shop = WorkshopShop::findOrFail($id);
        $unlocks = $shop->unlocks()
            ->with(['scannedBy:id,name,email'])
            ->orderByDesc('scanned_at')
            ->paginate(50);

        return view('superadmin.event-workshops.scans', [
            'shop'    => $shop,
            'unlocks' => $unlocks,
        ]);
    }

    // ────────────────────────────────────────────────────────────
    // Staff event accounts
    // ────────────────────────────────────────────────────────────

    public function storeStaff(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name'                 => ['required', 'string', 'max:120'],
            'email'                => ['required', 'email', 'unique:users,email'],
            'password'             => ['required', 'string', 'min:8'],
            'workshop_shop_ids'    => ['nullable', 'array'],
            'workshop_shop_ids.*'  => ['uuid', 'exists:workshop_shops,id'],
        ]);

        $user = User::create([
            'id'            => (string) Str::uuid(),
            'name'          => $data['name'],
            'email'         => $data['email'],
            'password_hash' => Hash::make($data['password']),
            'role'          => 'staff_event',
            'is_superadmin' => false,
        ]);

        foreach ($data['workshop_shop_ids'] ?? [] as $shopId) {
            WorkshopShopStaff::create([
                'user_id'          => $user->id,
                'workshop_shop_id' => $shopId,
            ]);
        }

        return back()->with('status', "Staff \"{$user->name}\" added.");
    }

    public function destroyStaff(string $id): RedirectResponse
    {
        $user = User::where('id', $id)->where('role', 'staff_event')->firstOrFail();
        $user->delete();
        return back()->with('status', "Staff removed.");
    }

    // ────────────────────────────────────────────────────────────
    // Helpers
    // ────────────────────────────────────────────────────────────

    /**
     * Validate the form payload. On create the image is required;
     * on edit we allow keeping the existing one (no file submitted).
     */
    protected function validateForm(Request $request, bool $isCreate): array
    {
        $rules = [
            'name'            => ['required', 'string', 'max:120'],
            'company_name'    => ['required', 'string', 'max:160'],
            'business_nature' => ['nullable', 'string', 'max:2000'],
            'modules'         => ['nullable', 'string', 'max:500'],
            'is_active'       => ['nullable', 'boolean'],
            'shop_image'      => [
                $isCreate ? 'required' : 'nullable',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:8192', // 8 MB pre-optimise ceiling
            ],
        ];

        return Validator::make($request->all(), $rules)->validate();
    }

    protected function parseModules(?string $raw): array
    {
        if (! $raw) return [];
        $parts = array_filter(array_map('trim', explode(',', $raw)));
        return array_values(array_unique($parts));
    }

    /**
     * Resize + re-encode the uploaded image with PHP-GD. Aims for
     * the target the wp-aigenius client already pre-compressed to —
     * 1280 px longest side at JPEG q=85. End result is typically
     * ≤200 KB regardless of the source.
     */
    protected function processUpload(\Illuminate\Http\UploadedFile $file): string
    {
        $maxDim   = 1280;
        $quality  = 85;
        $filename = 'workshop-shops/' . (string) Str::ulid() . '.jpg';

        $src = @imagecreatefromstring(file_get_contents($file->getRealPath()));
        if ($src === false) {
            // GD failed — fall back to raw storage so we don't lose
            // the upload. Backend admin can re-encode later.
            $file->storeAs('workshop-shops', basename($filename), 'public');
            Log::warning('[EventWorkshop] GD decode failed, stored raw', [
                'mime' => $file->getMimeType(), 'size' => $file->getSize(),
            ]);
            return $filename;
        }

        $w = imagesx($src);
        $h = imagesy($src);
        $scale = min(1, $maxDim / max($w, $h));
        $tw = max(1, (int) round($w * $scale));
        $th = max(1, (int) round($h * $scale));

        $dst = imagecreatetruecolor($tw, $th);
        // Bake transparency onto white so PNG → JPEG conversion
        // doesn't surprise anyone with black corners.
        $white = imagecolorallocate($dst, 255, 255, 255);
        imagefilledrectangle($dst, 0, 0, $tw, $th, $white);
        imagecopyresampled($dst, $src, 0, 0, 0, 0, $tw, $th, $w, $h);

        $tmp = tempnam(sys_get_temp_dir(), 'ws_') . '.jpg';
        imagejpeg($dst, $tmp, $quality);
        imagedestroy($src);
        imagedestroy($dst);

        Storage::disk('public')->putFileAs(
            'workshop-shops',
            new \Illuminate\Http\File($tmp),
            basename($filename),
        );
        @unlink($tmp);

        return $filename;
    }

    // ────────────────────────────────────────────────────────────
    // API — student catalog + staff scanner
    // ────────────────────────────────────────────────────────────

    /**
     * GET /api/workshop-shops — public, active-only catalog the
     * wp-aigenius student frontend reads to populate the globe.
     */
    public function apiList(): JsonResponse
    {
        $shops = WorkshopShop::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get()
            ->map(fn (WorkshopShop $s) => $this->presentShop($s));

        return response()->json(['shops' => $shops]);
    }

    /** GET /api/admin/event-workshops — admin variant including hidden shops. */
    public function apiAdminList(): JsonResponse
    {
        $shops = WorkshopShop::query()
            ->orderByDesc('is_active')
            ->orderBy('name')
            ->get()
            ->map(fn (WorkshopShop $s) => $this->presentShop($s));
        return response()->json(['shops' => $shops]);
    }

    /**
     * GET /api/students/{student}/workshop-unlocks — the dashboard
     * carousel asks for this on every mount and on every scan event.
     */
    public function apiUnlocksForStudent(string $studentId): JsonResponse
    {
        $unlocks = \DB::table('workshop_shop_unlocks')
            ->where('student_id', $studentId)
            ->whereNull('deleted_at')
            ->orderByDesc('scanned_at')
            ->get(['id', 'student_id', 'workshop_shop_id', 'scanned_by_user_id', 'scanned_at'])
            ->map(fn ($row) => [
                'id'                => $row->id,
                'studentId'         => $row->student_id,
                'workshopShopId'    => $row->workshop_shop_id,
                'scannedByUserId'   => $row->scanned_by_user_id,
                'scannedAt'         => $row->scanned_at,
            ]);
        return response()->json(['unlocks' => $unlocks]);
    }

    /**
     * POST /api/workshop-shops/{shop}/unlock — the staff scanner +
     * the wp-aigenius QR scanner both call this. Idempotent via the
     * (student_id, workshop_shop_id) unique constraint.
     */
    public function apiUnlock(Request $request, string $shopId): JsonResponse
    {
        $data = $request->validate([
            'studentId' => ['required', 'uuid'],
        ]);
        $shop = WorkshopShop::where('id', $shopId)->where('is_active', true)->firstOrFail();

        // updateOrCreate keeps it idempotent — re-scanning the same
        // pair just touches `updated_at` (and refreshes scanned_at).
        $unlock = \App\Models\WorkshopShopUnlock::updateOrCreate(
            [
                'student_id'       => $data['studentId'],
                'workshop_shop_id' => $shop->id,
            ],
            [
                'scanned_by_user_id' => optional($request->user())->id,
                'scanned_at'         => now(),
            ],
        );

        return response()->json([
            'unlock' => [
                'id'              => $unlock->id,
                'studentId'       => $unlock->student_id,
                'workshopShopId'  => $unlock->workshop_shop_id,
                'scannedByUserId' => $unlock->scanned_by_user_id,
                'scannedAt'       => $unlock->scanned_at?->toIso8601String(),
            ],
            'shop' => $this->presentShop($shop),
        ]);
    }

    protected function presentShop(WorkshopShop $s): array
    {
        return [
            'id'             => $s->id,
            'name'           => $s->name,
            'companyName'    => $s->company_name,
            'businessNature' => $s->business_nature ?? '',
            'shopImageUrl'   => $s->shop_image_url,
            'modules'        => $s->modules ?? [],
            'isActive'       => (bool) $s->is_active,
            'createdAt'      => optional($s->created_at)->toIso8601String(),
            'updatedAt'      => optional($s->updated_at)->toIso8601String(),
        ];
    }
}
