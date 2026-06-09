<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AIpreneurReward;
use App\Models\GeniusProfile;
use App\Models\Reward;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    /**
     * User login with email and password.
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
            'role' => 'nullable|in:parent,teacher,student,master',
        ]);

        $query = User::query()->where('email', $request->email);
        if ($request->filled('role')) {
            $query->where('role', (string) $request->role);
        }

        $users = $query->get();

        if ($users->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid email or password',
            ], 401);
        }

        $user = null;
        foreach ($users as $candidate) {
            if ($this->verifyAndMigratePassword($candidate, (string) $request->password)) {
                $user = $candidate;
                break;
            }
        }

        if (!$user) {
            Log::info('Login failed for: ' . $request->email . ' - password mismatch');
            return response()->json([
                'success' => false,
                'message' => 'Invalid email or password',
            ], 401);
        }

        // Generate Sanctum token
        $token = $user->createToken('auth_token')->plainTextToken;
        // $user->forceFill(['remember_token' => $token])->save();

        return response()->json([
            'success' => true,
            'token' => $token,
            'user' => $user,
        ]);
    }

    /**
     * User registration.
     */
    public function register(Request $request): JsonResponse
    {
        $emailRules = ['required', 'email'];
        if ((string) $request->input('role') !== 'student') {
            $emailRules[] = 'unique:users,email';
        }

        $request->validate([
            'email' => $emailRules,
            'password' => 'required|string|min:6',
            'name' => 'required|string',
            'role' => 'required|in:parent,teacher,student',
            'mobile' => 'nullable|string',
            'country_code' => 'nullable|string',
            'location' => 'nullable|string',
            'age' => 'nullable|integer',
            'grade' => 'nullable|string',
            'genius_id' => 'nullable|string|max:32|unique:genius_profiles,genius_id',
        ]);

        $payload = DB::transaction(function () use ($request) {
            $user = User::create([
                'email' => $request->email,
                'password_hash' => Hash::make($request->password),
                'name' => $request->name,
                'role' => $request->role,
                'phone_number' => $request->mobile,
                'country_code' => $request->country_code,
                'location' => $request->location,
                'age' => $request->age,
                'grade' => $request->grade,
                'created_at' => now(),
            ]);

            $profile = null;
            $credentials = null;

            if ($request->role === 'student') {
                $geniusId = $request->filled('genius_id')
                    ? trim((string) $request->genius_id)
                    : $this->generateUniqueGeniusId();

                $profile = GeniusProfile::create([
                    'parent_id' => $user->id, // self-owned until linked by parent
                    'genius_id' => $geniusId,
                    'password_hash' => Hash::make($request->password),
                    'genius_name' => $request->name,
                    'age' => $request->age,
                ]);

                Reward::create([
                    'student_id' => $profile->id,
                    'coins' => 100,
                    'xp' => 0,
                    'level' => 1,
                    'streak_days' => 0,
                    'badges' => [],
                ]);

                AIpreneurReward::create([
                    'student_id' => $profile->id,
                    'coins' => 0,
                    'ai_tokens' => 0,
                ]);

                $credentials = ['genius_id' => $geniusId];
            }

            return [
                'user' => $user,
                'profile' => $profile,
                'credentials' => $credentials,
            ];
        });

        $token = $payload['user']->createToken('auth_token')->plainTextToken;
        // $user->forceFill(['remember_token' => $token])->save();

        return response()->json([
            'success' => true,
            'token' => $token,
            'user' => $payload['user'],
            'profile' => $payload['profile'],
            'credentials' => $payload['credentials'],
        ]);
    }

    /**
     * Student registration with immediate AIpreneur profile provisioning.
     * Creates user + genius profile in one transaction so login can continue directly.
     */
    public function registerStudent(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string|min:6',
            'name' => 'required|string|max:255',
            'age' => 'nullable|integer|min:5|max:20',
            'grade' => 'nullable|string|max:255',
            'genius_id' => [
                'nullable',
                'string',
                'max:32',
                'unique:genius_profiles,genius_id',
            ],
        ]);

        $payload = DB::transaction(function () use ($request) {
            $user = User::create([
                'email' => $request->email,
                'password_hash' => Hash::make($request->password),
                'name' => $request->name,
                'role' => 'student',
                'age' => $request->age,
                'grade' => $request->grade,
                'created_at' => now(),
            ]);

            $geniusId = $request->filled('genius_id')
                ? trim((string) $request->genius_id)
                : $this->generateUniqueGeniusId();

            $profile = GeniusProfile::create([
                'parent_id' => $user->id, // self-owned until linked by a parent
                'genius_id' => $geniusId,
                'password_hash' => Hash::make($request->password),
                'genius_name' => $request->name,
                'age' => $request->age,
            ]);

            Reward::create([
                'student_id' => $profile->id,
                'coins' => 100,
                'xp' => 0,
                'level' => 1,
                'streak_days' => 0,
                'badges' => [],
            ]);

            AIpreneurReward::create([
                'student_id' => $profile->id,
                'coins' => 0,
                'ai_tokens' => 0,
            ]);

            return [
                'user' => $user,
                'profile' => $profile,
                'genius_id' => $geniusId,
            ];
        });

        $userToken = $payload['user']->createToken('auth_token')->plainTextToken;
        $geniusToken = $payload['profile']->createToken('genius-session')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Student registered successfully.',
            'user_token' => $userToken,
            'genius_token' => $geniusToken,
            'user' => $payload['user'],
            'profile' => $payload['profile'],
            'credentials' => [
                'genius_id' => $payload['genius_id'],
            ],
        ]);
    }

    /**
     * User logout.
     */
    /**
     * User logout.
     */
    public function logout(Request $request): JsonResponse
    {
        if ($request->user()) {
            $request->user()->currentAccessToken()->delete();
        }
        return response()->json(['success' => true]);
    }

    /**
     * Get current user.
     */
    public function me(Request $request): JsonResponse
    {
        if (!$request->user()) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }

        return response()->json([
            'success' => true,
            'user' => $request->user(),
        ]);
    }

    private function verifyAndMigratePassword(User $user, string $plainPassword): bool
    {
        $passwordValid = Hash::check($plainPassword, $user->password_hash);

        if (!$passwordValid && Str::startsWith($user->password_hash, '$2a$')) {
            $convertedHash = '$2y$' . substr($user->password_hash, 4);
            $passwordValid = Hash::check($plainPassword, $convertedHash);

            if ($passwordValid) {
                $user->password_hash = Hash::make($plainPassword);
                $user->save();
                Log::info('Migrated password hash for user: ' . $user->email);
            }
        }

        // DEV ONLY: retain legacy plaintext compatibility and auto-migrate.
        if (!$passwordValid && $user->password_hash === $plainPassword) {
            Log::warning('Plain text password matched for user: ' . $user->email . ' - Please update to hashed password!');
            $user->password_hash = Hash::make($plainPassword);
            $user->save();
            $passwordValid = true;
        }

        return $passwordValid;
    }

    private function generateUniqueGeniusId(): string
    {
        do {
            $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            $id = 'GENIUS-';
            for ($i = 0; $i < 6; $i++) {
                $id .= $chars[random_int(0, strlen($chars) - 1)];
            }
        } while (GeniusProfile::where('genius_id', $id)->exists());

        return $id;
    }
}
