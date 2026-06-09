<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GeniusProfile;
use App\Models\AIpreneurBusiness;
use App\Models\AIpreneurProduct;
use App\Models\AIpreneurStaff;
use App\Models\AIpreneurDecoration;
use App\Models\AIpreneurDecorationItem;
use App\Models\AIpreneurInterview;
use App\Models\AIpreneurCampaign;
use App\Models\AIpreneurMarketingAsset;
use App\Models\AIpreneurInfluencerCampaign;
use App\Models\AIpreneurInnovation;
use App\Models\AIpreneurReward;
use App\Models\AIpreneurTransaction;
use App\Models\AIpreneurDailyStats;
use App\Models\StoreItem;
use App\Models\Redemption;
use App\Models\User;
use App\Jobs\GenerateProductImageJob;
use App\Jobs\GenerateMarketingAssetJob;
use App\Jobs\RemixProductImageJob;
use App\Services\AIpreneurPricingService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AIpreneurController extends Controller
{
    private const EXTERIOR_DECORATION_CATALOG = [
        'banner' => [
            'banner_plain' => 0,
            'banner_neon' => 500,
            'banner_wood' => 200,
            'banner_tech' => 800,
        ],
        'wall' => [
            'wall_brick' => 0,
            'wall_glass' => 600,
            'wall_wood' => 300,
            'wall_paint_pink' => 150,
            'wall_dark' => 450,
        ],
        'lights' => [
            'lights_none' => 0,
            'lights_string' => 250,
            'lights_spot' => 400,
            'lights_neon' => 600,
        ],
    ];

    public function __construct(
        private readonly AIpreneurPricingService $pricingService
    ) {
    }

    // =============================================
    // AUTHENTICATION
    // =============================================

    /**
     * Genius login with genius_id and password.
     */
    public function geniusLogin(Request $request): JsonResponse
    {
        $request->validate([
            'genius_id' => 'required|string',
            'password' => 'required|string',
        ]);

        $profile = GeniusProfile::where('genius_id', $request->genius_id)->first();

        if (!$profile) {
            \Log::info('Genius login failed - profile not found: ' . $request->genius_id);
            return response()->json([
                'success' => false,
                'message' => 'Invalid genius ID or password',
            ], 401);
        }

        // Check password with fallback for legacy formats
        $passwordValid = Hash::check($request->password, $profile->password_hash);

        if (!$passwordValid) {
            // Check for Supabase bcrypt hash ($2a$ -> $2y$)
            if (Str::startsWith($profile->password_hash, '$2a$')) {
                $convertedHash = '$2y$' . substr($profile->password_hash, 4);
                $passwordValid = Hash::check($request->password, $convertedHash);

                if ($passwordValid) {
                    $profile->password_hash = Hash::make($request->password);
                    $profile->save();
                    \Log::info('Migrated password hash for genius: ' . $profile->genius_id);
                }
            }

            // DEV ONLY: Check plain text password
            if (!$passwordValid && $profile->password_hash === $request->password) {
                \Log::warning('Plain text password matched for genius: ' . $profile->genius_id);
                $profile->password_hash = Hash::make($request->password);
                $profile->save();
                $passwordValid = true;
            }
        }

        if (!$passwordValid) {
            \Log::info('Genius login failed - password mismatch for: ' . $request->genius_id);
            return response()->json([
                'success' => false,
                'message' => 'Invalid genius ID or password',
            ], 401);
        }

        // Single active session: revoke all previous tokens before issuing new one
        $profile->tokens()->delete();

        // Generate Sanctum token for the session
        $token = $profile->createToken('genius-session')->plainTextToken;

        // Legacy support (clearing old token style)
        $profile->update(['remember_token' => null]);

        return response()->json([
            'success' => true,
            'token' => $token,
            'profile' => $profile->load(['business', 'rewards']),
        ]);
    }

    /**
     * Parent login as child - allows parent to access child's dashboard.
     * Parent must be authenticated and own the child profile.
     */
    public function parentLoginAsChild(Request $request): JsonResponse
    {
        $request->validate([
            'profile_id' => 'required|string',
        ]);

        // Get authenticated parent
        $parent = $request->user();

        if (!$parent) {
            return response()->json([
                'success' => false,
                'message' => 'Parent authentication required',
            ], 401);
        }

        // Debug: Log the IDs for troubleshooting
        \Log::info('parentLoginAsChild', [
            'profile_id' => $request->profile_id,
            'parent_id' => $parent->id,
            'parent_id_type' => gettype($parent->id),
        ]);

        // Find child profile that belongs to this parent
        // Use string comparison to avoid UUID type mismatches
        $profile = GeniusProfile::where('id', $request->profile_id)
            ->where('parent_id', (string) $parent->id)
            ->first();

        // If not found with strict match, try finding profile first then check parent
        if (!$profile) {
            $profileOnly = GeniusProfile::where('id', $request->profile_id)->first();
            \Log::info('Profile lookup debug', [
                'profile_exists' => !!$profileOnly,
                'profile_parent_id' => $profileOnly?->parent_id,
                'expected_parent_id' => $parent->id,
                'match' => $profileOnly?->parent_id == $parent->id,
            ]);

            // If profile exists and parent IDs match (with loose comparison)
            if ($profileOnly && $profileOnly->parent_id == $parent->id) {
                $profile = $profileOnly;
            }
        }

        if (!$profile) {
            return response()->json([
                'success' => false,
                'message' => 'Profile not found or does not belong to you',
            ], 404);
        }

        // Single active session: revoke all previous tokens before issuing new one
        $profile->tokens()->delete();

        // Generate Sanctum token for the child profile
        $token = $profile->createToken('parent-as-child-session')->plainTextToken;

        return response()->json([
            'success' => true,
            'token' => $token,
            'profile' => $profile->load(['business', 'rewards']),
        ]);
    }

    /**
     * Logout genius.
     */
    public function geniusLogout(Request $request): JsonResponse
    {
        $profile = $request->genius_profile;

        // Revoke Sanctum tokens
        if ($profile) {
            // If using standard Sanctum auth, we can delete the current token
            // Since we are using custom middleware, we might need to delete all or specific ones
            $profile->tokens()->delete(); // Log out from all devices for safety given the auth context
        }

        return response()->json(['success' => true]);
    }

    /**
     * Lightweight session validation (heartbeat).
     * Returns minimal payload — middleware handles 401 if token is invalid.
     */
    public function sessionCheck(): JsonResponse
    {
        return response()->json(['success' => true, 'valid' => true]);
    }

    /**
     * Get current genius profile.
     */
    public function getCurrentProfile(Request $request): JsonResponse
    {
        $profile = $request->genius_profile;

        return response()->json([
            'success' => true,
            'profile' => $profile->load(['business', 'rewards', 'products', 'staff']),
        ]);
    }

    // =============================================
    // PROFILE MANAGEMENT
    // =============================================

    /**
     * Create a new genius profile (by parent).
     */
    public function createProfile(Request $request): JsonResponse
    {
        $request->validate([
            'parent_id' => 'nullable|uuid|exists:users,id',
            'first_name' => 'required|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'age' => 'nullable|integer|min:5|max:20',
            'avatar_url' => 'nullable|string',
            'genius_id' => [
                'nullable',
                'string',
                'max:32',
                'unique:genius_profiles,genius_id',
            ],
            'password' => 'nullable|string|min:6',
            'gender' => 'nullable|string|in:male,female,other',
            'date_of_birth' => 'nullable|date',
        ]);

        $authUser = $request->user();
        $parentId = $authUser?->id ?? $request->parent_id;

        if (!$parentId) {
            return response()->json([
                'success' => false,
                'message' => 'Parent account is required to create a child profile.',
            ], 422);
        }

        if ($request->filled('parent_id') && (string) $request->parent_id !== (string) $parentId) {
            return response()->json([
                'success' => false,
                'message' => 'You can only create profiles under your own account.',
            ], 403);
        }

        // Use provided ID or generate unique one
        $geniusId = $request->filled('genius_id')
            ? trim((string) $request->genius_id)
            : $this->generateUniqueGeniusId();

        // Use provided password or generate memorable one
        $password = $request->filled('password')
            ? trim((string) $request->password)
            : $this->generateMemorablePassword();

        $profile = GeniusProfile::create([
            'parent_id' => $parentId,
            'genius_id' => $geniusId,
            'password_hash' => Hash::make($password),
            'genius_name' => $request->first_name,
            'age' => $request->age,
            'gender' => $request->gender,
            'date_of_birth' => $request->date_of_birth,
            'profile_picture_url' => $request->avatar_url,
        ]);

        // Initialize rewards
        AIpreneurReward::create([
            'student_id' => $profile->id,
            'coins' => 0,
            'ai_tokens' => 0,
        ]);

        return response()->json([
            'success' => true,
            'profile' => $profile,
            'credentials' => [
                'genius_id' => $geniusId,
                'password' => $password, // Only returned once!
            ],
        ]);
    }

    /**
     * Link an existing standalone child account to the authenticated parent.
     * Verification is done using child's genius_id + password.
     */
    public function linkExistingChild(Request $request): JsonResponse
    {
        $request->validate([
            'genius_id' => 'required|string',
            'password' => 'required|string|min:6',
        ]);

        $parent = $request->user();

        if (!$parent || $parent->role !== 'parent') {
            return response()->json([
                'success' => false,
                'message' => 'Only parent accounts can link child profiles.',
            ], 403);
        }

        $geniusId = trim((string) $request->genius_id);
        $profile = GeniusProfile::where('genius_id', $geniusId)->first();

        if (!$profile) {
            return response()->json([
                'success' => false,
                'message' => 'Genius ID not found.',
            ], 404);
        }

        // Verify password with same compatibility strategy used in login
        $passwordValid = Hash::check($request->password, $profile->password_hash);

        if (!$passwordValid && Str::startsWith($profile->password_hash, '$2a$')) {
            $convertedHash = '$2y$' . substr($profile->password_hash, 4);
            $passwordValid = Hash::check($request->password, $convertedHash);

            if ($passwordValid) {
                $profile->password_hash = Hash::make($request->password);
                $profile->save();
            }
        }

        if (!$passwordValid && $profile->password_hash === $request->password) {
            $profile->password_hash = Hash::make($request->password);
            $profile->save();
            $passwordValid = true;
        }

        if (!$passwordValid) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid verification credentials.',
            ], 422);
        }

        if ((string) $profile->parent_id === (string) $parent->id) {
            return response()->json([
                'success' => true,
                'message' => 'This child is already linked to your account.',
                'profile' => $profile,
            ]);
        }

        $currentOwner = User::find($profile->parent_id);
        if ($currentOwner && $currentOwner->role === 'parent' && (string) $currentOwner->id !== (string) $parent->id) {
            return response()->json([
                'success' => false,
                'message' => 'This child is already linked to another parent.',
            ], 409);
        }

        $profile->parent_id = $parent->id;
        $profile->save();

        return response()->json([
            'success' => true,
            'message' => 'Child linked successfully.',
            'profile' => $profile->fresh(),
        ]);
    }

    /**
     * Get profiles for a parent.
     */
    public function getProfiles(Request $request): JsonResponse
    {
        // Get parent_id from authenticated user or query param
        $parentId = $request->parent_id ?? $request->user()?->id;

        if (!$parentId) {
            return response()->json([
                'success' => false,
                'message' => 'Parent ID required',
            ], 400);
        }

        $profiles = GeniusProfile::where('parent_id', $parentId)->get();

        return response()->json([
            'success' => true,
            'profiles' => $profiles,
        ]);
    }

    /**
     * Get a single profile by ID (for parent).
     */
    public function getProfileById(Request $request, string $id): JsonResponse
    {
        $parentId = $request->user()?->id;

        if (!$parentId) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 401);
        }

        $profile = GeniusProfile::where('id', $id)
            ->where('parent_id', $parentId)
            ->first();

        if (!$profile) {
            return response()->json([
                'success' => false,
                'message' => 'Profile not found.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'profile' => $profile,
        ]);
    }

    /**
     * Update a single profile by ID (for parent).
     */
    public function updateProfileById(Request $request, string $id): JsonResponse
    {
        $parentId = $request->user()?->id;

        if (!$parentId) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 401);
        }

        $profile = GeniusProfile::where('id', $id)
            ->where('parent_id', $parentId)
            ->first();

        if (!$profile) {
            return response()->json([
                'success' => false,
                'message' => 'Profile not found.',
            ], 404);
        }

        // Validate input
        $request->validate([
            'genius_name' => 'sometimes|string|max:255',
            'genius_id' => 'sometimes|string|max:32|unique:genius_profiles,genius_id,' . $profile->id,
            'password' => 'sometimes|string|min:6',
            'profile_picture' => 'sometimes|image|mimes:jpeg,png,jpg,gif|max:5120',
        ]);

        // Update genius name if provided
        if ($request->has('genius_name')) {
            $profile->genius_name = $request->genius_name;
        }

        // Update genius ID if provided
        if ($request->filled('genius_id')) {
            $profile->genius_id = trim((string) $request->genius_id);
        }

        // Update password if provided
        if ($request->filled('password')) {
            $profile->password_hash = Hash::make($request->password);
        }

        // Handle profile picture upload
        if ($request->hasFile('profile_picture')) {
            $file = $request->file('profile_picture');
            $filename = 'genius_' . $profile->id . '_' . time() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('profiles', $filename, 'public');
            $profile->profile_picture_url = '/storage/' . $path;
        }

        $profile->save();

        return response()->json([
            'success' => true,
            'message' => 'Profile updated successfully.',
            'profile' => $profile->fresh(),
        ]);
    }

    /**
     * Update profile with onboarding data.
     */
    public function updateOnboarding(Request $request): JsonResponse
    {
        $request->validate([
            'passion_category' => 'required|string|in:ice_cream,pets,games,bakery,cars,drinks,art,nature,food,toys,fashion,flowers',
            'aipreneur_shop_name' => 'required|string|max:255',
            'questionnaire_answers' => 'required|array',
        ]);

        $profile = $request->genius_profile;

        $profile->update([
            'passion_category' => $request->passion_category,
            'aipreneur_shop_name' => $request->aipreneur_shop_name,
            'aipreneur_onboarding_completed' => true,
        ]);

        // Create or update business record
        $business = AIpreneurBusiness::updateOrCreate(
            ['student_id' => $profile->id],
            [
                'questionnaire_answers' => $request->questionnaire_answers,
                'shop_theme' => $request->questionnaire_answers['vibe'] ?? 'fun',
                'current_quest' => 'Complete the Create Product module!',
            ]
        );

        return response()->json([
            'success' => true,
            'profile' => $profile->fresh(),
            'business' => $business,
        ]); // Return fresh
    }

    /**
     * Update profile.
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $profile = $request->genius_profile;

        $profile->update($request->only([
            'first_name',
            'last_name',
            'age',
            'avatar_url',
        ]));

        return response()->json([
            'success' => true,
            'profile' => $profile->fresh(),
        ]);
    }

    /**
     * Submit persona quiz results.
     */
    public function submitPersonaQuiz(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'answers' => 'required|array',
        ]);

        $profile = GeniusProfile::where('id', $id)
            ->where('parent_id', $request->user()->id)
            ->first();

        if (!$profile) {
            return response()->json([
                'success' => false,
                'message' => 'Profile not found.',
            ], 404);
        }

        $personaData = $this->buildPersonaProfileFromAnswers($request->answers);

        $persona = \App\Models\ChildPersonaProfile::updateOrCreate(
            ['user_id' => $profile->id],
            $personaData
        );

        $profile->update([
            'persona_quiz_completed' => true,
            'persona_quiz_date' => now(),
        ]);

        return response()->json([
            'success' => true,
            'profile' => $profile->fresh(),
            'persona' => $persona,
        ]);
    }

    /**
     * Submit persona quiz results (child self-submission).
     */
    public function submitPersonaQuizSelf(Request $request): JsonResponse
    {
        $request->validate([
            'answers' => 'required|array',
        ]);

        $profile = $request->genius_profile;
        $personaData = $this->buildPersonaProfileFromAnswers($request->answers);

        $persona = \App\Models\ChildPersonaProfile::updateOrCreate(
            ['user_id' => $profile->id],
            $personaData
        );

        $profile->update([
            'persona_quiz_completed' => true,
            'persona_quiz_date' => now(),
        ]);

        return response()->json([
            'success' => true,
            'profile' => $profile->fresh(),
            'persona' => $persona,
        ]);
    }

    /**
     * Get persona profile for the logged-in child.
     */
    public function getPersonaProfile(Request $request): JsonResponse
    {
        $profile = $request->genius_profile;
        $persona = \App\Models\ChildPersonaProfile::where('user_id', $profile->id)->first();

        if (!$persona) {
            return response()->json([
                'success' => false,
                'message' => 'Persona profile not found.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'profile' => $profile->fresh(),
            'persona' => $persona,
        ]);
    }

    /**
     * Get persona profile for parent view.
     */
    public function getPersonaProfileForParent(Request $request, string $id): JsonResponse
    {
        $profile = GeniusProfile::where('id', $id)
            ->where('parent_id', $request->user()->id)
            ->first();

        if (!$profile) {
            return response()->json([
                'success' => false,
                'message' => 'Profile not found.',
            ], 404);
        }

        $persona = \App\Models\ChildPersonaProfile::where('user_id', $profile->id)->first();
        if (!$persona) {
            return response()->json([
                'success' => false,
                'message' => 'Persona profile not found.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'profile' => $profile,
            'persona' => $persona,
        ]);
    }

    // =============================================
    // BUSINESS
    // =============================================

    /**
     * Get business data.
     */
    public function getBusiness(Request $request): JsonResponse
    {
        $profile = $request->genius_profile;
        $business = $profile->business;

        if (!$business) {
            return response()->json([
                'success' => false,
                'message' => 'Business not found. Complete onboarding first.',
            ], 404);
        }

        // Auto-generate shop_url_slug if missing (for existing businesses)
        if (empty($business->shop_url_slug) && !empty($profile->aipreneur_shop_name)) {
            $baseSlug = \Illuminate\Support\Str::slug($profile->aipreneur_shop_name);
            $slug = $baseSlug;
            $counter = 1;

            // Ensure uniqueness
            while (AIpreneurBusiness::where('shop_url_slug', $slug)->where('student_id', '!=', $profile->id)->exists()) {
                $slug = $baseSlug . '-' . $counter;
                $counter++;
            }

            $business->update(['shop_url_slug' => $slug]);
            $business->refresh();
        }

        $this->refreshBusinessBalance($profile, $business);
        $business->refresh();

        return response()->json([
            'success' => true,
            'business' => $business,
            'overall_progress' => $business->getOverallProgress(),
        ]);
    }

    /**
     * Update business data.
     */
    public function updateBusiness(Request $request): JsonResponse
    {
        $request->validate([
            'shop_theme' => 'sometimes|nullable|string|max:255',
            'shop_url_slug' => 'sometimes|nullable|string|max:255',
            'shop_image_url' => 'sometimes|nullable|string',
            'exterior_config' => 'sometimes|array',
            'interior_config' => 'sometimes|array',
            'charity_percentage' => 'sometimes|nullable|numeric|min:0|max:100',
            'selected_cause' => 'sometimes|nullable|string|max:255',
            'shop_launched' => 'sometimes|boolean',
        ]);

        $profile = $request->genius_profile;
        $business = $profile->business;

        if (!$business) {
            return response()->json([
                'success' => false,
                'message' => 'Business not found.',
            ], 404);
        }

        try {
            $result = DB::transaction(function () use ($request, $profile, $business) {
                $currentExteriorConfig = is_array($business->exterior_config) ? $business->exterior_config : [];
                $currentInteriorConfig = is_array($business->interior_config) ? $business->interior_config : [];

                $incomingExteriorPatch = $request->has('exterior_config') && is_array($request->input('exterior_config'))
                    ? $request->input('exterior_config')
                    : [];
                $incomingInteriorPatch = $request->has('interior_config') && is_array($request->input('interior_config'))
                    ? $request->input('interior_config')
                    : [];

                $resolvedExteriorConfig = array_merge($currentExteriorConfig, $incomingExteriorPatch);
                $resolvedInteriorConfig = array_merge($currentInteriorConfig, $incomingInteriorPatch);

                $decorationGuardResult = [
                    'exterior_config' => $resolvedExteriorConfig,
                    'interior_config' => $resolvedInteriorConfig,
                    'forced_economy_sync' => false,
                    'unlock_context' => [
                        'new_unlocks' => [],
                        'free_unlocks_used' => 0,
                        'free_unlock_items' => [],
                        'paid_unlock_items' => [],
                        'ai_tokens_spent' => 0,
                        'token_costs' => [],
                        'free_exterior_changes_remaining' => $this->pricingService->getDecorateFreeExteriorChangesTotal(),
                        'token_balance_after' => null,
                    ],
                ];

                if ($request->has('exterior_config') || $request->has('interior_config')) {
                    $decorationGuardResult = $this->guardExteriorDecorationOwnership(
                        $profile,
                        $business,
                        $currentExteriorConfig,
                        $currentInteriorConfig,
                        $resolvedExteriorConfig,
                        $resolvedInteriorConfig,
                        array_keys($incomingExteriorPatch)
                    );
                }

                $updatePayload = $request->only([
                    'shop_theme',
                    'shop_url_slug',
                    'shop_image_url',
                    'charity_percentage',
                    'selected_cause',
                    'shop_launched',
                ]);

                if ($request->has('exterior_config')) {
                    $updatePayload['exterior_config'] = $decorationGuardResult['exterior_config'];
                }

                if (
                    $request->has('interior_config')
                    || $request->has('exterior_config')
                    || $decorationGuardResult['forced_economy_sync']
                ) {
                    $updatePayload['interior_config'] = $decorationGuardResult['interior_config'];
                }

                if (!empty($updatePayload)) {
                    $business->update($updatePayload);
                }

                // Update launched_at if launching for first time
                if ($request->boolean('shop_launched') && !$business->launched_at) {
                    $business->update(['launched_at' => now()]);
                }

                $this->refreshBusinessBalance($profile, $business);

                return [
                    'business' => $business->fresh(),
                    'unlock_context' => $decorationGuardResult['unlock_context'],
                ];
            });
        } catch (\RuntimeException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }

        return response()->json([
            'success' => true,
            'business' => $result['business'],
            'unlock_context' => $result['unlock_context'],
        ]);
    }

    /**
     * Update module progress.
     */
    public function updateModuleProgress(Request $request): JsonResponse
    {
        $request->validate([
            'module' => 'required|string|in:product,decorate,operation,marketing,innovation,csr',
            'progress' => 'required|integer|min:0|max:100',
        ]);

        $profile = $request->genius_profile;
        $business = $profile->business;

        if (!$business) {
            return response()->json([
                'success' => false,
                'message' => 'Business not found.',
            ], 404);
        }

        $column = "module_{$request->module}_progress";
        $business->update([$column => $request->progress]);

        // Award XP for progress
        $profile->rewards?->addXp($request->progress);

        return response()->json([
            'success' => true,
            'business' => $business->fresh(),
            'overall_progress' => $business->getOverallProgress(),
        ]);
    }

    // =============================================
    // PRODUCTS
    // =============================================

    /**
     * Get all products.
     */
    public function getProducts(Request $request): JsonResponse
    {
        $profile = $request->genius_profile;

        return response()->json([
            'success' => true,
            'products' => $profile->products,
        ]);
    }

    /**
     * Create product.
     */
    public function createProduct(Request $request): JsonResponse
    {
        $request->validate([
            'product_name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:3|max:15',
            'positioning_strategy' => 'required|string|in:premium,volume,marketing,eco,limited,creative,tech,cause',
            'image_url' => 'nullable|string',
            'image_data' => 'nullable|string',
            'image_source' => 'nullable|string|in:uploaded,generated,ai_generated',
            'generate_image' => 'nullable|boolean',
        ]);

        $profile = $request->genius_profile;
        $tokensCharged = 0;

        if ($request->boolean('generate_image')) {
            $tokenCost = $this->getTokenCostFor('product_image');
            $rewards = $this->getOrCreateNormalizedRewards($profile);
            $currentBalance = (int) ($rewards->ai_tokens ?? 0);

            if ($currentBalance < $tokenCost) {
                return response()->json([
                    'success' => false,
                    'message' => "Not enough AI tokens. Need {$tokenCost}, have {$currentBalance}.",
                    'required_ai_tokens' => $tokenCost,
                ], 400);
            }

            if (!$rewards->spendAITokens($tokenCost)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to spend AI tokens.',
                ], 500);
            }

            $tokensCharged = $tokenCost;
        }

        // Determine image status based on generate_image flag
        $imageStatus = null;
        $imageSource = $request->image_source;
        $imageUrl = $request->image_url;
        $imageInput = $request->image_data ?: $imageUrl;
        $baseImagePath = null;

        // If the image is a base64 data URL, store it and save a short URL instead
        if ($imageInput && preg_match('/^data:image\/(\w+);base64,/', $imageInput, $matches)) {
            $extension = strtolower($matches[1] ?? 'png');
            $base64 = substr($imageInput, strpos($imageInput, ',') + 1);
            $decoded = base64_decode($base64);

            if ($decoded === false) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid image data.',
                ], 422);
            }

            Storage::disk('public')->makeDirectory('products');
            $filename = 'product_' . $profile->id . '_' . time() . '_' . Str::random(6) . '.' . $extension;
            Storage::disk('public')->put('products/' . $filename, $decoded);
            $imageUrl = url('/storage/products/' . $filename);
            $imageSource = $imageSource ?: 'uploaded';
            $imageStatus = 'pending';
            $baseImagePath = Storage::disk('public')->path('products/' . $filename);
        }

        if ($request->generate_image && !$baseImagePath) {
            $imageStatus = 'pending';
            $imageSource = 'ai_generated';
        }

        $product = AIpreneurProduct::create([
            'student_id' => $profile->id,
            'product_name' => $request->product_name,
            'description' => $request->description,
            'price' => $request->price,
            'positioning_strategy' => $request->positioning_strategy,
            'image_url' => $imageUrl,
            'image_source' => $imageSource,
            'image_status' => $imageStatus,
        ]);

        // Dispatch image generation job if requested
        if ($baseImagePath) {
            RemixProductImageJob::dispatch($product->id, $baseImagePath, null);
        } elseif ($request->generate_image) {
            GenerateProductImageJob::dispatch($product->id);
        }

        // Keep rewards focused on XP; business profit is earned from sales.
        $profile->rewards?->addXp(20);
        $this->refreshBusinessBalance($profile);

        return response()->json([
            'success' => true,
            'product' => $product,
            'image_generating' => $baseImagePath ? true : ($request->generate_image ?? false),
            'tokens_charged' => $tokensCharged,
        ]);
    }

    /**
     * Update product.
     */
    public function updateProduct(Request $request, string $productId): JsonResponse
    {
        $profile = $request->genius_profile;
        $product = AIpreneurProduct::where('id', $productId)
            ->where('student_id', $profile->id)
            ->first();

        if (!$product) {
            return response()->json([
                'success' => false,
                'message' => 'Product not found.',
            ], 404);
        }

        $product->update($request->only([
            'product_name',
            'description',
            'price',
            'positioning_strategy',
            'image_url',
        ]));
        $this->refreshBusinessBalance($profile);

        return response()->json([
            'success' => true,
            'product' => $product->fresh(),
        ]);
    }

    /**
     * Delete product.
     */
    public function deleteProduct(Request $request, string $productId): JsonResponse
    {
        $profile = $request->genius_profile;
        $product = AIpreneurProduct::where('id', $productId)
            ->where('student_id', $profile->id)
            ->first();

        if (!$product) {
            return response()->json([
                'success' => false,
                'message' => 'Product not found.',
            ], 404);
        }

        $product->delete();
        $this->refreshBusinessBalance($profile);

        return response()->json(['success' => true]);
    }

    // =============================================
    // STAFF
    // =============================================

    /**
     * Get all staff.
     */
    public function getStaff(Request $request): JsonResponse
    {
        $profile = $request->genius_profile;

        return response()->json([
            'success' => true,
            'staff' => $profile->staff,
        ]);
    }

    /**
     * Initialize default staff.
     */
    public function initializeStaff(Request $request): JsonResponse
    {
        $profile = $request->genius_profile;

        // Check if staff already exists
        if ($profile->staff()->count() > 0) {
            return response()->json([
                'success' => true,
                'staff' => $profile->staff,
                'message' => 'Staff already initialized.',
            ]);
        }

        // Create default staff
        $defaultStaff = [
            ['staff_role' => 'cashier', 'staff_name' => 'Alex', 'personality' => 'Friendly and detail-oriented', 'skills' => ['math', 'customer_service'], 'hobbies' => ['reading', 'music']],
            ['staff_role' => 'chef', 'staff_name' => 'Sam', 'personality' => 'Creative and passionate', 'skills' => ['cooking', 'creativity'], 'hobbies' => ['gardening', 'art']],
            ['staff_role' => 'cleaner', 'staff_name' => 'Jordan', 'personality' => 'Thorough and organized', 'skills' => ['cleaning', 'organization'], 'hobbies' => ['sports', 'movies']],
            ['staff_role' => 'greeter', 'staff_name' => 'Taylor', 'personality' => 'Warm and welcoming', 'skills' => ['communication', 'empathy'], 'hobbies' => ['dancing', 'travel']],
        ];

        foreach ($defaultStaff as $staff) {
            AIpreneurStaff::create([
                'student_id' => $profile->id,
                ...$staff,
            ]);
        }
        $this->updateOverallStaffMood($profile);

        return response()->json([
            'success' => true,
            'staff' => $profile->fresh()->staff,
        ]);
    }

    /**
     * Update staff member.
     */
    public function updateStaff(Request $request, string $staffId): JsonResponse
    {
        $profile = $request->genius_profile;
        $staff = AIpreneurStaff::where('id', $staffId)
            ->where('student_id', $profile->id)
            ->first();

        if (!$staff) {
            return response()->json([
                'success' => false,
                'message' => 'Staff not found.',
            ], 404);
        }

        $staff->update($request->only([
            'staff_name',
            'mood',
            'energy',
            'salary',
            'skills',
            'hobbies',
            'personality',
        ]));

        // Update overall staff mood in business
        $this->updateOverallStaffMood($profile);

        return response()->json([
            'success' => true,
            'staff' => $staff->fresh(),
        ]);
    }

    /**
     * Fire (delete) a staff member.
     */
    public function deleteStaff(Request $request, string $staffId): JsonResponse
    {
        $profile = $request->genius_profile;
        $staff = AIpreneurStaff::where('id', $staffId)
            ->where('student_id', $profile->id)
            ->first();

        if (!$staff) {
            return response()->json([
                'success' => false,
                'message' => 'Staff not found.',
            ], 404);
        }

        $staff->delete();

        $this->updateOverallStaffMood($profile);

        return response()->json([
            'success' => true,
            'message' => 'Staff member fired.',
        ]);
    }

    /**
     * Hire new staff from interview.
     */
    public function hireStaff(Request $request): JsonResponse
    {
        $request->validate([
            'interview_id' => 'required|uuid|exists:aipreneur_interviews,id',
        ]);

        $profile = $request->genius_profile;
        $interview = AIpreneurInterview::where('id', $request->interview_id)
            ->where('student_id', $profile->id)
            ->first();

        if (!$interview) {
            return response()->json([
                'success' => false,
                'message' => 'Interview not found.',
            ], 404);
        }

        // Spend AI tokens for hiring
        $rewards = $this->getOrCreateNormalizedRewards($profile);
        $hireCost = $this->pricingService->getStaffHireCost();
        if (!$rewards->spendAITokens($hireCost)) {
            return response()->json([
                'success' => false,
                'message' => "Not enough AI tokens. Need {$hireCost}.",
                'required_ai_tokens' => $hireCost,
            ], 400);
        }

        // Check if role already filled
        $existingStaff = AIpreneurStaff::where('student_id', $profile->id)
            ->where('staff_role', $interview->npc_role)
            ->first();

        if ($existingStaff) {
            // Replace existing staff
            $existingStaff->delete();
        }

        // Create new staff from interview
        $staff = AIpreneurStaff::create([
            'student_id' => $profile->id,
            'staff_role' => $interview->npc_role,
            'staff_name' => $interview->npc_name,
            'personality' => $interview->npc_personality['trait'] ?? 'Friendly',
            'skills' => $interview->npc_personality['skills'] ?? [],
            'hobbies' => $interview->npc_personality['hobbies'] ?? [],
            'interview_id' => $interview->id,
        ]);

        $interview->update(['decision' => 'hired']);
        $this->updateOverallStaffMood($profile);

        return response()->json([
            'success' => true,
            'staff' => $staff,
        ]);
    }

    /**
     * Create staff directly (for Operation module frontend interview flow).
     */
    public function createStaff(Request $request): JsonResponse
    {
        $request->validate([
            'staff_role' => 'required|string|in:cashier,chef,cleaner,greeter,manager,assistant',
            'staff_name' => 'required|string|max:100',
            'mood' => 'nullable|integer|min:0|max:100',
            'energy' => 'nullable|integer|min:0|max:100',
            'salary' => 'nullable|integer|min:1|max:100',
            'skills' => 'nullable|array',
            'hobbies' => 'nullable|array',
            'personality' => 'nullable|string',
            'speed_modifier' => 'nullable|numeric|min:0.5|max:2.0',
            'efficiency_modifier' => 'nullable|numeric|min:0.5|max:2.0',
            'uniform_image_data' => 'nullable|string',
            'uniform_source' => 'nullable|string|in:drawn,uploaded',
        ]);

        $profile = $request->genius_profile;
        $uniformImageUrl = null;
        $uniformSource = $request->uniform_source;

        if ($request->uniform_image_data) {
            $inputData = $request->uniform_image_data;
            $extension = 'png';
            $base64 = $inputData;

            if (preg_match('/^data:image\/(\w+);base64,/', $inputData, $matches)) {
                $extension = strtolower($matches[1] ?? 'png');
                $base64 = substr($inputData, strpos($inputData, ',') + 1);
            }

            $decoded = base64_decode($base64);

            if ($decoded === false) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid uniform image data.',
                ], 422);
            }

            Storage::disk('public')->makeDirectory('staff-uniforms');
            $filename = 'uniform_' . $profile->id . '_' . time() . '_' . Str::random(6) . '.' . $extension;
            Storage::disk('public')->put('staff-uniforms/' . $filename, $decoded);
            $uniformImageUrl = url('/storage/staff-uniforms/' . $filename);
            $uniformSource = $uniformSource ?: 'uploaded';
        }

        // Check if role already filled - replace existing staff of same role
        $existingStaff = AIpreneurStaff::where('student_id', $profile->id)
            ->where('staff_role', $request->staff_role)
            ->first();

        if ($existingStaff) {
            // Replace existing staff
            $existingStaff->delete();
        }

        // Create new staff
        $staff = AIpreneurStaff::create([
            'student_id' => $profile->id,
            'staff_role' => $request->staff_role,
            'staff_name' => $request->staff_name,
            'uniform_image_url' => $uniformImageUrl,
            'uniform_source' => $uniformSource,
            'mood' => $request->mood ?? 80,
            'energy' => $request->energy ?? 80,
            'salary' => $request->salary ?? 5,
            'skills' => $request->skills ?? [],
            'hobbies' => $request->hobbies ?? [],
            'personality' => $request->personality ?? 'Friendly',
            'speed_modifier' => $request->speed_modifier ?? 1.0,
            'efficiency_modifier' => $request->efficiency_modifier ?? 1.0,
        ]);

        // Update overall staff mood in business
        $this->updateOverallStaffMood($profile);

        return response()->json([
            'success' => true,
            'staff' => $staff,
        ]);
    }

    // =============================================
    // DECORATIONS
    // =============================================

    /**
     * Get decorations.
     */
    public function getDecorations(Request $request): JsonResponse
    {
        $profile = $request->genius_profile;

        return response()->json([
            'success' => true,
            'decorations' => $profile->decorations,
            'decoration_items' => $profile->decorationItems,
        ]);
    }

    /**
     * Save decoration theme.
     */
    public function saveDecoration(Request $request): JsonResponse
    {
        $request->validate([
            'mood_theme' => 'required|string|in:fun_colorful,eco_natural,modern_clean,cute_cozy,futuristic_techy,holiday_travel,luxury_premium,retro_vintage',
            'decoration_focus' => 'nullable|string|in:furniture,art,lights',
        ]);

        $profile = $request->genius_profile;

        $decoration = AIpreneurDecoration::updateOrCreate(
            ['student_id' => $profile->id],
            [
                'mood_theme' => $request->mood_theme,
                'decoration_focus' => $request->decoration_focus,
                'happiness_boost' => $this->calculateHappinessBoost($request->mood_theme),
                'price_willingness_multiplier' => $this->calculatePriceMultiplier($request->mood_theme),
            ]
        );

        return response()->json([
            'success' => true,
            'decoration' => $decoration,
        ]);
    }

    /**
     * Save decoration items.
     */
    public function saveDecorationItems(Request $request): JsonResponse
    {
        $request->validate([
            'items' => 'required|array',
            'items.*.item_type' => 'required|string|in:floor,wall,furniture,display,decoration,exterior',
            'items.*.item_name' => 'required|string',
            'items.*.item_config' => 'nullable|array',
            'items.*.position_x' => 'nullable|integer',
            'items.*.position_y' => 'nullable|integer',
        ]);

        $profile = $request->genius_profile;

        // Clear existing items
        AIpreneurDecorationItem::where('student_id', $profile->id)->delete();

        // Create new items
        foreach ($request->items as $item) {
            AIpreneurDecorationItem::create([
                'student_id' => $profile->id,
                ...$item,
            ]);
        }

        return response()->json([
            'success' => true,
            'items' => $profile->fresh()->decorationItems,
        ]);
    }

    /**
     * Generate AI-enhanced interior assets from a drawing or upload.
     */
    public function generateInteriorAsset(Request $request): JsonResponse
    {
        $request->validate([
            'category' => 'required|string|in:floor,wall,plant',
            'image_data' => 'required|string',
            'prompt_hint' => 'nullable|string|max:500',
            'source' => 'nullable|string|in:draw,upload',
        ]);

        $profile = $request->genius_profile;
        $tokenCost = $this->getTokenCostFor('interior_item');
        $rewards = $this->getOrCreateNormalizedRewards($profile);
        $currentBalance = (int) ($rewards->ai_tokens ?? 0);
        if ($currentBalance < $tokenCost) {
            return response()->json([
                'success' => false,
                'message' => "Not enough AI tokens. Need {$tokenCost}, have {$currentBalance}.",
                'required_ai_tokens' => $tokenCost,
            ], 400);
        }
        if (!$rewards->spendAITokens($tokenCost)) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to spend AI tokens.',
            ], 500);
        }

        $business = $profile->business;
        $answers = $business?->questionnaire_answers ?? [];
        $theme = $answers['shop_theme'] ?? 'colorful';
        $age = $profile?->age;

        $inputData = $request->image_data;
        $extension = 'png';
        $base64 = $inputData;

        if (preg_match('/^data:image\/(\w+);base64,/', $inputData, $matches)) {
            $extension = strtolower($matches[1] ?? 'png');
            $base64 = substr($inputData, strpos($inputData, ',') + 1);
        }

        $decoded = base64_decode($base64);
        if ($decoded === false) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid image data.',
            ], 422);
        }

        Storage::disk('local')->makeDirectory('tmp');
        $tmpFilename = 'tmp/interior_' . $profile->id . '_' . time() . '_' . Str::random(6) . '.' . $extension;
        Storage::disk('local')->put($tmpFilename, $decoded);
        $tmpPath = Storage::disk('local')->path($tmpFilename);

        try {
            $prompt = $this->buildInteriorAssetPrompt(
                $request->category,
                $theme,
                $request->prompt_hint,
                $age
            );

            $response = $this->callGptImage1Edit($prompt, $tmpPath);

            if (!$response['success']) {
                throw new \Exception($response['error'] ?? 'Image generation failed.');
            }

            Storage::disk('public')->makeDirectory('interior-assets');
            $filename = $request->category . '_' . $profile->id . '_' . time() . '_' . Str::random(6) . '.png';
            Storage::disk('public')->put('interior-assets/' . $filename, $response['image_data']);

            $imageUrl = url('/aipreneur/interior-asset/' . $filename);

            return response()->json([
                'success' => true,
                'image_url' => $imageUrl,
                'tokens_charged' => $tokenCost,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        } finally {
            if (file_exists($tmpPath)) {
                @unlink($tmpPath);
            }
        }
    }

    // =============================================
    // INTERVIEWS
    // =============================================

    /**
     * Get interview history.
     */
    public function getInterviews(Request $request): JsonResponse
    {
        $profile = $request->genius_profile;

        return response()->json([
            'success' => true,
            'interviews' => $profile->interviews()->orderBy('created_at', 'desc')->get(),
        ]);
    }

    /**
     * Start a new interview.
     */
    public function startInterview(Request $request): JsonResponse
    {
        $request->validate([
            'role' => 'required|string|in:cashier,chef,cleaner,greeter,stock_manager,security',
        ]);

        $profile = $request->genius_profile;

        // Generate random NPC
        $npc = $this->generateRandomNPC($request->role);

        $interview = AIpreneurInterview::create([
            'student_id' => $profile->id,
            'npc_name' => $npc['name'],
            'npc_role' => $request->role,
            'npc_personality' => $npc['personality'],
            'npc_avatar' => $npc['avatar'],
        ]);

        return response()->json([
            'success' => true,
            'interview' => $interview,
            'npc' => $npc,
        ]);
    }

    /**
     * Submit interview answers.
     */
    public function submitInterviewAnswers(Request $request, string $interviewId): JsonResponse
    {
        $request->validate([
            'questions_asked' => 'required|array',
            'responses' => 'required|array',
            'decision' => 'required|string|in:hired,passed',
        ]);

        $profile = $request->genius_profile;
        $interview = AIpreneurInterview::where('id', $interviewId)
            ->where('student_id', $profile->id)
            ->first();

        if (!$interview) {
            return response()->json([
                'success' => false,
                'message' => 'Interview not found.',
            ], 404);
        }

        $interview->update([
            'questions_asked' => $request->questions_asked,
            'responses' => $request->responses,
            'decision' => $request->decision,
        ]);

        // Award XP for completing interview
        $profile->rewards?->addXp(15);

        return response()->json([
            'success' => true,
            'interview' => $interview->fresh(),
        ]);
    }

    // =============================================
    // CAMPAIGNS
    // =============================================

    /**
     * Get all campaigns.
     */
    public function getCampaigns(Request $request): JsonResponse
    {
        $profile = $request->genius_profile;

        return response()->json([
            'success' => true,
            'campaigns' => $profile->campaigns()->orderBy('launched_at', 'desc')->get(),
        ]);
    }

    /**
     * Create campaign.
     */
    public function createCampaign(Request $request): JsonResponse
    {
        $request->validate([
            'campaign_name' => 'required|string|max:255',
            'marketing_goal' => 'required|string',
            'color_style' => 'nullable|string',
            'channels' => 'required|array',
            'budget_coins' => 'required|integer|min:10',
        ]);

        $profile = $request->genius_profile;

        $rewards = $this->getOrCreateNormalizedRewards($profile);

        // Check if enough AI tokens
        if ($rewards->ai_tokens < $request->budget_coins) {
            return response()->json([
                'success' => false,
                'message' => 'Not enough AI tokens.',
            ], 400);
        }

        // Spend AI tokens
        $rewards->spendAITokens((int) $request->budget_coins);

        // Calculate results based on budget and channels
        $results = $this->calculateCampaignResults($request->budget_coins, $request->channels);

        $campaign = AIpreneurCampaign::create([
            'student_id' => $profile->id,
            'campaign_name' => $request->campaign_name,
            'marketing_goal' => $request->marketing_goal,
            'color_style' => $request->color_style,
            'channels' => $request->channels,
            'budget_coins' => $request->budget_coins,
            'reach' => $results['reach'],
            'likes' => $results['likes'],
            'new_visitors' => $results['new_visitors'],
            'profit_generated' => $results['profit'],
            'roi' => $results['roi'],
            'launched_at' => now(),
        ]);

        // Campaign results affect business performance, not AI token balance.
        $business = $profile->business;
        if ($business) {
            $business->increment('store_visitors', (int) ($results['new_visitors'] ?? 0));
            $business->increment('total_profit', (float) ($results['profit'] ?? 0));
        }
        $rewards->addXp(25);
        $this->refreshBusinessBalance($profile);

        return response()->json([
            'success' => true,
            'campaign' => $campaign,
            'results' => $results,
        ]);
    }

    // =============================================
    // MARKETING ASSETS
    // =============================================

    /**
     * Get marketing assets.
     */
    public function getMarketingAssets(Request $request): JsonResponse
    {
        $profile = $request->genius_profile;

        return response()->json([
            'success' => true,
            'assets' => $profile->marketingAssets,
        ]);
    }

    /**
     * Create marketing asset.
     */
    public function createMarketingAsset(Request $request): JsonResponse
    {
        $request->validate([
            'asset_type' => 'required|string|in:banner,billboard,social_post,flyer,poster',
            'asset_url' => 'nullable|string',
            'asset_config' => 'nullable|array',
            'placement' => 'nullable|string',
        ]);

        $profile = $request->genius_profile;

        $assetInput = $request->asset_url;
        if (!$assetInput) {
            return response()->json([
                'success' => false,
                'message' => 'Asset image is required.',
            ], 422);
        }

        $assetUrl = $assetInput;
        if (preg_match('/^data:image\/(\w+);base64,/', $assetInput)) {
            $storedUrl = $this->storeBase64Image($assetInput, 'marketing-assets', 'marketing');
            if (!$storedUrl) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid marketing image data.',
                ], 422);
            }
            $assetUrl = $storedUrl;
        }

        $asset = AIpreneurMarketingAsset::create([
            'student_id' => $profile->id,
            'asset_type' => $request->asset_type,
            'asset_url' => $assetUrl,
            'asset_config' => $request->asset_config,
            'placement' => $request->placement ?? $request->asset_type,
            'is_active' => true,
        ]);
        $this->refreshBusinessBalance($profile);

        return response()->json([
            'success' => true,
            'asset' => $asset,
        ]);
    }

    /**
     * Generate marketing asset with AI (banner, billboard, social post, flyer).
     */
    public function generateMarketingAsset(Request $request): JsonResponse
    {
        $request->validate([
            'asset_type' => 'required|string|in:banner,billboard,social_post,flyer,poster',
            'image_data' => 'required|string',
            'prompt_hint' => 'nullable|string|max:500',
            'placement' => 'nullable|string',
        ]);

        $profile = $request->genius_profile;
        $tokenCost = $this->getTokenCostFor('marketing_asset');
        $rewards = $this->getOrCreateNormalizedRewards($profile);
        $currentBalance = (int) ($rewards->ai_tokens ?? 0);
        if ($currentBalance < $tokenCost) {
            return response()->json([
                'success' => false,
                'message' => "Not enough AI tokens. Need {$tokenCost}, have {$currentBalance}.",
                'required_ai_tokens' => $tokenCost,
            ], 400);
        }
        if (!$rewards->spendAITokens($tokenCost)) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to spend AI tokens.',
            ], 500);
        }

        $assetType = $request->asset_type;
        $hint = $request->prompt_hint;

        $inputData = $request->image_data;
        $extension = 'png';
        $base64 = $inputData;

        if (preg_match('/^data:image\/(\w+);base64,/', $inputData, $matches)) {
            $extension = strtolower($matches[1] ?? 'png');
            $base64 = substr($inputData, strpos($inputData, ',') + 1);
        }

        $decoded = base64_decode($base64, true);
        if ($decoded === false) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid image data.',
            ], 422);
        }

        Storage::disk('local')->makeDirectory('tmp');
        $tmpFilename = 'tmp/marketing_' . $profile->id . '_' . time() . '_' . Str::random(6) . '.' . $extension;
        Storage::disk('local')->put($tmpFilename, $decoded);
        $tmpPath = Storage::disk('local')->path($tmpFilename);

        try {
            $asset = AIpreneurMarketingAsset::create([
                'student_id' => $profile->id,
                'asset_type' => $assetType,
                'asset_url' => null,
                'asset_config' => [
                    'prompt_hint' => $hint,
                    'generation_status' => 'pending',
                ],
                'placement' => $request->placement ?? $assetType,
                'is_active' => true,
            ]);

            GenerateMarketingAssetJob::dispatch($asset->id, $tmpPath, $hint);
            $this->refreshBusinessBalance($profile);

            return response()->json([
                'success' => true,
                'asset' => $asset->fresh(),
                'tokens_charged' => $tokenCost,
            ]);
        } catch (\Exception $e) {
            if (file_exists($tmpPath)) {
                @unlink($tmpPath);
            }
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    // =============================================
    // INFLUENCER CAMPAIGNS
    // =============================================

    /**
     * Get influencer campaigns.
     */
    public function getInfluencerCampaigns(Request $request): JsonResponse
    {
        $profile = $request->genius_profile;

        return response()->json([
            'success' => true,
            'campaigns' => $profile->influencerCampaigns()->orderBy('started_at', 'desc')->get(),
        ]);
    }

    /**
     * Start influencer campaign.
     */
    public function startInfluencerCampaign(Request $request): JsonResponse
    {
        $request->validate([
            'influencer_name' => 'required|string',
            'influencer_tier' => 'required|string|in:nano,micro,macro,mega',
            'influencer_avatar' => 'nullable|string',
            'influencer_niche' => 'nullable|string',
            'duration_hours' => 'nullable|integer|min:1|max:168',
        ]);

        $profile = $request->genius_profile;

        $avatarInput = $request->influencer_avatar;
        $avatarUrl = null;
        if ($avatarInput) {
            if (preg_match('/^data:image\/(\w+);base64,/', $avatarInput)) {
                $storedUrl = $this->storeBase64Image($avatarInput, 'influencers', 'influencer');
                if (!$storedUrl) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Invalid influencer avatar data.',
                    ], 422);
                }
                $avatarUrl = $storedUrl;
            } else {
                $avatarUrl = $avatarInput;
            }
        }

        $rewards = $this->getOrCreateNormalizedRewards($profile);
        $tier = (string) $request->influencer_tier;
        $chargeBaseCost = $this->pricingService->getInfluencerTierCost($tier);
        $effectBaseCost = $this->pricingService->getInfluencerTierBaseCost($tier);
        $durationHours = max(
            1,
            min(168, (int) ($request->duration_hours ?? $this->pricingService->getInfluencerDurationDefaultHours()))
        );
        $durationMultiplier = $this->resolveInfluencerDurationMultiplier($durationHours);
        $campaignCost = $chargeBaseCost > 0
            ? max(1, (int) round($chargeBaseCost * $durationMultiplier))
            : 0;
        $simulationBudget = max(1, (int) round(max(1, $effectBaseCost) * $durationMultiplier));

        // Check AI tokens
        if ($rewards->ai_tokens < $campaignCost) {
            return response()->json([
                'success' => false,
                'message' => "Not enough AI tokens. Need {$campaignCost}.",
                'required_ai_tokens' => $campaignCost,
            ], 400);
        }

        if ($campaignCost > 0 && !$rewards->spendAITokens($campaignCost)) {
            return response()->json([
                'success' => false,
                'message' => 'Unable to reserve AI tokens for campaign.',
                'required_ai_tokens' => $campaignCost,
            ], 409);
        }

        $tierBoostRange = $this->pricingService->getInfluencerBoostPercentRange($tier);
        $tierBoostPercent = random_int((int) $tierBoostRange['min'], (int) $tierBoostRange['max']);

        // Calculate reach based on tier
        $tierMultipliers = [
            'nano' => 1,
            'micro' => 3,
            'macro' => 8,
            'mega' => 20,
        ];

        $multiplier = $tierMultipliers[$tier] ?? 1;
        $boostFactor = 1 + ($tierBoostPercent / 100);
        $reach = (int) round($simulationBudget * $multiplier * rand(8, 15) * $boostFactor);
        $engagement = (int) round($reach * (rand(5, 15) / 100));
        $newVisitors = (int) round($engagement * (rand(2, 8) / 100) * $boostFactor);
        $salesGenerated = (float) ($newVisitors * rand(3, 8));

        $campaign = AIpreneurInfluencerCampaign::create([
            'student_id' => $profile->id,
            'influencer_name' => $request->influencer_name,
            'influencer_tier' => $tier,
            'influencer_avatar_url' => $avatarUrl,
            'influencer_niche' => $request->influencer_niche,
            'cost_coins' => $campaignCost,
            'reach' => $reach,
            'engagement' => $engagement,
            'new_visitors' => $newVisitors,
            'sales_generated' => $salesGenerated,
            'campaign_type' => 'post',
            'started_at' => now(),
            'ended_at' => now()->addHours($durationHours),
            'status' => 'active',
        ]);

        // Award profit to business (not token wallet)
        $profit = (int) $salesGenerated;
        $business = $profile->business;
        if ($business) {
            $business->increment('total_profit', $profit);
            $business->increment('store_visitors', $newVisitors);
        }
        $this->refreshBusinessBalance($profile, $business);

        return response()->json([
            'success' => true,
            'campaign' => $campaign,
            'profit' => $profit,
            'cost' => $campaignCost,
            'duration_multiplier' => $durationMultiplier,
            'tier_boost_percent' => $tierBoostPercent,
            'tier_boost_range' => $tierBoostRange,
        ]);
    }

    /**
     * Dismiss/cancel an influencer campaign.
     */
    public function dismissInfluencerCampaign(Request $request, string $campaignId): JsonResponse
    {
        $profile = $request->genius_profile;

        $campaign = AIpreneurInfluencerCampaign::where('id', $campaignId)
            ->where('student_id', $profile->id)
            ->first();

        if (!$campaign) {
            return response()->json([
                'success' => false,
                'message' => 'Campaign not found.',
            ], 404);
        }

        $campaign->status = 'cancelled';
        $campaign->ended_at = now();
        $campaign->save();
        $this->refreshBusinessBalance($profile);

        return response()->json([
            'success' => true,
            'message' => 'Campaign dismissed.',
        ]);
    }

    // =============================================
    // INNOVATIONS
    // =============================================

    /**
     * Get innovations.
     */
    public function getInnovations(Request $request): JsonResponse
    {
        $profile = $request->genius_profile;
        $rewards = $this->getOrCreateNormalizedRewards($profile);
        $rewardsLevel = max(1, (int) ($rewards->level ?? 1));
        $availableProjects = AIpreneurInnovation::getAvailableProjectsForLevel($rewardsLevel);

        $this->normalizeActiveInnovationLimit($profile);
        $innovations = $profile->innovations()->orderBy('created_at', 'desc')->get();

        $innovationsPayload = $innovations->map(function (AIpreneurInnovation $innovation) {
            $data = $innovation->toArray();
            $data['scaled_effects'] = $innovation->getScaledEffects();
            return $data;
        })->values();

        $projectsCatalog = collect(AIpreneurInnovation::getProjectCatalog())
            ->map(function (array $project, string $projectId) use ($availableProjects) {
                return array_merge($project, [
                    'id' => $projectId,
                    'max_upgrade_level' => AIpreneurInnovation::MAX_UPGRADE_LEVEL,
                    'is_unlocked_for_level' => in_array($projectId, $availableProjects, true),
                    'unlock_cost' => $this->pricingService->getInnovationUnlockCost($projectId),
                ]);
            })
            ->values();

        $activeCount = $this->hasInnovationActivationColumn()
            ? $innovations->where('is_active', true)->count()
            : min($innovations->count(), AIpreneurInnovation::MAX_ACTIVE_TECH);
        $this->refreshBusinessBalance($profile);

        return response()->json([
            'success' => true,
            'innovations' => $innovationsPayload,
            'available_projects' => $availableProjects,
            'projects_catalog' => $projectsCatalog,
            'rewards_level' => $rewardsLevel,
            'active_count' => $activeCount,
            'max_active_tech' => AIpreneurInnovation::MAX_ACTIVE_TECH,
            'upgrade_step_cost' => $this->pricingService->getInnovationUpgradeStepCost(),
        ]);
    }

    /**
     * Unlock innovation.
     */
    public function unlockInnovation(Request $request): JsonResponse
    {
        $request->validate([
            'tech_project' => 'required|string|in:' . implode(',', AIpreneurInnovation::getAvailableProjects()),
            'quiz_answers' => 'required|array',
            'design_image_data' => 'nullable|string',
        ]);

        $profile = $request->genius_profile;
        $rewards = $this->getOrCreateNormalizedRewards($profile);
        $rewardsLevel = max(1, (int) ($rewards->level ?? 1));
        $availableProjects = AIpreneurInnovation::getAvailableProjectsForLevel($rewardsLevel);

        if (!in_array($request->tech_project, $availableProjects, true)) {
            $projectConfig = AIpreneurInnovation::getProjectCatalog()[$request->tech_project] ?? null;
            $requiredLevel = (int) ($projectConfig['unlock_level'] ?? 10);
            return response()->json([
                'success' => false,
                'message' => "Reach level {$requiredLevel} to unlock this innovation.",
                'required_level' => $requiredLevel,
                'current_level' => $rewardsLevel,
            ], 400);
        }

        // Check if already unlocked
        $existing = AIpreneurInnovation::where('student_id', $profile->id)
            ->where('tech_project', $request->tech_project)
            ->first();

        if ($existing) {
            return response()->json([
                'success' => false,
                'message' => 'Innovation already unlocked.',
            ], 400);
        }

        $cost = $this->pricingService->getInnovationUnlockCost($request->tech_project);
        if ($cost > 0) {
            if ($rewards->ai_tokens < $cost || !$rewards->spendAITokens($cost)) {
                return response()->json([
                    'success' => false,
                    'message' => "Not enough AI tokens. Need {$cost}.",
                    'required_ai_tokens' => $cost,
                ], 400);
            }
        }

        // Calculate boosts based on quiz performance
        $correctAnswers = collect($request->quiz_answers)->filter(fn($a) => $a['correct'] ?? false)->count();
        $totalQuestions = count($request->quiz_answers);
        $score = $totalQuestions > 0 ? ($correctAnswers / $totalQuestions) : 0;

        $designImageUrl = null;
        if ($request->design_image_data === 'AI_GENERATE') {
            $designImageUrl = null;
        } elseif ($request->design_image_data) {
            $storedUrl = $this->storeBase64Image($request->design_image_data, 'innovations', 'innovation');
            if (!$storedUrl) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid innovation design image.',
                ], 422);
            }
            $designImageUrl = $storedUrl;
        }

        $this->normalizeActiveInnovationLimit($profile);
        $activeCount = $this->activeInnovationsQuery($profile)->count();
        $canActivateNow = $activeCount < AIpreneurInnovation::MAX_ACTIVE_TECH;

        $innovationData = [
            'student_id' => $profile->id,
            'tech_project' => $request->tech_project,
            'design_image_url' => $designImageUrl,
            'quiz_answers' => $request->quiz_answers,
            'efficiency_boost' => $score * 20,
            'happiness_boost' => $score * 15,
            'cost_increase' => (1 - $score) * 10,
            'unlocked_at' => now(),
        ];

        if ($this->hasInnovationActivationColumn()) {
            $innovationData['is_active'] = $canActivateNow;
        }
        if ($this->hasInnovationColumn('upgrade_level')) {
            $innovationData['upgrade_level'] = 1;
        }
        if ($this->hasInnovationColumn('lab_level')) {
            $innovationData['lab_level'] = 1;
        }

        $innovation = AIpreneurInnovation::create($innovationData);

        // Award XP
        $rewards->addXp(30 + ($correctAnswers * 5));
        $this->refreshBusinessBalance($profile);

        $innovationPayload = $innovation->toArray();
        $innovationPayload['scaled_effects'] = $innovation->getScaledEffects();

        return response()->json([
            'success' => true,
            'innovation' => $innovationPayload,
            'score' => $score,
            'tokens_charged' => $cost,
            'auto_activated' => $canActivateNow,
            'rewards' => $rewards->fresh(),
        ]);
    }

    /**
     * Activate an innovation for simulator effects (max 5 active).
     */
    public function activateInnovation(Request $request, string $innovationId): JsonResponse
    {
        $profile = $request->genius_profile;

        if (!$this->hasInnovationActivationColumn()) {
            return response()->json([
                'success' => false,
                'message' => 'Tech activation is unavailable until database updates are applied.',
                'max_active_tech' => AIpreneurInnovation::MAX_ACTIVE_TECH,
            ], 503);
        }

        $this->normalizeActiveInnovationLimit($profile);

        $innovation = AIpreneurInnovation::where('id', $innovationId)
            ->where('student_id', $profile->id)
            ->first();

        if (!$innovation) {
            return response()->json([
                'success' => false,
                'message' => 'Innovation not found.',
            ], 404);
        }

        if ($innovation->is_active) {
            return response()->json([
                'success' => true,
                'innovation' => $innovation,
                'active_count' => AIpreneurInnovation::where('student_id', $profile->id)->where('is_active', true)->count(),
                'max_active_tech' => AIpreneurInnovation::MAX_ACTIVE_TECH,
            ]);
        }

        $activeCount = AIpreneurInnovation::where('student_id', $profile->id)
            ->where('is_active', true)
            ->count();

        if ($activeCount >= AIpreneurInnovation::MAX_ACTIVE_TECH) {
            return response()->json([
                'success' => false,
                'message' => 'You can only activate up to 5 tech items at once.',
                'active_count' => $activeCount,
                'max_active_tech' => AIpreneurInnovation::MAX_ACTIVE_TECH,
            ], 400);
        }

        $innovation->is_active = true;
        $innovation->save();
        $this->refreshBusinessBalance($profile);

        $innovationPayload = $innovation->fresh()->toArray();
        $innovationPayload['scaled_effects'] = $innovation->fresh()->getScaledEffects();

        return response()->json([
            'success' => true,
            'innovation' => $innovationPayload,
            'active_count' => $activeCount + 1,
            'max_active_tech' => AIpreneurInnovation::MAX_ACTIVE_TECH,
        ]);
    }

    /**
     * Deactivate an innovation.
     */
    public function deactivateInnovation(Request $request, string $innovationId): JsonResponse
    {
        $profile = $request->genius_profile;

        if (!$this->hasInnovationActivationColumn()) {
            return response()->json([
                'success' => false,
                'message' => 'Tech deactivation is unavailable until database updates are applied.',
                'max_active_tech' => AIpreneurInnovation::MAX_ACTIVE_TECH,
            ], 503);
        }

        $innovation = AIpreneurInnovation::where('id', $innovationId)
            ->where('student_id', $profile->id)
            ->first();

        if (!$innovation) {
            return response()->json([
                'success' => false,
                'message' => 'Innovation not found.',
            ], 404);
        }

        $innovation->is_active = false;
        $innovation->save();
        $this->refreshBusinessBalance($profile);

        $activeCount = AIpreneurInnovation::where('student_id', $profile->id)
            ->where('is_active', true)
            ->count();

        $innovationPayload = $innovation->fresh()->toArray();
        $innovationPayload['scaled_effects'] = $innovation->fresh()->getScaledEffects();

        return response()->json([
            'success' => true,
            'innovation' => $innovationPayload,
            'active_count' => $activeCount,
            'max_active_tech' => AIpreneurInnovation::MAX_ACTIVE_TECH,
        ]);
    }

    /**
     * Upgrade an unlocked innovation up to level 6.
     */
    public function upgradeInnovation(Request $request, string $innovationId): JsonResponse
    {
        $profile = $request->genius_profile;

        if (!$this->hasInnovationColumn('upgrade_level')) {
            return response()->json([
                'success' => false,
                'message' => 'Innovation upgrades are unavailable until database updates are applied.',
                'max_level' => AIpreneurInnovation::MAX_UPGRADE_LEVEL,
            ], 503);
        }

        $innovation = AIpreneurInnovation::where('id', $innovationId)
            ->where('student_id', $profile->id)
            ->first();

        if (!$innovation) {
            return response()->json([
                'success' => false,
                'message' => 'Innovation not found.',
            ], 404);
        }

        $currentLevel = max(1, (int) ($innovation->upgrade_level ?? 1));
        if ($currentLevel >= AIpreneurInnovation::MAX_UPGRADE_LEVEL) {
            return response()->json([
                'success' => false,
                'message' => 'Innovation is already at max level.',
                'max_level' => AIpreneurInnovation::MAX_UPGRADE_LEVEL,
            ], 400);
        }

        $nextLevel = $currentLevel + 1;
        $upgradeStepCost = $this->pricingService->getInnovationUpgradeStepCost();
        $upgradeCost = $upgradeStepCost * $nextLevel;
        $rewards = $this->getOrCreateNormalizedRewards($profile);
        if ($rewards->ai_tokens < $upgradeCost) {
            return response()->json([
                'success' => false,
                'message' => 'Not enough AI tokens for upgrade.',
                'required_ai_tokens' => $upgradeCost,
            ], 400);
        }

        $rewards->spendAITokens($upgradeCost);
        $innovation->upgrade_level = $nextLevel;
        $innovation->save();
        $rewards->addXp(20 + ($nextLevel * 2));
        $this->refreshBusinessBalance($profile);

        $innovationPayload = $innovation->fresh()->toArray();
        $innovationPayload['scaled_effects'] = $innovation->fresh()->getScaledEffects();

        return response()->json([
            'success' => true,
            'innovation' => $innovationPayload,
            'upgrade_cost' => $upgradeCost,
            'rewards' => $rewards->fresh(),
        ]);
    }

    // =============================================
    // REWARDS
    // =============================================

    /**
     * Get rewards.
     */
    public function getRewards(Request $request): JsonResponse
    {
        $profile = $request->genius_profile;
        $rewards = $this->getOrCreateNormalizedRewards($profile);

        return response()->json([
            'success' => true,
            'rewards' => $rewards,
        ]);
    }

    /**
     * Get active reward-store items for student redemption.
     */
    public function getRewardStoreItems(Request $request): JsonResponse
    {
        $items = StoreItem::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        $payload = $items->map(function (StoreItem $item) {
            // Build a CORS-safe image URL via the public proxy route
            $imageUrl = (string) ($item->image_url ?? '');
            if ($imageUrl) {
                // Rewrite local reward-image URLs to the public proxy path
                if (str_contains($imageUrl, '/reward-images/')) {
                    $filename = basename($imageUrl);
                    $imageUrl = '/reward-images/' . $filename;
                }
            }

            return [
                'id' => $item->id,
                'name' => $item->name,
                'category' => $item->category,
                'desc' => (string) ($item->description ?? ''),
                'details' => (string) ($item->details ?? ''),
                'imageUrl' => $imageUrl,
                'price' => (int) ($item->price_coins ?? 0),
                'stock' => max(0, (int) ($item->stock ?? 0)),
                'partner' => $item->partner,
                'popular' => in_array((int) ($item->sort_order ?? 0), [1, 2], true),
            ];
        })->values();

        return response()->json([
            'success' => true,
            'items' => $payload,
        ]);
    }

    /**
     * Redeem a store item using AI tokens and deduct stock atomically.
     */
    public function redeemRewardStoreItem(Request $request): JsonResponse
    {
        $request->validate([
            'item_id' => 'required|uuid|exists:store_items,id',
        ]);

        $profile = $request->genius_profile;
        $itemId = (string) $request->item_id;

        $result = DB::transaction(function () use ($profile, $itemId) {
            $item = StoreItem::query()
                ->whereKey($itemId)
                ->lockForUpdate()
                ->first();

            if (!$item || !$item->is_active) {
                return [
                    'ok' => false,
                    'status' => 404,
                    'message' => 'Reward item not found.',
                ];
            }

            if ((int) $item->stock <= 0) {
                return [
                    'ok' => false,
                    'status' => 409,
                    'message' => 'This reward is out of stock.',
                ];
            }

            $rewards = $this->getOrCreateNormalizedRewards($profile);
            $lockedRewards = AIpreneurReward::query()
                ->whereKey($rewards->id)
                ->lockForUpdate()
                ->firstOrFail();

            $price = max(0, (int) $item->price_coins);
            if ((int) $lockedRewards->ai_tokens < $price) {
                return [
                    'ok' => false,
                    'status' => 400,
                    'message' => 'Not enough AI tokens.',
                ];
            }

            $lockedRewards->ai_tokens = max(0, (int) $lockedRewards->ai_tokens - $price);
            $lockedRewards->save();

            $item->stock = max(0, (int) $item->stock - 1);
            $item->save();

            $redemption = Redemption::query()->create([
                'student_id' => $profile->id,
                'item_id' => $item->id,
                'code' => $this->generateRewardRedemptionCode(),
                'status' => 'reserved',
                'tokens_spent' => $price,
                'item_name_snapshot' => $item->name,
                'item_price_snapshot' => $price,
            ]);

            return [
                'ok' => true,
                'item' => [
                    'id' => $item->id,
                    'name' => $item->name,
                    'stock' => (int) $item->stock,
                ],
                'rewards' => $lockedRewards->fresh(),
                'redemption' => [
                    'id' => $redemption->id,
                    'code' => $redemption->code,
                    'status' => $redemption->status,
                ],
                'tokens_spent' => $price,
            ];
        });

        if (!$result['ok']) {
            return response()->json([
                'success' => false,
                'message' => $result['message'],
            ], $result['status']);
        }

        return response()->json([
            'success' => true,
            'message' => 'Reward redeemed successfully.',
            'item' => $result['item'],
            'rewards' => $result['rewards'],
            'redemption' => $result['redemption'],
            'ai_tokens_spent' => $result['tokens_spent'],
        ]);
    }

    /**
     * Claim daily reward.
     */
    public function claimDailyReward(Request $request): JsonResponse
    {
        $profile = $request->genius_profile;
        $today = now()->toDateString();
        $hasDailyClaimColumn = Schema::hasColumn('aipreneur_rewards', 'last_daily_claim_date');

        $result = DB::transaction(function () use ($profile, $today, $hasDailyClaimColumn) {
            $rewards = $this->getOrCreateNormalizedRewards($profile);
            $lockedRewards = AIpreneurReward::query()
                ->whereKey($rewards->id)
                ->lockForUpdate()
                ->firstOrFail();

            $lastClaimDate = $hasDailyClaimColumn
                ? $lockedRewards->last_daily_claim_date?->toDateString()
                : $lockedRewards->last_activity_date?->toDateString();

            if ($lastClaimDate === $today) {
                return [
                    'already_claimed' => true,
                    'rewards' => $lockedRewards->fresh(),
                    'daily_ai_tokens' => 0,
                    'daily_coins' => 0,
                    'streak_bonus' => 0,
                ];
            }

            // Update streak and award daily claim rewards.
            $lockedRewards->updateStreak();
            $business = $profile->business;
            if ($business) {
                $business->streak_days = (int) ($lockedRewards->current_streak ?? 0);
                $business->last_activity_date = $today;
                $business->save();
            }
            $streakBonus = min((int) floor($lockedRewards->current_streak / 3), 4);
            $dailyAiTokens = 1 + $streakBonus;

            $lockedRewards->addAITokens($dailyAiTokens);
            $lockedRewards->addXp(10);
            if ($hasDailyClaimColumn) {
                $lockedRewards->last_daily_claim_date = $today;
                $lockedRewards->save();
            }

            return [
                'already_claimed' => false,
                'rewards' => $lockedRewards->fresh(),
                'daily_ai_tokens' => $dailyAiTokens,
                'daily_coins' => $dailyAiTokens, // backward-compatible alias
                'streak_bonus' => $streakBonus,
            ];
        });

        return response()->json([
            'success' => true,
            'message' => $result['already_claimed'] ? 'Daily reward already claimed.' : 'Daily reward claimed successfully.',
            'already_claimed' => $result['already_claimed'],
            'rewards' => $result['rewards'],
            'daily_ai_tokens' => $result['daily_ai_tokens'],
            'daily_coins' => $result['daily_coins'],
            'streak_bonus' => $result['streak_bonus'],
        ]);
    }

    /**
     * Add coins to user's rewards (for starting capital, bonuses, etc.).
     */
    public function addCoins(Request $request): JsonResponse
    {
        $request->validate([
            'amount' => 'required|integer|min:1|max:10000',
            'reason' => 'nullable|string|max:255',
        ]);

        $profile = $request->genius_profile;
        $rewards = $this->getOrCreateNormalizedRewards($profile);

        $amount = $request->amount;
        $rewards->addAITokens($amount);

        // Log the transaction if needed (optional)
        // Could create a transaction record here for audit

        return response()->json([
            'success' => true,
            'rewards' => $rewards->fresh(),
            'ai_tokens_added' => $amount,
            'coins_added' => $amount, // backward-compatible alias
        ]);
    }

    /**
     * Add XP to user's rewards.
     */
    public function addXp(Request $request): JsonResponse
    {
        $request->validate([
            'amount' => 'required|integer|min:1|max:10000',
            'reason' => 'nullable|string|max:255',
        ]);

        $profile = $request->genius_profile;
        $rewards = $this->getOrCreateNormalizedRewards($profile);

        $amount = (int) $request->amount;
        $leveledUp = $rewards->addXp($amount);

        return response()->json([
            'success' => true,
            'rewards' => $rewards->fresh(),
            'xp_added' => $amount,
            'leveled_up' => $leveledUp,
        ]);
    }

    /**
     * Claim an achievement reward (one-time per achievement ID).
     */
    public function claimAchievement(Request $request): JsonResponse
    {
        $request->validate([
            'achievement_id' => 'required|string|max:100',
            'xp_reward' => 'required|integer|min:0|max:10000',
            'coins_reward' => 'required|integer|min:0|max:10000',
        ]);

        $profile = $request->genius_profile;
        $rewards = $this->getOrCreateNormalizedRewards($profile);

        $achievementId = (string) $request->achievement_id;
        $claimed = $rewards->badges ?? [];
        $alreadyClaimed = in_array($achievementId, $claimed, true);

        if ($alreadyClaimed) {
            return response()->json([
                'success' => true,
                'rewards' => $rewards->fresh(),
                'xp_added' => 0,
                'coins_added' => 0,
                'badge_earned' => null,
                'already_claimed' => true,
            ]);
        }

        $xpReward = (int) $request->xp_reward;
        $coinsReward = (int) $request->coins_reward;

        if ($xpReward > 0) {
            $rewards->addXp($xpReward);
        }
        if ($coinsReward > 0) {
            $rewards->addAITokens($coinsReward);
        }

        $badgeEarned = $rewards->awardBadge($achievementId) ? $achievementId : null;

        return response()->json([
            'success' => true,
            'rewards' => $rewards->fresh(),
            'xp_added' => $xpReward,
            'coins_added' => $coinsReward,
            'badge_earned' => $badgeEarned,
            'already_claimed' => false,
        ]);
    }

    /**
     * Get claimed achievement IDs.
     */
    public function getClaimedAchievements(Request $request): JsonResponse
    {
        $profile = $request->genius_profile;
        $rewards = $this->getOrCreateNormalizedRewards($profile);

        return response()->json([
            'success' => true,
            'claimed_achievements' => $rewards->badges ?? [],
        ]);
    }

    /**
     * Spend coins from user's rewards (for AI actions, customizations, etc.).
     */
    public function spendCoins(Request $request): JsonResponse
    {
        $request->validate([
            'amount' => 'required|integer|min:1|max:10000',
            'reason' => 'nullable|string|max:255',
        ]);

        $profile = $request->genius_profile;
        $rewards = $this->getOrCreateNormalizedRewards($profile);

        $amount = $request->amount;
        if (!$rewards->spendAITokens((int) $amount)) {
            return response()->json([
                'success' => false,
                'message' => 'Not enough AI tokens.',
            ], 400);
        }

        return response()->json([
            'success' => true,
            'rewards' => $rewards->fresh(),
            'ai_tokens_spent' => $amount,
            'coins_spent' => $amount, // backward-compatible alias
        ]);
    }

    /**
     * Check whether the student has enough AI tokens for an operation.
     */
    public function checkTokenBalance(Request $request): JsonResponse
    {
        $allowedOperations = array_keys(AIpreneurPricingService::DEFAULT_TOKEN_COSTS);

        $request->validate([
            'operation' => 'required|string|in:' . implode(',', $allowedOperations),
            'quantity' => 'nullable|integer|min:1|max:1000',
        ]);

        $profile = $request->genius_profile;
        $rewards = $this->getOrCreateNormalizedRewards($profile);

        $operation = (string) $request->input('operation');
        $quantity = max(1, (int) $request->input('quantity', 1));
        $unitCost = $this->getTokenCostFor($operation);
        $required = max(0, $unitCost * $quantity);
        $currentBalance = (int) ($rewards->ai_tokens ?? 0);
        $hasEnough = $currentBalance >= $required;

        return response()->json([
            'success' => true,
            'operation' => $operation,
            'quantity' => $quantity,
            'unit_cost' => $unitCost,
            'required' => $required,
            'current_balance' => $currentBalance,
            'has_enough' => $hasEnough,
            'deficit' => $hasEnough ? 0 : ($required - $currentBalance),
        ]);
    }

    /**
     * Consume AI tokens based on a server-authoritative operation key.
     */
    public function consumeTokens(Request $request): JsonResponse
    {
        $allowedOperations = array_keys(AIpreneurPricingService::DEFAULT_TOKEN_COSTS);

        $request->validate([
            'operation' => 'required|string|in:' . implode(',', $allowedOperations),
            'quantity' => 'nullable|integer|min:1|max:1000',
            'reason' => 'nullable|string|max:255',
        ]);

        $profile = $request->genius_profile;
        $rewards = $this->getOrCreateNormalizedRewards($profile);

        $operation = (string) $request->input('operation');
        $quantity = max(1, (int) $request->input('quantity', 1));
        $unitCost = $this->getTokenCostFor($operation);
        $required = max(0, $unitCost * $quantity);
        $currentBalance = (int) ($rewards->ai_tokens ?? 0);

        if ($currentBalance < $required) {
            return response()->json([
                'success' => false,
                'message' => "Not enough AI tokens. Need {$required}, have {$currentBalance}.",
                'required' => $required,
                'current_balance' => $currentBalance,
                'deficit' => $required - $currentBalance,
            ], 400);
        }

        if ($required > 0 && !$rewards->spendAITokens($required)) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to spend AI tokens.',
            ], 500);
        }

        $freshRewards = $rewards->fresh();
        $newBalance = (int) ($freshRewards->ai_tokens ?? 0);

        AIpreneurTransaction::create([
            'student_id' => $profile->id,
            'type' => AIpreneurTransaction::TYPE_EXPENSE,
            'category' => AIpreneurTransaction::CATEGORY_AI_GENERATION,
            'description' => $request->input('reason') ?: "Token spend: {$operation} x{$quantity}",
            'amount' => 0,
            'tokens' => $required,
            'coin_balance_after' => 0,
            'token_balance_after' => $newBalance,
            'metadata' => [
                'operation' => $operation,
                'quantity' => $quantity,
                'unit_cost' => $unitCost,
                'source' => 'tokens_consume_endpoint',
            ],
        ]);

        return response()->json([
            'success' => true,
            'operation' => $operation,
            'quantity' => $quantity,
            'unit_cost' => $unitCost,
            'tokens_used' => $required,
            'new_balance' => $newBalance,
        ]);
    }

    /**
     * Spend AI tokens from user's rewards (for AI actions, customizations, etc.).
     */
    public function spendAiTokens(Request $request): JsonResponse
    {
        $request->validate([
            'amount' => 'required|integer|min:1|max:10000',
            'reason' => 'nullable|string|max:255',
        ]);

        $profile = $request->genius_profile;
        $rewards = $this->getOrCreateNormalizedRewards($profile);

        $amount = (int) $request->amount;
        if (!$rewards->spendAITokens($amount)) {
            return response()->json([
                'success' => false,
                'message' => 'Not enough AI tokens.',
            ], 400);
        }

        return response()->json([
            'success' => true,
            'rewards' => $rewards->fresh(),
            'ai_tokens_spent' => $amount,
        ]);
    }

    /**
     * Get profit-to-AI-token conversion rate.
     */
    public function getConversionRate(Request $request): JsonResponse
    {
        $profile = $request->genius_profile;
        $business = $profile->business;
        $this->getOrCreateNormalizedRewards($profile);

        $totalProfit = (float) ($business->total_profit ?? 0);
        $totalCosts = (float) ($business->total_costs ?? 0);
        $availableProfit = max(0, $totalProfit - $totalCosts);

        $rate = $this->pricingService->getConversionProfitPerTokenRate();
        $minConversion = $this->pricingService->getConversionMinProfit();
        $potentialAiTokens = (int) floor($availableProfit / $rate);

        return response()->json([
            'success' => true,
            'rate' => $rate,
            'min_conversion' => $minConversion,
            'available_profit' => $availableProfit,
            'potential_ai_tokens' => $potentialAiTokens,
            'potential_coins' => $potentialAiTokens,
        ]);
    }

    /**
     * Convert profit to AI tokens.
     */
    public function convertProfitToCoins(Request $request): JsonResponse
    {
        $request->validate([
            'profit_amount' => 'required|numeric|min:1',
        ]);

        $profile = $request->genius_profile;
        $business = $profile->business;
        $rewards = $this->getOrCreateNormalizedRewards($profile);

        if (!$business) {
            return response()->json([
                'success' => false,
                'message' => 'Business or rewards record not found.',
            ], 404);
        }

        $rate = $this->pricingService->getConversionProfitPerTokenRate();
        $minConversion = $this->pricingService->getConversionMinProfit();
        $profitAmount = (float) $request->profit_amount;

        $totalProfit = (float) ($business->total_profit ?? 0);
        $totalCosts = (float) ($business->total_costs ?? 0);
        $availableProfit = max(0, $totalProfit - $totalCosts);

        if ($profitAmount > $availableProfit) {
            return response()->json([
                'success' => false,
                'message' => 'Not enough available profit.',
            ], 400);
        }

        if ($profitAmount < $minConversion) {
            return response()->json([
                'success' => false,
                'message' => "Minimum conversion is {$minConversion} profit.",
                'min_conversion' => $minConversion,
            ], 400);
        }

        $tokensToGive = (int) floor($profitAmount / $rate);
        if ($tokensToGive < 1) {
            return response()->json([
                'success' => false,
                'message' => "Amount too small to convert. Need at least {$rate} profit per token.",
            ], 400);
        }

        // Deduct profit by increasing costs (so available profit decreases)
        $business->total_costs = $totalCosts + $profitAmount;
        $business->save();

        // Add AI tokens
        $rewards->addAITokens($tokensToGive);

        $newAvailableProfit = max(0, $totalProfit - $business->total_costs);

        return response()->json([
            'success' => true,
            'converted' => [
                'profit_used' => $profitAmount,
                'ai_tokens_received' => $tokensToGive,
                'coins_received' => $tokensToGive,
            ],
            'new_balance' => [
                'total_profit' => $totalProfit,
                'available_profit' => $newAvailableProfit,
                'coins' => 0,
                'ai_tokens' => $rewards->ai_tokens,
            ],
        ]);
    }

    /**
     * Get finance mini-game daily status.
     */
    public function getFinanceGameStatus(Request $request): JsonResponse
    {
        $profile = $request->genius_profile;
        $business = $profile->business;

        if (!$business) {
            return response()->json([
                'success' => false,
                'message' => 'Business record not found.',
            ], 404);
        }

        $today = now()->toDateString();
        $lastPlayed = $business->last_finance_game_date?->toDateString();
        $canPlayToday = $lastPlayed !== $today;

        return response()->json([
            'success' => true,
            'can_play_today' => $canPlayToday,
            'last_played_date' => $lastPlayed,
            'daily_limit' => 1,
        ]);
    }

    /**
     * Claim finance mini-game result once per day.
     */
    public function claimFinanceGameReward(Request $request): JsonResponse
    {
        $request->validate([
            'completed' => 'required|boolean',
            'score' => 'nullable|integer|min:0|max:1000',
        ]);

        $profile = $request->genius_profile;
        $business = $profile->business;
        if (!$business) {
            return response()->json([
                'success' => false,
                'message' => 'Business record not found.',
            ], 404);
        }

        $today = now()->toDateString();
        if ($business->last_finance_game_date?->toDateString() === $today) {
            return response()->json([
                'success' => false,
                'message' => 'Finance game already completed today.',
            ], 400);
        }

        $rewards = $this->getOrCreateNormalizedRewards($profile);
        $completed = (bool) $request->boolean('completed');
        $score = max(0, (int) $request->input('score', 0));

        $xpEarned = 0;
        $tokensEarned = 0;
        if ($completed) {
            $xpEarned = 20 + min(20, (int) floor($score / 10));
            $tokensEarned = 2;
            $rewards->addXp($xpEarned);
            $rewards->addAITokens($tokensEarned);
        } else {
            // Small consolation XP for participation.
            $xpEarned = 5;
            $rewards->addXp($xpEarned);
        }

        $business->last_finance_game_date = $today;
        $business->save();

        return response()->json([
            'success' => true,
            'completed' => $completed,
            'xp_earned' => $xpEarned,
            'ai_tokens_earned' => $tokensEarned,
            'rewards' => $rewards->fresh(),
            'business' => $business->fresh(),
            'daily_limit' => 1,
        ]);
    }

    /**
     * Get CSR status (total donated and selected cause).
     */
    public function getCsrStatus(Request $request): JsonResponse
    {
        $profile = $request->genius_profile;
        $business = $profile->business;

        if (!$business) {
            return response()->json([
                'success' => false,
                'message' => 'Business record not found.',
            ], 404);
        }

        $today = now()->toDateString();
        $lastCsrActionDate = $business->last_csr_action_date?->toDateString();
        $canDonateToday = $lastCsrActionDate !== $today;

        return response()->json([
            'success' => true,
            'business' => $business->fresh(),
            'can_donate_today' => $canDonateToday,
            'last_csr_action_date' => $lastCsrActionDate,
            'daily_limit' => 1,
        ]);
    }

    /**
     * Record a CSR donation.
     */
    public function donateCsr(Request $request): JsonResponse
    {
        $request->validate([
            'cause' => 'required|string|max:50',
            'action_type' => 'required|string|max:50',
            'donation_amount' => 'required|integer|min:1|max:10000',
        ]);

        $profile = $request->genius_profile;
        $business = $profile->business;

        if (!$business) {
            return response()->json([
                'success' => false,
                'message' => 'Business record not found.',
            ], 404);
        }

        $today = now()->toDateString();
        if ($business->last_csr_action_date?->toDateString() === $today) {
            return response()->json([
                'success' => false,
                'message' => 'CSR quest already completed today.',
            ], 400);
        }

        $donationAmount = (int) $request->donation_amount;

        $business->total_donated = ($business->total_donated ?? 0) + $donationAmount;
        $business->selected_cause = $request->cause;
        $business->module_csr_progress = max($business->module_csr_progress ?? 0, 100);
        $business->last_csr_action_date = $today;
        $business->save();

        $rewards = $this->getOrCreateNormalizedRewards($profile);
        $rewards->addAITokens(2);
        $rewards->addXp(40);
        $rewards->awardBadge('Philanthropist');
        $rewards->awardBadge('Change Maker');
        $this->refreshBusinessBalance($profile, $business);

        return response()->json([
            'success' => true,
            'business' => $business->fresh(),
            'rewards' => $rewards->fresh(),
            'daily_limit' => 1,
        ]);
    }

    // =============================================
    // SHOP OPENING QUEST & SIMULATOR
    // =============================================

    /**
     * Get shop opening status for quest system.
     */
    public function getShopOpeningStatus(Request $request): JsonResponse
    {
        $profile = $request->genius_profile;
        $business = $profile->business;

        if (!$business) {
            return response()->json([
                'success' => false,
                'message' => 'Business not found.',
            ], 404);
        }

        // Check prerequisites - need 2 products and 2 staff
        $productsCount = $profile->products()->count();
        $staffCount = $profile->staff()->count();
        $hasEnoughProducts = $productsCount >= 2;
        $hasEnoughStaff = $staffCount >= 2;
        $canOpen = $hasEnoughProducts && $hasEnoughStaff;

        // Update checklist in database
        $checklist = [
            'products_created' => $hasEnoughProducts,
            'staff_hired' => $hasEnoughStaff,
        ];
        $business->update(['opening_checklist' => $checklist]);

        return response()->json([
            'success' => true,
            'checklist' => $checklist,
            'can_open' => $canOpen,
            'shop_launched' => $business->shop_launched ?? false,
            'ribbon_cutting_completed' => $business->ribbon_cutting_completed ?? false,
            'products_count' => $productsCount,
            'staff_count' => $staffCount,
            'required_products' => 2,
            'required_staff' => 2,
        ]);
    }

    /**
     * Complete ribbon cutting ceremony and launch shop.
     */
    public function completeRibbonCutting(Request $request): JsonResponse
    {
        $profile = $request->genius_profile;
        $business = $profile->business;

        if (!$business) {
            return response()->json([
                'success' => false,
                'message' => 'Business not found.',
            ], 404);
        }

        // Validate prerequisites - need 2 products and 2 staff
        $productsCount = $profile->products()->count();
        $staffCount = $profile->staff()->count();
        $hasEnoughProducts = $productsCount >= 2;
        $hasEnoughStaff = $staffCount >= 2;

        if (!$hasEnoughProducts || !$hasEnoughStaff) {
            return response()->json([
                'success' => false,
                'message' => 'You need at least 2 products and 2 staff members to open your shop!',
                'has_enough_products' => $hasEnoughProducts,
                'has_enough_staff' => $hasEnoughStaff,
                'products_count' => $productsCount,
                'staff_count' => $staffCount,
                'required_products' => 2,
                'required_staff' => 2,
            ], 400);
        }

        // Check if already completed
        if ($business->ribbon_cutting_completed) {
            return response()->json([
                'success' => true,
                'message' => 'Ribbon cutting already completed!',
                'business' => $business,
            ]);
        }

        // Complete the ribbon cutting
        $business->update([
            'shop_launched' => true,
            'launched_at' => now(),
            'ribbon_cutting_completed' => true,
            'ribbon_cutting_at' => now(),
        ]);

        // Award bonus for grand opening
        $rewards = $this->getOrCreateNormalizedRewards($profile);
        $rewards->addAITokens(5);
        $rewards->addXp(200);
        $this->refreshBusinessBalance($profile, $business);

        return response()->json([
            'success' => true,
            'message' => 'Congratulations! Your shop is now open!',
            'business' => $business->fresh(),
            'rewards' => [
                'ai_tokens' => 5,
                'xp' => 200,
            ],
        ]);
    }

    /**
     * Record a sale from the simulator.
     */
    public function recordSimulatorSale(Request $request): JsonResponse
    {
        $request->validate([
            'product_id' => 'required|uuid|exists:aipreneur_products,id',
            // Simulator sale events represent a single checkout conversion.
            'quantity' => 'required|integer|in:1',
        ]);

        $profile = $request->genius_profile;
        $business = $profile->business;

        if (!$business) {
            return response()->json([
                'success' => false,
                'message' => 'Business not found.',
            ], 404);
        }

        if (!(bool) $business->shop_launched) {
            return response()->json([
                'success' => false,
                'message' => 'Shop is not launched yet.',
            ], 403);
        }

        $dailyStats = AIpreneurDailyStats::getOrCreateToday($profile->id);
        $availableVisitorsForConversion = max(
            0,
            (int) ($dailyStats->visitors ?? 0) - (int) ($dailyStats->customers ?? 0)
        );

        if ($availableVisitorsForConversion <= 0) {
            return response()->json([
                'success' => false,
                'message' => 'No available visitors to convert into a sale.',
                'daily_stats' => [
                    'visitors' => (int) ($dailyStats->visitors ?? 0),
                    'customers' => (int) ($dailyStats->customers ?? 0),
                    'remaining_convertible_visitors' => 0,
                ],
            ], 429);
        }

        // Get the product
        $product = AIpreneurProduct::where('id', $request->product_id)
            ->where('student_id', $profile->id)
            ->first();

        if (!$product) {
            return response()->json([
                'success' => false,
                'message' => 'Product not found.',
            ], 404);
        }

        $quantity = $request->quantity;
        $saleAmount = $product->price * $quantity;
        $balance = $this->refreshBusinessBalance($profile, $business);
        $profitMargin = (float) ($balance['profit_margin'] ?? 0.18);
        $profit = round($saleAmount * $profitMargin, 2);

        // Update product stats
        $product->increment('units_sold', $quantity);
        $product->increment('revenue_generated', $saleAmount);

        // Update business stats
        $business->increment('total_sales', $saleAmount);
        $business->increment('total_profit', $profit);

        // Sales no longer mint AI token wallet balance directly.
        $coinsEarned = 0;

        // Record daily stats (customer conversion only; visitors are recorded separately)
        $dailyStats->recordSale($quantity, $saleAmount, $profit, $coinsEarned);
        $dailyStats->updateTrafficBoosts(
            (float) ($balance['marketing_boost'] ?? 0),
            (float) ($balance['innovation_boost'] ?? 0),
            (float) ($balance['decoration_boost'] ?? 0),
            (float) ($balance['traffic_multiplier'] ?? 1)
        );
        $this->refreshBusinessBalance($profile, $business);

        // Create transaction record if the model exists
        if (class_exists(AIpreneurTransaction::class)) {
            AIpreneurTransaction::create([
                'student_id' => $profile->id,
                'type' => AIpreneurTransaction::TYPE_INCOME,
                'category' => AIpreneurTransaction::CATEGORY_PRODUCT_SALE,
                'amount' => $saleAmount,
                'description' => "Sold {$quantity}x {$product->product_name}",
                'coin_balance_after' => 0,
                'token_balance_after' => null,
                'metadata' => [
                    'product_id' => $product->id,
                    'quantity' => $quantity,
                    'profit' => $profit,
                ],
            ]);
        }

        return response()->json([
            'success' => true,
            'sale' => [
                'product_name' => $product->product_name,
                'quantity' => $quantity,
                'amount' => $saleAmount,
                'profit' => $profit,
                'profit_margin' => round($profitMargin * 100, 2) . '%',
                'coins_earned' => $coinsEarned,
            ],
            'product' => $product->fresh(),
            'business' => [
                'total_sales' => $business->total_sales,
                'total_profit' => $business->total_profit,
                'store_visitors' => $business->store_visitors,
                'staff_overall_mood' => $business->staff_overall_mood,
                'popularity_level' => (float) ($business->popularity_level ?? 0),
            ],
            'daily_stats' => [
                'visitors' => $dailyStats->visitors,
                'customers' => $dailyStats->customers,
                'total_revenue' => $dailyStats->total_revenue,
                'total_profit' => $dailyStats->total_profit,
            ],
        ]);
    }

    /**
     * Get traffic multiplier based on shop progress and active marketing.
     * Traffic is calculated from:
     * - Base traffic (starts low, increases with shop setup)
     * - Marketing boost (campaigns, influencers, billboards)
     * - Innovation boost (kiosk, loyalty app, etc.)
     * - Decoration boost (better decorations attract more visitors)
     */
    public function getTrafficMultiplier(Request $request): JsonResponse
    {
        $profile = $request->genius_profile;
        $business = $profile->business;
        if (!$business) {
            return response()->json([
                'success' => false,
                'message' => 'Business not found.',
            ], 404);
        }

        $balance = $this->refreshBusinessBalance($profile, $business);
        $dailyStats = AIpreneurDailyStats::getOrCreateToday($profile->id);
        $dailyStats->updateTrafficBoosts(
            (float) ($balance['marketing_boost'] ?? 0),
            (float) ($balance['innovation_boost'] ?? 0),
            (float) ($balance['decoration_boost'] ?? 0),
            (float) ($balance['traffic_multiplier'] ?? 1)
        );
        $business->refresh();

        return response()->json([
            'success' => true,
            'traffic_multiplier' => round((float) ($balance['traffic_multiplier'] ?? 1), 2),
            'popularity_level' => round((float) ($balance['popularity_level'] ?? 0), 2),
            'staff_overall_mood' => (int) ($balance['effective_staff_mood'] ?? 70),
            'breakdown' => [
                'base_traffic' => round((float) ($balance['base_traffic'] ?? 0), 2),
                'marketing_boost' => round(((float) ($balance['marketing_boost'] ?? 0)) * 100, 1) . '%',
                'influencer_boost_percent' => round((float) ($balance['influencer_boost_percent'] ?? 0), 1) . '%',
                'innovation_boost' => round(((float) ($balance['innovation_boost'] ?? 0)) * 100, 1) . '%',
                'decoration_boost' => round(((float) ($balance['decoration_boost'] ?? 0)) * 100, 1) . '%',
                'staffing_factor' => round((float) ($balance['staffing_factor'] ?? 1), 2),
                'mood_factor' => round((float) ($balance['mood_factor'] ?? 1), 2),
                'overload_penalty' => round((float) ($balance['overload_penalty'] ?? 1), 2),
            ],
            'active_campaigns' => (int) ($balance['active_campaigns'] ?? 0),
            'active_influencers' => (int) ($balance['active_influencers'] ?? 0),
            'billboard_assets' => (int) ($balance['active_marketing_assets'] ?? 0),
            'innovations_count' => (int) ($balance['active_innovations'] ?? 0),
            'overall_progress' => $business->getOverallProgress(),
            'boost_active' => $business?->traffic_boost_expires_at > now(),
            'boost_expires_at' => $business?->traffic_boost_expires_at,
        ]);
    }

    /**
     * Get daily stats for the simulator (today's visitors, sales, etc.).
     */
    public function getDailyStats(Request $request): JsonResponse
    {
        $profile = $request->genius_profile;
        $business = $profile->business;
        if (!$business) {
            return response()->json([
                'success' => false,
                'message' => 'Business not found.',
            ], 404);
        }

        $balance = $this->refreshBusinessBalance($profile, $business);

        // Get today's stats
        $todayStats = AIpreneurDailyStats::getOrCreateToday($profile->id);
        $todayStats->updateTrafficBoosts(
            (float) ($balance['marketing_boost'] ?? 0),
            (float) ($balance['innovation_boost'] ?? 0),
            (float) ($balance['decoration_boost'] ?? 0),
            (float) ($balance['traffic_multiplier'] ?? 1)
        );

        // Get last 7 days of stats for trend
        $weekStats = AIpreneurDailyStats::where('student_id', $profile->id)
            ->where('stat_date', '>=', now()->subDays(7))
            ->orderBy('stat_date', 'desc')
            ->get();

        // Calculate week totals
        $weekTotals = [
            'visitors' => $weekStats->sum('visitors'),
            'customers' => $weekStats->sum('customers'),
            'revenue' => $weekStats->sum('total_revenue'),
            'profit' => $weekStats->sum('total_profit'),
        ];

        $popularityForBudget = (int) round((float) ($balance['popularity_level'] ?? $business->popularity_level ?? 1));
        $dailyVisitorBudget = $this->pricingService->getPopularityDailyVisitorBudget(
            $popularityForBudget,
            (float) ($balance['traffic_multiplier'] ?? 1.0),
            (int) ($balance['products_count'] ?? 0),
            (int) ($balance['staff_count'] ?? 0),
            (int) ($balance['active_innovations'] ?? 0)
        );
        $profitPerVisitorRange = $this->pricingService->getProfitPerVisitorRange();
        $purchaseChancePercent = $this->pricingService->getVisitorPurchaseChancePercent();
        $passiveVisitorIntervalSeconds = $this->pricingService->getPassiveVisitorIntervalSeconds();

        return response()->json([
            'success' => true,
            'today' => [
                'date' => now()->toDateString(),
                'visitors' => $todayStats->visitors,
                'customers' => $todayStats->customers,
                'sales_count' => $todayStats->total_sales_count,
                'units_sold' => $todayStats->total_units_sold,
                'revenue' => (float) $todayStats->total_revenue,
                'profit' => (float) $todayStats->total_profit,
                'coins_earned' => $todayStats->coins_earned,
                'traffic_multiplier' => (float) $todayStats->final_multiplier,
                'popularity_level' => round((float) ($business->popularity_level ?? 0), 2),
                'staff_overall_mood' => (int) ($business->staff_overall_mood ?? 70),
                'daily_visitor_budget' => $dailyVisitorBudget,
            ],
            'week' => $weekTotals,
            'history' => $weekStats->map(fn($stat) => [
                'date' => $stat->stat_date->toDateString(),
                'visitors' => $stat->visitors,
                'customers' => $stat->customers,
                'revenue' => (float) $stat->total_revenue,
                'profit' => (float) $stat->total_profit,
            ]),
            'all_time' => [
                'total_sales' => (float) ($business->total_sales ?? 0),
                'total_profit' => (float) ($business->total_profit ?? 0),
                'store_visitors' => $business->store_visitors ?? 0,
                'popularity_level' => round((float) ($business->popularity_level ?? 0), 2),
                'staff_overall_mood' => (int) ($business->staff_overall_mood ?? 70),
            ],
            'economy' => [
                'daily_visitor_budget' => $dailyVisitorBudget,
                'profit_per_visitor' => $profitPerVisitorRange,
                'visitor_purchase_chance_percent' => $purchaseChancePercent,
                'passive_visitor_interval_seconds' => $passiveVisitorIntervalSeconds,
            ],
        ]);
    }

    /**
     * Record a visitor (someone who enters the shop without necessarily buying).
     */
    public function recordVisitor(Request $request): JsonResponse
    {
        $request->validate([
            'count' => 'nullable|integer|min:1|max:200',
        ]);

        $profile = $request->genius_profile;
        $business = $profile->business;
        $count = (int) $request->input('count', 1);

        if (!$business) {
            return response()->json([
                'success' => false,
                'message' => 'Business not found.',
            ], 404);
        }

        if (!(bool) $business->shop_launched) {
            return response()->json([
                'success' => false,
                'message' => 'Shop is not launched yet.',
            ], 403);
        }

        $dailyStats = AIpreneurDailyStats::getOrCreateToday($profile->id);
        $balance = $this->refreshBusinessBalance($profile, $business);
        $dailyVisitorBudget = $this->pricingService->getPopularityDailyVisitorBudget(
            (int) round((float) ($balance['popularity_level'] ?? $business->popularity_level ?? 1)),
            (float) ($balance['traffic_multiplier'] ?? 1.0),
            (int) ($balance['products_count'] ?? 0),
            (int) ($balance['staff_count'] ?? 0),
            (int) ($balance['active_innovations'] ?? 0)
        );
        $remainingBudgetBeforeTick = max(0, $dailyVisitorBudget - (int) ($dailyStats->visitors ?? 0));
        $recordedCount = min($count, $remainingBudgetBeforeTick);

        if ($recordedCount <= 0) {
            return response()->json([
                'success' => true,
                'recorded_count' => 0,
                'daily_visitors' => (int) ($dailyStats->visitors ?? 0),
                'daily_visitor_budget' => $dailyVisitorBudget,
                'remaining_daily_visitors' => 0,
                'total_visitors' => (int) ($business->store_visitors ?? 0),
                'traffic_multiplier' => round((float) ($balance['traffic_multiplier'] ?? 1), 2),
                'popularity_level' => round((float) ($business->popularity_level ?? 0), 2),
            ]);
        }

        $dailyStats->increment('visitors', $recordedCount);

        // Update business total visitors
        $business->increment('store_visitors', $recordedCount);
        $balance = $this->refreshBusinessBalance($profile, $business);
        $dailyStats->updateTrafficBoosts(
            (float) ($balance['marketing_boost'] ?? 0),
            (float) ($balance['innovation_boost'] ?? 0),
            (float) ($balance['decoration_boost'] ?? 0),
            (float) ($balance['traffic_multiplier'] ?? 1)
        );

        $dailyStats->refresh();
        $business->refresh();

        return response()->json([
            'success' => true,
            'recorded_count' => $recordedCount,
            'daily_visitors' => $dailyStats->visitors,
            'daily_visitor_budget' => $dailyVisitorBudget,
            'remaining_daily_visitors' => max(0, $dailyVisitorBudget - (int) ($dailyStats->visitors ?? 0)),
            'total_visitors' => $business->store_visitors,
            'traffic_multiplier' => round((float) ($balance['traffic_multiplier'] ?? 1), 2),
            'popularity_level' => round((float) ($business->popularity_level ?? 0), 2),
        ]);
    }

    /**
     * Regenerate product image.
     */
    public function regenerateProductImage(Request $request, string $productId): JsonResponse
    {
        $profile = $request->genius_profile;
        $product = AIpreneurProduct::where('id', $productId)
            ->where('student_id', $profile->id)
            ->first();

        if (!$product) {
            return response()->json([
                'success' => false,
                'message' => 'Product not found.',
            ], 404);
        }

        $tokenCost = $this->getTokenCostFor('product_regenerate');
        $rewards = $this->getOrCreateNormalizedRewards($profile);
        $currentBalance = (int) ($rewards->ai_tokens ?? 0);
        if ($currentBalance < $tokenCost) {
            return response()->json([
                'success' => false,
                'message' => "Not enough AI tokens. Need {$tokenCost}, have {$currentBalance}.",
                'required_ai_tokens' => $tokenCost,
            ], 400);
        }
        if (!$rewards->spendAITokens($tokenCost)) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to spend AI tokens.',
            ], 500);
        }

        // Set status to pending and dispatch job
        $product->update([
            'image_status' => 'pending',
            'image_error' => null,
        ]);

        GenerateProductImageJob::dispatch($product->id);

        return response()->json([
            'success' => true,
            'message' => 'Image regeneration started.',
            'product' => $product->fresh(),
            'tokens_charged' => $tokenCost,
        ]);
    }

    /**
     * Remix product image (image-to-image).
     */
    public function remixProductImage(Request $request, string $productId): JsonResponse
    {
        $request->validate([
            'image_data' => 'nullable|string',
            'prompt_hint' => 'nullable|string|max:500',
        ]);

        $profile = $request->genius_profile;
        $product = AIpreneurProduct::where('id', $productId)
            ->where('student_id', $profile->id)
            ->first();

        if (!$product) {
            return response()->json([
                'success' => false,
                'message' => 'Product not found.',
            ], 404);
        }

        $tokenCost = $this->getTokenCostFor('product_regenerate');
        $rewards = $this->getOrCreateNormalizedRewards($profile);
        $currentBalance = (int) ($rewards->ai_tokens ?? 0);
        if ($currentBalance < $tokenCost) {
            return response()->json([
                'success' => false,
                'message' => "Not enough AI tokens. Need {$tokenCost}, have {$currentBalance}.",
                'required_ai_tokens' => $tokenCost,
            ], 400);
        }
        if (!$rewards->spendAITokens($tokenCost)) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to spend AI tokens.',
            ], 500);
        }

        Storage::disk('local')->makeDirectory('tmp');

        $tempPath = null;
        $inputData = $request->image_data;

        if ($inputData) {
            $extension = 'png';
            $base64 = $inputData;
            if (preg_match('/^data:image\/(\w+);base64,/', $inputData, $matches)) {
                $extension = strtolower($matches[1]);
                $base64 = substr($inputData, strpos($inputData, ',') + 1);
            }
            $decoded = base64_decode($base64);
            if ($decoded === false) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid image data.',
                ], 422);
            }
            $tempPath = 'tmp/product_remix_' . $product->id . '_' . time() . '.' . $extension;
            Storage::disk('local')->put($tempPath, $decoded);
        } else {
            if (empty($product->image_url)) {
                return response()->json([
                    'success' => false,
                    'message' => 'No base image found for remix.',
                ], 422);
            }

            try {
                $imageContent = Http::timeout(30)->get($product->image_url)->body();
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to fetch base image.',
                ], 500);
            }

            if (empty($imageContent)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Base image is empty.',
                ], 500);
            }

            $tempPath = 'tmp/product_remix_' . $product->id . '_' . time() . '.png';
            Storage::disk('local')->put($tempPath, $imageContent);
        }

        $product->update([
            'image_status' => 'pending',
            'image_error' => null,
        ]);

        $absolutePath = Storage::disk('local')->path($tempPath);
        RemixProductImageJob::dispatch($product->id, $absolutePath, $request->prompt_hint);

        return response()->json([
            'success' => true,
            'product' => $product->fresh(),
            'image_status' => 'pending',
            'tokens_charged' => $tokenCost,
        ]);
    }

    private function getTokenCostFor(string $operationKey): int
    {
        $fallback = AIpreneurPricingService::DEFAULT_TOKEN_COSTS[$operationKey] ?? 0;
        return $this->pricingService->getTokenCost($operationKey, $fallback);
    }

    private function resolveInfluencerDurationMultiplier(int $durationHours): float
    {
        return $this->pricingService->getInfluencerDurationMultiplier($durationHours);
    }

    // =============================================
    // HELPER METHODS
    // =============================================

    /**
     * Server-authoritative anti-cheat guard for exterior decoration ownership.
     * Rejects equipping paid exterior items unless they are already owned or can
     * be unlocked right now using remaining free changes / token balance.
     */
    private function guardExteriorDecorationOwnership(
        GeniusProfile $profile,
        AIpreneurBusiness $business,
        array $currentExteriorConfig,
        array $currentInteriorConfig,
        array $resolvedExteriorConfig,
        array $resolvedInteriorConfig,
        array $touchedExteriorCategories
    ): array {
        $catalog = self::EXTERIOR_DECORATION_CATALOG;

        $paidItemCosts = [];
        foreach ($catalog as $items) {
            foreach ($items as $itemId => $legacyCost) {
                if ((int) $legacyCost > 0) {
                    $paidItemCosts[$itemId] = (int) $legacyCost;
                }
            }
        }

        // Validate touched categories against authoritative catalog.
        foreach ($touchedExteriorCategories as $category) {
            if (!array_key_exists($category, $catalog)) {
                continue;
            }
            $requestedItemId = $resolvedExteriorConfig[$category] ?? null;
            if (!is_string($requestedItemId) || !array_key_exists($requestedItemId, $catalog[$category])) {
                throw new \RuntimeException("Invalid exterior selection for {$category}.");
            }
        }

        $currentEconomyMeta = is_array($currentInteriorConfig['economy_meta'] ?? null)
            ? $currentInteriorConfig['economy_meta']
            : [];

        $serverOwnedPaid = $this->normalizePaidExteriorPurchasedItems(
            $currentEconomyMeta['purchased_items'] ?? [],
            array_keys($paidItemCosts)
        );

        // Backward compatibility: treat currently equipped paid exterior items as owned.
        foreach ($catalog as $category => $items) {
            $equippedItemId = $currentExteriorConfig[$category] ?? null;
            if (is_string($equippedItemId) && array_key_exists($equippedItemId, $paidItemCosts)) {
                $serverOwnedPaid[] = $equippedItemId;
            }
        }
        $ownedPaidSet = array_fill_keys(array_values(array_unique($serverOwnedPaid)), true);

        $freeChangesTotal = $this->pricingService->getDecorateFreeExteriorChangesTotal();
        $existingFreeUsed = $this->normalizeExteriorFreeChangesUsed(
            $currentEconomyMeta['free_exterior_changes_used'] ?? 0,
            $freeChangesTotal
        );
        $freeRemaining = max(0, $freeChangesTotal - $existingFreeUsed);
        $adminFreeAccessEnabled = $this->pricingService->areExteriorDecorationsFree();

        // New unlock candidates = paid items currently being equipped but not already owned.
        $unlockCandidates = [];
        foreach ($catalog as $category => $items) {
            $requestedItemId = $resolvedExteriorConfig[$category] ?? null;
            if (!is_string($requestedItemId) || !array_key_exists($requestedItemId, $items)) {
                continue;
            }

            $legacyCost = (int) $items[$requestedItemId];
            if ($legacyCost <= 0) {
                continue;
            }

            if (!isset($ownedPaidSet[$requestedItemId])) {
                $unlockCandidates[$requestedItemId] = $legacyCost;
            }
        }

        $unlockItemIds = array_keys($unlockCandidates);
        $freeUnlockCount = $adminFreeAccessEnabled ? 0 : min($freeRemaining, count($unlockItemIds));
        $freeUnlockedItemIds = $adminFreeAccessEnabled
            ? $unlockItemIds
            : array_slice($unlockItemIds, 0, $freeUnlockCount);
        $paidUnlockItemIds = $adminFreeAccessEnabled
            ? []
            : array_slice($unlockItemIds, $freeUnlockCount);

        $tokenCostsByItem = [];
        $requiredTokens = 0;
        foreach ($paidUnlockItemIds as $itemId) {
            $cost = $this->mapDecorationLegacyCostToTokenCost($unlockCandidates[$itemId]);
            $tokenCostsByItem[$itemId] = $cost;
            $requiredTokens += $cost;
        }

        $tokenBalanceAfter = null;
        if ($requiredTokens > 0) {
            $rewards = $this->getOrCreateNormalizedRewards($profile);
            $currentBalance = (int) ($rewards->ai_tokens ?? 0);

            if ($currentBalance < $requiredTokens) {
                throw new \RuntimeException(
                    "Not enough AI tokens to unlock exterior items. Need {$requiredTokens}, have {$currentBalance}."
                );
            }

            if (!$rewards->spendAITokens($requiredTokens)) {
                throw new \RuntimeException('Failed to spend AI tokens for exterior unlock.');
            }

            $rewards = $rewards->fresh();
            $tokenBalanceAfter = (int) ($rewards->ai_tokens ?? 0);

            AIpreneurTransaction::create([
                'student_id' => $profile->id,
                'type' => AIpreneurTransaction::TYPE_EXPENSE,
                'category' => AIpreneurTransaction::CATEGORY_DECORATION,
                'description' => 'Exterior decoration unlock',
                'amount' => 0,
                'tokens' => $requiredTokens,
                'coin_balance_after' => 0,
                'token_balance_after' => $tokenBalanceAfter,
                'metadata' => [
                    'unlock_item_ids' => $paidUnlockItemIds,
                    'token_costs' => $tokenCostsByItem,
                    'source' => 'business_update',
                ],
            ]);
        }

        foreach ($unlockItemIds as $itemId) {
            $ownedPaidSet[$itemId] = true;
        }

        // Final hard enforcement: every paid equipped exterior item must be owned.
        foreach ($catalog as $category => $items) {
            $requestedItemId = $resolvedExteriorConfig[$category] ?? null;
            if (!is_string($requestedItemId) || !array_key_exists($requestedItemId, $items)) {
                continue;
            }

            $legacyCost = (int) $items[$requestedItemId];
            if ($legacyCost > 0 && !isset($ownedPaidSet[$requestedItemId])) {
                throw new \RuntimeException("Exterior item '{$requestedItemId}' is not owned.");
            }
        }

        $finalOwnedPaidItems = array_keys($ownedPaidSet);
        sort($finalOwnedPaidItems);

        $nextFreeUsed = min(
            $freeChangesTotal,
            $existingFreeUsed + $freeUnlockCount
        );
        if ($adminFreeAccessEnabled) {
            $nextFreeUsed = $existingFreeUsed;
        }

        $serverOwnedPaidSorted = array_values(array_unique($serverOwnedPaid));
        sort($serverOwnedPaidSorted);
        $economyChanged = $serverOwnedPaidSorted !== $finalOwnedPaidItems || $existingFreeUsed !== $nextFreeUsed;

        $requestedEconomyMeta = is_array($resolvedInteriorConfig['economy_meta'] ?? null)
            ? $resolvedInteriorConfig['economy_meta']
            : [];

        $economyVersion = max(
            1,
            (int) ($currentEconomyMeta['version'] ?? 1),
            (int) ($requestedEconomyMeta['version'] ?? 1)
        );

        $economyMeta = [
            'version' => $economyVersion,
            'free_exterior_changes_used' => $nextFreeUsed,
            'purchased_items' => $finalOwnedPaidItems,
            'updated_at' => $economyChanged
                ? now()->toIso8601String()
                : ($currentEconomyMeta['updated_at'] ?? now()->toIso8601String()),
        ];

        $resolvedInteriorConfig['economy_meta'] = $economyMeta;

        return [
            'exterior_config' => $resolvedExteriorConfig,
            'interior_config' => $resolvedInteriorConfig,
            'forced_economy_sync' => $economyChanged || !is_array($currentInteriorConfig['economy_meta'] ?? null),
            'unlock_context' => [
                'new_unlocks' => $unlockItemIds,
                'free_unlocks_used' => $freeUnlockCount,
                'free_unlock_items' => $freeUnlockedItemIds,
                'paid_unlock_items' => $paidUnlockItemIds,
                'ai_tokens_spent' => $requiredTokens,
                'token_costs' => $tokenCostsByItem,
                'free_exterior_changes_remaining' => max(0, $freeChangesTotal - $nextFreeUsed),
                'token_balance_after' => $tokenBalanceAfter,
                'admin_free_access' => $adminFreeAccessEnabled,
            ],
        ];
    }

    private function normalizePaidExteriorPurchasedItems($rawPurchasedItems, array $allowedPaidItemIds): array
    {
        if (!is_array($rawPurchasedItems)) {
            return [];
        }

        $allowedLookup = array_fill_keys($allowedPaidItemIds, true);
        $normalized = [];
        foreach ($rawPurchasedItems as $itemId) {
            if (is_string($itemId) && isset($allowedLookup[$itemId])) {
                $normalized[] = $itemId;
            }
        }

        return array_values(array_unique($normalized));
    }

    private function normalizeExteriorFreeChangesUsed($value, ?int $maxFreeChanges = null): int
    {
        if (!is_numeric($value)) {
            return 0;
        }

        $maxAllowed = $maxFreeChanges ?? $this->pricingService->getDecorateFreeExteriorChangesTotal();
        return max(0, min($maxAllowed, (int) $value));
    }

    private function mapDecorationLegacyCostToTokenCost(int $legacyCost): int
    {
        if ($legacyCost <= 0) {
            return 0;
        }

        $divisor = $this->pricingService->getDecorateTokenDivisor();
        return (int) ceil($legacyCost / max(1, $divisor));
    }

    /**
     * Ensure rewards record exists and migrate legacy coin balance into AI tokens once.
     */
    private function getOrCreateNormalizedRewards(GeniusProfile $profile): AIpreneurReward
    {
        $rewards = $profile->rewards;

        if (!$rewards) {
            $rewards = AIpreneurReward::create([
                'student_id' => $profile->id,
                'coins' => 0,
                'ai_tokens' => 0,
            ]);
        }

        $legacyCoins = (int) ($rewards->coins ?? 0);
        if ($legacyCoins > 0) {
            $rewards->ai_tokens = (int) ($rewards->ai_tokens ?? 0) + $legacyCoins;
            $rewards->coins = 0;
            $rewards->save();
        }

        if ((int) $rewards->coins !== 0) {
            $rewards->coins = 0;
            $rewards->save();
        }

        return $rewards->fresh();
    }

    /**
     * Generate a unique redemption code for reward-store orders.
     */
    private function generateRewardRedemptionCode(): string
    {
        do {
            $code = 'RW-' . strtoupper(Str::random(8));
        } while (Redemption::query()->where('code', $code)->exists());

        return $code;
    }

    /**
     * Build a simple persona profile from quiz answers.
     * Placeholder for AI-driven analysis.
     */
    private function buildPersonaProfileFromAnswers(array $answers): array
    {
        if (empty($answers)) {
            return [
                'strengths' => ['Creativity', 'Curiosity', 'Problem Solving'],
                'growth_areas' => ['Patience', 'Organization'],
                'learning_style' => 'visual',
                'fun_facts' => ['Loves colors', 'Enjoys building things'],
                'trait_scores' => [
                    'Agility' => 75,
                    'Intelligence' => 75,
                    'Creativity' => 75,
                    'Focus' => 75,
                    'Empathy' => 75,
                ],
            ];
        }

        $learningCounts = ['visual' => 0, 'handson' => 0, 'verbal' => 0, 'logical' => 0];
        $behaviourCounts = ['initiator' => 0, 'thinker' => 0, 'observer' => 0, 'feeler' => 0];
        $curiosityCounts = ['explorer' => 0, 'builder' => 0, 'questioner' => 0, 'story_dreamer' => 0];
        $lastLearning = null;
        $lastBehaviour = null;
        $lastCuriosity = null;

        $traitScores = [
            'Agility' => 60,
            'Intelligence' => 60,
            'Creativity' => 60,
            'Focus' => 60,
            'Empathy' => 60,
        ];

        $boosts = [
            'learning_style' => [
                'visual' => ['Creativity' => 5, 'Focus' => 3],
                'handson' => ['Agility' => 5, 'Creativity' => 3],
                'verbal' => ['Empathy' => 5, 'Focus' => 3],
                'logical' => ['Intelligence' => 5, 'Focus' => 3],
            ],
            'behaviour_tendency' => [
                'initiator' => ['Agility' => 5, 'Focus' => 2],
                'thinker' => ['Intelligence' => 5, 'Focus' => 4],
                'observer' => ['Empathy' => 4, 'Focus' => 3],
                'feeler' => ['Empathy' => 5, 'Creativity' => 2],
            ],
            'curiosity_type' => [
                'explorer' => ['Agility' => 4, 'Creativity' => 3],
                'builder' => ['Creativity' => 5, 'Focus' => 3],
                'questioner' => ['Intelligence' => 4, 'Focus' => 3],
                'story_dreamer' => ['Creativity' => 4, 'Empathy' => 3],
            ],
        ];

        foreach ($answers as $answer) {
            $impacts = $answer['trait_impacts'] ?? $answer['traitImpacts'] ?? [];
            if (!is_array($impacts)) {
                continue;
            }

            if (isset($impacts['learning_style']) && isset($learningCounts[$impacts['learning_style']])) {
                $learningCounts[$impacts['learning_style']]++;
                $lastLearning = $impacts['learning_style'];
                foreach ($boosts['learning_style'][$impacts['learning_style']] as $trait => $value) {
                    $traitScores[$trait] += $value;
                }
            }

            if (isset($impacts['behaviour_tendency']) && isset($behaviourCounts[$impacts['behaviour_tendency']])) {
                $behaviourCounts[$impacts['behaviour_tendency']]++;
                $lastBehaviour = $impacts['behaviour_tendency'];
                foreach ($boosts['behaviour_tendency'][$impacts['behaviour_tendency']] as $trait => $value) {
                    $traitScores[$trait] += $value;
                }
            }

            if (isset($impacts['curiosity_type']) && isset($curiosityCounts[$impacts['curiosity_type']])) {
                $curiosityCounts[$impacts['curiosity_type']]++;
                $lastCuriosity = $impacts['curiosity_type'];
                foreach ($boosts['curiosity_type'][$impacts['curiosity_type']] as $trait => $value) {
                    $traitScores[$trait] += $value;
                }
            }
        }

        $learningStyle = $this->pickDominantTrait($learningCounts, $lastLearning, 'visual');
        $behaviourTendency = $this->pickDominantTrait($behaviourCounts, $lastBehaviour, 'thinker');
        $curiosityType = $this->pickDominantTrait($curiosityCounts, $lastCuriosity, 'explorer');

        foreach ($traitScores as $trait => $score) {
            $traitScores[$trait] = max(50, min(95, $score));
        }

        $sortedTraits = $traitScores;
        arsort($sortedTraits);
        $strengthTraitKeys = array_slice(array_keys($sortedTraits), 0, 2);
        $growthTraitKeys = array_slice(array_keys($sortedTraits), -2);

        $traitDescriptions = [
            'Agility' => 'Quick Action',
            'Intelligence' => 'Smart Thinking',
            'Creativity' => 'Creative Ideas',
            'Focus' => 'Staying on Task',
            'Empathy' => 'Caring Heart',
        ];

        $strengths = array_values(array_map(
            fn($trait) => $traitDescriptions[$trait] ?? $trait,
            $strengthTraitKeys
        ));

        $growthAreas = array_values(array_map(
            fn($trait) => $traitDescriptions[$trait] ?? $trait,
            $growthTraitKeys
        ));

        $funFacts = [
            "Learning style: {$learningStyle}",
            "Curiosity: {$curiosityType}",
            "Behavior: {$behaviourTendency}",
        ];

        return [
            'strengths' => $strengths,
            'growth_areas' => $growthAreas,
            'learning_style' => $learningStyle,
            'fun_facts' => $funFacts,
            'trait_scores' => $traitScores,
        ];
    }

    private function pickDominantTrait(array $counts, ?string $lastSeen, string $fallback): string
    {
        if (empty($counts)) {
            return $fallback;
        }

        $max = max($counts);
        $top = array_keys(array_filter($counts, fn($v) => $v === $max));

        if (count($top) === 1) {
            return $top[0];
        }

        if ($lastSeen && in_array($lastSeen, $top, true)) {
            return $lastSeen;
        }

        return $top[0] ?? $fallback;
    }

    private function storeBase64Image(string $inputData, string $directory, string $prefix): ?string
    {
        $extension = 'png';
        $base64 = $inputData;

        if (preg_match('/^data:image\/(\w+);base64,/', $inputData, $matches)) {
            $extension = strtolower($matches[1] ?? 'png');
            $base64 = substr($inputData, strpos($inputData, ',') + 1);
        }

        $decoded = base64_decode($base64);

        if ($decoded === false) {
            return null;
        }

        Storage::disk('public')->makeDirectory($directory);
        $filename = $prefix . '_' . time() . '_' . Str::random(6) . '.' . $extension;
        Storage::disk('public')->put($directory . '/' . $filename, $decoded);

        return url('/storage/' . $directory . '/' . $filename);
    }

    private function buildInteriorAssetPrompt(string $category, string $theme, ?string $hint, ?int $age = null): string
    {
        $themeDescriptions = [
            'colorful' => 'bright, vibrant colors with playful accents',
            'modern' => 'sleek, clean, modern look',
            'cozy' => 'warm, natural textures with soft tones',
            'fancy' => 'premium, elegant style with gold accents',
            'cute' => 'kawaii, pastel colors with adorable style',
        ];

        $themeDesc = $themeDescriptions[$theme] ?? 'colorful and appealing';
        $hintText = $hint ? " Special request: {$hint}." : '';
        $ageText = $age ? " Make it age-appropriate for a {$age}-year-old kid." : ' Make it kid-friendly and age-appropriate.';

        if ($category === 'floor') {
            return "Remix the provided drawing into a seamless floor texture. "
                . "Style: {$themeDesc}, 3D cartoon look, clean and playful.{$hintText}{$ageText} "
                . "Make it tileable, with subtle pattern repetition and no harsh edges. "
                . "Top-down texture view, no perspective, no shadows.";
        }

        if ($category === 'wall') {
            return "Remix the provided drawing into a seamless wall texture. "
                . "Style: {$themeDesc}, 3D cartoon look, bright and friendly.{$hintText}{$ageText} "
                . "Make it tileable, soft gradients, gentle pattern. "
                . "Front-facing flat texture, no perspective, no shadows.";
        }

        return "Remix the provided drawing into a cute potted plant asset. "
            . "Style: {$themeDesc}, 3D cartoon look, fun and colorful.{$hintText}{$ageText} "
            . "Center the plant, keep it clean and recognizable, transparent or clean background.";
    }

    private function buildMarketingAssetPrompt(string $assetType, ?string $hint, ?int $age = null): string
    {
        $hintText = $hint ? " Special request: {$hint}." : '';
        $ageText = $age ? " Make it age-appropriate for a {$age}-year-old kid." : ' Make it kid-friendly and age-appropriate.';

        $base = "Remix the provided image into a bright, playful marketing design. "
            . "Keep the main subject clear and centered. Add clean space for text overlays.{$hintText}{$ageText} ";

        if ($assetType === 'banner') {
            return $base . "Style: wide website banner, horizontal layout, bold and cheerful, easy to read.";
        }

        if ($assetType === 'billboard') {
            return $base . "Style: large outdoor billboard, high contrast, simple layout, bold attention-grabbing look.";
        }

        if ($assetType === 'social_post') {
            return $base . "Style: square social post, vibrant colors, fun stickers or sparkles, short text space.";
        }

        if ($assetType === 'poster') {
            $posterStyles = [
                "Style: retro cinema poster with bold title text, dramatic lighting, vintage color palette, star burst effects, classic movie poster composition.",
                "Style: neon glow poster with electric bright colors, glowing outlines, dark background, cyberpunk-inspired futuristic look, eye-catching neon accents.",
                "Style: comic book poster with halftone dots, bold outlines, action lines, speech bubbles, pop art colors, superhero comic cover feel.",
                "Style: watercolor art poster with soft painted textures, dreamy pastel gradients, artistic brush strokes, gallery-quality fine art look.",
                "Style: kawaii cute poster with rounded bubbly shapes, pastel rainbow colors, sparkle effects, adorable cartoon characters, sweet and playful.",
                "Style: space galaxy poster with cosmic nebula background, stars, planets, glowing aurora effects, epic sci-fi adventure feel.",
                "Style: graffiti street art poster with spray paint textures, bold urban colors, brick wall background, edgy street style typography.",
                "Style: pixel art retro game poster with 8-bit style graphics, pixelated characters, classic arcade game colors, nostalgic gaming feel.",
            ];
            $randomStyle = $posterStyles[array_rand($posterStyles)];
            return $base . $randomStyle;
        }

        return $base . "Style: flyer, clean layout, friendly icons, short text space for promotions.";
    }

    private function callGptImage1Edit(string $prompt, string $imagePath): array
    {
        $apiKey = config('services.openai.api_key');

        if (!$apiKey) {
            return ['success' => false, 'error' => 'OpenAI API key not configured'];
        }

        try {
            if (!file_exists($imagePath)) {
                return ['success' => false, 'error' => 'Input image not found'];
            }

            $response = Http::timeout(180)
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $apiKey,
                ])
                ->attach('image', file_get_contents($imagePath), 'input.png')
                ->post('https://api.openai.com/v1/images/edits', [
                    'model' => 'gpt-image-1',
                    'prompt' => $prompt,
                    'n' => 1,
                    'size' => '1024x1024',
                    'quality' => 'medium',
                ]);

            if ($response->failed()) {
                $errorBody = $response->json();
                $errorMessage = $errorBody['error']['message'] ?? $response->body();
                return ['success' => false, 'error' => "OpenAI API Error: {$errorMessage}"];
            }

            $result = $response->json();

            if (isset($result['data'][0]['b64_json'])) {
                return [
                    'success' => true,
                    'image_data' => base64_decode($result['data'][0]['b64_json']),
                ];
            }

            if (isset($result['data'][0]['url'])) {
                $imageData = Http::timeout(60)->get($result['data'][0]['url'])->body();
                return ['success' => true, 'image_data' => $imageData];
            }

            return ['success' => false, 'error' => 'Invalid API response: Missing image data'];
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    private function generateUniqueGeniusId(): string
    {
        do {
            $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            $id = 'GENIUS-';
            for ($i = 0; $i < 6; $i++) {
                $id .= $chars[rand(0, strlen($chars) - 1)];
            }
        } while (GeniusProfile::where('genius_id', $id)->exists());

        return $id;
    }

    private function generateMemorablePassword(): string
    {
        $adjectives = ['Happy', 'Sunny', 'Magic', 'Super', 'Bright', 'Lucky', 'Swift', 'Brave'];
        $nouns = ['Star', 'Moon', 'Rainbow', 'Tiger', 'Dragon', 'Eagle', 'Phoenix', 'Panda'];
        $number = rand(10, 99);
        $symbols = ['!', '@', '#', '*'];

        return $adjectives[array_rand($adjectives)] .
            $nouns[array_rand($nouns)] .
            $number .
            $symbols[array_rand($symbols)];
    }

    private function generateRandomNPC(string $role): array
    {
        $firstNames = ['Alex', 'Sam', 'Jordan', 'Taylor', 'Casey', 'Riley', 'Morgan', 'Jamie'];
        $traits = ['Friendly', 'Creative', 'Organized', 'Energetic', 'Patient', 'Cheerful'];
        $skills = [
            'cashier' => ['math', 'customer_service', 'attention_to_detail'],
            'chef' => ['cooking', 'creativity', 'time_management'],
            'cleaner' => ['cleaning', 'organization', 'efficiency'],
            'greeter' => ['communication', 'empathy', 'friendliness'],
            'stock_manager' => ['organization', 'counting', 'lifting'],
            'security' => ['alertness', 'communication', 'problem_solving'],
        ];

        return [
            'name' => $firstNames[array_rand($firstNames)],
            'avatar' => '/avatars/npc-' . rand(1, 8) . '.png',
            'personality' => [
                'trait' => $traits[array_rand($traits)],
                'skills' => $skills[$role] ?? ['general'],
                'hobbies' => ['music', 'sports', 'reading', 'gaming'][array_rand(['music', 'sports', 'reading', 'gaming'], 2)],
            ],
        ];
    }

    private function calculateHappinessBoost(string $theme): float
    {
        $boosts = [
            'fun_colorful' => 15,
            'eco_natural' => 12,
            'modern_clean' => 10,
            'cute_cozy' => 18,
            'futuristic_techy' => 8,
            'holiday_travel' => 14,
            'luxury_premium' => 16,
            'retro_vintage' => 11,
        ];

        return $boosts[$theme] ?? 10;
    }

    private function calculatePriceMultiplier(string $theme): float
    {
        $multipliers = [
            'fun_colorful' => 1.0,
            'eco_natural' => 1.1,
            'modern_clean' => 1.15,
            'cute_cozy' => 1.05,
            'futuristic_techy' => 1.2,
            'holiday_travel' => 1.1,
            'luxury_premium' => 1.3,
            'retro_vintage' => 1.1,
        ];

        return $multipliers[$theme] ?? 1.0;
    }

    private function calculateCampaignResults(int $budget, array $channels): array
    {
        $channelMultipliers = [
            'school' => 2,
            'social_media' => 3,
            'magazine' => 1.5,
            'friends' => 1,
            'video' => 4,
            'billboard' => 2.5,
        ];

        $totalMultiplier = 0;
        foreach ($channels as $channel) {
            $totalMultiplier += $channelMultipliers[$channel] ?? 1;
        }

        $reach = (int) ($budget * $totalMultiplier * rand(5, 15));
        $likes = (int) ($reach * (rand(10, 30) / 100));
        $newVisitors = (int) ($likes * (rand(20, 50) / 100));
        $profit = $newVisitors * rand(2, 5);
        $roi = $budget > 0 ? (($profit - $budget) / $budget) * 100 : 0;

        return [
            'reach' => $reach,
            'likes' => $likes,
            'new_visitors' => $newVisitors,
            'profit' => $profit,
            'roi' => round($roi, 2),
        ];
    }

    private function clampFloat(float $value, float $min, float $max): float
    {
        return min($max, max($min, $value));
    }

    private function normalizeActiveInnovationLimit(GeniusProfile $profile): void
    {
        if (!$this->hasInnovationActivationColumn()) {
            return;
        }

        $activeInnovations = $this->activeInnovationsQuery($profile)
            ->orderByDesc('updated_at')
            ->get();

        if ($activeInnovations->count() <= AIpreneurInnovation::MAX_ACTIVE_TECH) {
            return;
        }

        $idsToDeactivate = $activeInnovations
            ->slice(AIpreneurInnovation::MAX_ACTIVE_TECH)
            ->pluck('id')
            ->all();

        if (!empty($idsToDeactivate)) {
            AIpreneurInnovation::whereIn('id', $idsToDeactivate)->update(['is_active' => false]);
        }
    }

    private function calculateGameBalance(GeniusProfile $profile, AIpreneurBusiness $business): array
    {
        $this->normalizeActiveInnovationLimit($profile);

        $overallProgress = $business->getOverallProgress();
        $productsCount = max(0, $profile->products()->count());

        $staffRecords = $profile->staff()->get(['mood']);
        $staffCount = $staffRecords->count();
        $avgStaffMood = $staffCount > 0 ? (float) $staffRecords->avg('mood') : 70.0;

        $requiredStaff = max(1, (int) ceil(max(1, $productsCount) / 2));
        $staffRatio = $staffCount / $requiredStaff;
        $staffingFactor = $this->clampFloat($staffRatio, 0.35, 1.15);

        $productOverload = max(0, $productsCount - ($staffCount * 2));
        $overloadPenalty = $this->clampFloat(1 - ($productOverload * 0.08), 0.45, 1.0);

        $activeCampaigns = $profile->campaigns()
            ->where('launched_at', '>=', now()->subDays(7))
            ->count();
        $activeInfluencerCampaigns = $profile->influencerCampaigns()
            ->where('ended_at', '>=', now())
            ->where('status', 'active')
            ->get(['influencer_tier']);
        $activeInfluencers = $activeInfluencerCampaigns->count();
        $activeMarketingAssets = $profile->marketingAssets()
            ->whereIn('asset_type', ['billboard', 'banner', 'social_post', 'flyer', 'tv_spot'])
            ->where('is_active', true)
            ->count();
        $influencerBoostPercent = (float) $activeInfluencerCampaigns
            ->sum(function ($campaign) {
                $tier = (string) ($campaign->influencer_tier ?? 'nano');
                return $this->pricingService->getAverageInfluencerBoostPercent($tier);
            });
        $influencerBoostCapPercent = (float) $this->pricingService->getInfluencerMarketingBoostCapPercent();
        $influencerBoost = min($influencerBoostCapPercent / 100, $influencerBoostPercent / 100);
        $marketingBoost = min(
            0.75,
            ($activeCampaigns * 0.045) + $influencerBoost + ($activeMarketingAssets * 0.03)
        );

        $activeInnovations = AIpreneurInnovation::where('student_id', $profile->id)
            ->orderByDesc('updated_at')
            ->when(
                $this->hasInnovationActivationColumn(),
                fn($query) => $query->where('is_active', true)
            )
            ->limit(AIpreneurInnovation::MAX_ACTIVE_TECH)
            ->get();

        $innovationSalesBoostPercent = 0.0;
        $innovationPopularityBoostPercent = 0.0;
        $innovationMoodBoostPercent = 0.0;
        foreach ($activeInnovations as $innovation) {
            $effects = $innovation->getScaledEffects();
            $innovationSalesBoostPercent += (float) ($effects['sales_boost'] ?? 0);
            $innovationPopularityBoostPercent += (float) ($effects['popularity_boost'] ?? 0);
            $innovationMoodBoostPercent += (float) ($effects['mood_boost'] ?? 0);
        }

        $innovationSalesBoostPercent = min(35.0, $innovationSalesBoostPercent);
        $innovationPopularityBoostPercent = min(22.0, $innovationPopularityBoostPercent);
        $innovationMoodBoostPercent = min(18.0, $innovationMoodBoostPercent);
        $innovationBoost = min(0.45, $innovationPopularityBoostPercent / 100);

        $effectiveStaffMood = $this->clampFloat(
            $avgStaffMood - ($productOverload * 6) + $innovationMoodBoostPercent,
            5.0,
            100.0
        );

        $moodFactor = $effectiveStaffMood >= 50
            ? (1 + (($effectiveStaffMood - 50) / 50) * 0.2)
            : $this->clampFloat($effectiveStaffMood / 50, 0.55, 1.0);

        $basePopularity = 15 + ($overallProgress * 0.45);
        $marketingPopularity = min(18.0, $marketingBoost * 26);
        $innovationPopularity = min(22.0, $innovationPopularityBoostPercent);
        $staffPopularity = ($staffingFactor - 0.8) * 18;
        $moodPopularity = ($effectiveStaffMood - 50) * 0.3;
        $rawPopularity = $basePopularity + $marketingPopularity + $innovationPopularity + $staffPopularity + $moodPopularity;
        $popularityLevel = $this->clampFloat($rawPopularity * $overloadPenalty, 5.0, 100.0);

        $baseTraffic = 0.18 + (($popularityLevel / 100) * 1.55);
        $trafficMultiplier = $baseTraffic * $moodFactor * $staffingFactor * $overloadPenalty;
        if ($business->traffic_boost_expires_at && $business->traffic_boost_expires_at > now()) {
            $trafficMultiplier *= (float) ($business->traffic_multiplier ?? 1.0);
        }
        $trafficMultiplier = $this->clampFloat($trafficMultiplier, 0.15, 2.8);

        $decorateProgress = (float) ($business->module_decorate_progress ?? 0);
        $decorationBoost = ($decorateProgress / 100) * 0.14;

        $baseMargin = 0.21;
        $marketingMarginBoost = min(0.08, $marketingBoost * 0.12);
        $innovationMarginBoost = min(0.12, $innovationSalesBoostPercent / 100);
        $profitMargin = ($baseMargin + $marketingMarginBoost + $innovationMarginBoost) * $staffingFactor * $moodFactor * $overloadPenalty;
        $profitMargin = $this->clampFloat($profitMargin, 0.08, 0.46);

        return [
            'overall_progress' => $overallProgress,
            'products_count' => $productsCount,
            'staff_count' => $staffCount,
            'required_staff' => $requiredStaff,
            'staff_ratio' => $staffRatio,
            'staffing_factor' => $staffingFactor,
            'avg_staff_mood' => $avgStaffMood,
            'effective_staff_mood' => $effectiveStaffMood,
            'mood_factor' => $moodFactor,
            'product_overload' => $productOverload,
            'overload_penalty' => $overloadPenalty,
            'active_campaigns' => $activeCampaigns,
            'active_influencers' => $activeInfluencers,
            'active_marketing_assets' => $activeMarketingAssets,
            'influencer_boost_percent' => round($influencerBoostPercent, 2),
            'marketing_boost' => $marketingBoost,
            'active_innovations' => $activeInnovations->count(),
            'innovation_sales_boost_percent' => $innovationSalesBoostPercent,
            'innovation_popularity_boost_percent' => $innovationPopularityBoostPercent,
            'innovation_mood_boost_percent' => $innovationMoodBoostPercent,
            'innovation_boost' => $innovationBoost,
            'decoration_boost' => $decorationBoost,
            'popularity_level' => $popularityLevel,
            'base_traffic' => $baseTraffic,
            'traffic_multiplier' => $trafficMultiplier,
            'profit_margin' => $profitMargin,
        ];
    }

    private function refreshBusinessBalance(GeniusProfile $profile, ?AIpreneurBusiness $business = null): array
    {
        $resolvedBusiness = $business ?: $profile->business;
        if (!$resolvedBusiness) {
            return [
                'overall_progress' => 0,
                'products_count' => 0,
                'staff_count' => 0,
                'required_staff' => 1,
                'staff_ratio' => 0,
                'staffing_factor' => 0.35,
                'avg_staff_mood' => 70,
                'effective_staff_mood' => 70,
                'mood_factor' => 1,
                'product_overload' => 0,
                'overload_penalty' => 1,
                'active_campaigns' => 0,
                'active_influencers' => 0,
                'active_marketing_assets' => 0,
                'influencer_boost_percent' => 0,
                'marketing_boost' => 0,
                'active_innovations' => 0,
                'innovation_sales_boost_percent' => 0,
                'innovation_popularity_boost_percent' => 0,
                'innovation_mood_boost_percent' => 0,
                'innovation_boost' => 0,
                'decoration_boost' => 0,
                'popularity_level' => 20,
                'base_traffic' => 0.3,
                'traffic_multiplier' => 0.3,
                'profit_margin' => 0.12,
            ];
        }

        $balance = $this->calculateGameBalance($profile, $resolvedBusiness);
        $resolvedBusiness->staff_overall_mood = (int) round($balance['effective_staff_mood']);
        $resolvedBusiness->popularity_level = round((float) $balance['popularity_level'], 2);
        $resolvedBusiness->save();

        return $balance;
    }

    private function hasInnovationActivationColumn(): bool
    {
        return $this->hasInnovationColumn('is_active');
    }

    private function hasInnovationColumn(string $column): bool
    {
        return Schema::hasColumn('aipreneur_innovations', $column);
    }

    private function activeInnovationsQuery(GeniusProfile $profile)
    {
        $query = AIpreneurInnovation::where('student_id', $profile->id);

        if ($this->hasInnovationActivationColumn()) {
            $query->where('is_active', true);
        }

        return $query;
    }

    private function updateOverallStaffMood(GeniusProfile $profile): void
    {
        $this->refreshBusinessBalance($profile);
    }
    public function getTokenUsage(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'total_tokens' => 0,
        ]);
    }

    /**
     * Serve shop images with proper CORS headers.
     * This is a proxy endpoint to bypass CORS issues with direct storage access.
     */
    public function getShopImage(string $filename)
    {
        $path = storage_path('app/public/shops/' . $filename);

        if (!file_exists($path)) {
            return response()->json(['error' => 'Image not found'], 404);
        }

        $mimeType = mime_content_type($path) ?: 'image/png';

        return response()->file($path, [
            'Access-Control-Allow-Origin' => '*',
            'Access-Control-Allow-Methods' => 'GET, OPTIONS',
            'Access-Control-Allow-Headers' => '*',
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }

    /**
     * Serve product images from storage with CORS headers.
     * This is a proxy endpoint to bypass CORS issues with direct storage access.
     */
    public function getProductImage(string $filename)
    {
        $path = storage_path('app/public/products/' . $filename);

        if (!file_exists($path)) {
            return response()->json(['error' => 'Image not found'], 404);
        }

        $mimeType = mime_content_type($path) ?: 'image/png';

        return response()->file($path, [
            'Access-Control-Allow-Origin' => '*',
            'Access-Control-Allow-Methods' => 'GET, OPTIONS',
            'Access-Control-Allow-Headers' => '*',
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }

    /**
     * Serve interior asset images from storage with CORS headers.
     * This is a proxy endpoint to bypass CORS issues with direct storage access.
     */
    public function getInteriorAsset(string $filename)
    {
        $path = storage_path('app/public/interior-assets/' . $filename);

        if (!file_exists($path)) {
            return response()->json(['error' => 'Image not found'], 404);
        }

        return response()->file($path, [
            'Access-Control-Allow-Origin' => '*',
            'Access-Control-Allow-Methods' => 'GET, OPTIONS',
            'Access-Control-Allow-Headers' => '*',
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }

    /**
     * Serve marketing asset images with proper CORS headers.
     */
    public function getMarketingAsset(string $filename)
    {
        $path = storage_path('app/public/marketing-assets/' . $filename);

        if (!file_exists($path)) {
            return response()->json(['error' => 'Image not found'], 404);
        }

        return response()->file($path, [
            'Access-Control-Allow-Origin' => '*',
            'Access-Control-Allow-Methods' => 'GET, OPTIONS',
            'Access-Control-Allow-Headers' => '*',
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }

    /**
     * Serve influencer avatar images with proper CORS headers.
     */
    public function getInfluencerAvatar(string $filename)
    {
        $path = storage_path('app/public/influencers/' . $filename);

        if (!file_exists($path)) {
            return response()->json(['error' => 'Image not found'], 404);
        }

        return response()->file($path, [
            'Access-Control-Allow-Origin' => '*',
            'Access-Control-Allow-Methods' => 'GET, OPTIONS',
            'Access-Control-Allow-Headers' => '*',
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }

    /**
     * Serve innovation design images with proper CORS headers.
     */
    public function getInnovationImage(string $filename)
    {
        $path = storage_path('app/public/innovations/' . $filename);

        if (!file_exists($path)) {
            return response()->json(['error' => 'Image not found'], 404);
        }

        return response()->file($path, [
            'Access-Control-Allow-Origin' => '*',
            'Access-Control-Allow-Methods' => 'GET, OPTIONS',
            'Access-Control-Allow-Headers' => '*',
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }

    // =============================================
    // PUBLIC SHOP (NO AUTH REQUIRED)
    // =============================================

    /**
     * Get public shop data by slug.
     * This endpoint is publicly accessible without authentication.
     */
    public function getPublicShop(string $slug): JsonResponse
    {
        \Log::info('[PublicShop] Loading shop with slug: ' . $slug);

        // Find business by slug
        $business = AIpreneurBusiness::where('shop_url_slug', $slug)
            ->where('shop_launched', true)
            ->first();

        if (!$business) {
            \Log::info('[PublicShop] Shop not found for slug: ' . $slug);
            return response()->json([
                'success' => false,
                'message' => 'Shop not found or not launched yet.',
            ], 404);
        }

        // Get the genius profile for shop name and category
        $profile = GeniusProfile::find($business->student_id);

        if (!$profile) {
            \Log::error('[PublicShop] Profile not found for business student_id: ' . $business->student_id);
            return response()->json([
                'success' => false,
                'message' => 'Shop owner profile not found.',
            ], 404);
        }

        // Get products
        $products = AIpreneurProduct::where('student_id', $business->student_id)
            ->orderBy('units_sold', 'desc')
            ->get();

        // Increment visitor count
        $business->increment('store_visitors');

        \Log::info('[PublicShop] Successfully loaded shop: ' . $profile->aipreneur_shop_name);

        return response()->json([
            'success' => true,
            'shop' => [
                'student_id' => $profile->id,
                'shop_name' => $profile->aipreneur_shop_name,
                'shop_theme' => $business->shop_theme,
                'shop_tagline' => $business->shop_tagline ?? null,
                'shop_image_url' => $business->shop_image_url,
                'passion_category' => $profile->passion_category,
                'total_profit' => $business->total_profit,
                'store_visitors' => $business->store_visitors,
                'store_likes' => $business->store_likes ?? 0,
                'store_rating' => $business->store_rating ?? 4.5,
                'store_reviews_count' => $business->store_reviews_count ?? 0,
                'selected_cause' => $business->selected_cause,
                'charity_percentage' => $business->charity_percentage,
            ],
            'products' => $products,
        ]);
    }

    /**
     * Search public shops by name/slug.
     * This endpoint is publicly accessible without authentication.
     */
    public function searchPublicShops(Request $request): JsonResponse
    {
        $query = trim((string) $request->query('q', ''));

        $builder = AIpreneurBusiness::query()
            ->where('shop_launched', true)
            ->whereNotNull('shop_url_slug')
            ->with('student:id,genius_name,aipreneur_shop_name,passion_category');

        if ($query !== '') {
            $builder->where(function ($q) use ($query) {
                $q->where('shop_url_slug', 'like', "%{$query}%")
                    ->orWhereHas('student', function ($sub) use ($query) {
                        $sub->where('aipreneur_shop_name', 'like', "%{$query}%")
                            ->orWhere('genius_name', 'like', "%{$query}%");
                    });
            });
        }

        $shops = $builder->orderByDesc('updated_at')->limit(24)->get();

        $results = $shops->map(function ($business) {
            $profile = $business->student;
            $ownerName = trim(($profile->genius_name ?? ''));

            return [
                'shop_name' => $profile->aipreneur_shop_name ?? 'My Shop',
                'shop_url_slug' => $business->shop_url_slug,
                'shop_theme' => $business->shop_theme,
                'shop_image_url' => $business->shop_image_url,
                'passion_category' => $profile->passion_category ?? null,
                'owner_name' => $ownerName,
                'store_likes' => $business->store_likes ?? 0,
                'store_visitors' => $business->store_visitors ?? 0,
            ];
        });

        return response()->json([
            'success' => true,
            'shops' => $results,
        ]);
    }

    /**
     * Like a public shop.
     * This endpoint is publicly accessible without authentication.
     */
    public function likePublicShop(string $slug): JsonResponse
    {
        $business = AIpreneurBusiness::where('shop_url_slug', $slug)
            ->where('shop_launched', true)
            ->first();

        if (!$business) {
            return response()->json([
                'success' => false,
                'message' => 'Shop not found.',
            ], 404);
        }

        $business->increment('store_likes');

        return response()->json([
            'success' => true,
            'store_likes' => $business->store_likes,
        ]);
    }

    // =============================================
    // LEADERBOARD
    // =============================================

    /**
     * Get leaderboard — all genius profiles ranked by level/xp, coins, or profit.
     */
    public function getLeaderboard(Request $request): JsonResponse
    {
        $currentProfile = $request->genius_profile;
        $sortBy = $request->query('sort', 'xp'); // 'xp' | 'coins' | 'profit'

        // Fetch all genius profiles with their rewards and business data
        $profiles = GeniusProfile::query()
            ->with([
                'rewards:id,student_id,coins,xp,level,badges',
                'business:id,student_id,total_sales,total_profit',
            ])
            ->get();

        // Map to leaderboard entries
        $entries = $profiles->map(function (GeniusProfile $profile) {
            $rewards = $profile->rewards;
            $business = $profile->business;
            $badges = $rewards->badges ?? [];

            return [
                'id' => $profile->id,
                'genius_name' => $profile->genius_name ?? 'Unknown',
                'avatar_url' => $profile->avatar_url,
                'level' => (int) ($rewards->level ?? 1),
                'xp' => (int) ($rewards->xp ?? 0),
                'coins' => (int) ($rewards->coins ?? 0),
                'total_sales' => (float) ($business->total_sales ?? 0),
                'total_profit' => (float) ($business->total_profit ?? 0),
                'badges_count' => is_array($badges) ? count($badges) : 0,
                'shop_name' => $profile->aipreneur_shop_name,
                'passion_category' => $profile->passion_category,
            ];
        });

        // Sort based on requested field: 'xp' = level+xp, 'profit' = coins (profit is coins)
        $entries = match ($sortBy) {
            'profit' => $entries->sortByDesc('total_profit'),
            default => $entries->sortByDesc(function ($e) {
                // Primary sort by level descending, secondary by xp descending
                return $e['level'] * 100000 + $e['xp'];
            }),
        };

        $leaderboard = $entries->values()->toArray();

        // Find current user's rank (1-indexed)
        $currentUserRank = 0;
        if ($currentProfile) {
            foreach ($leaderboard as $index => $entry) {
                if ($entry['id'] === $currentProfile->id) {
                    $currentUserRank = $index + 1;
                    break;
                }
            }
        }

        return response()->json([
            'success' => true,
            'leaderboard' => $leaderboard,
            'current_user_rank' => $currentUserRank,
        ]);
    }
}
