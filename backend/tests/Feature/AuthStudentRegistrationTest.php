<?php

namespace Tests\Feature;

use App\Models\GeniusProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthStudentRegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_student_endpoint_creates_rewards_for_genius_profile_id(): void
    {
        $payload = [
            'email' => 'student-direct@example.com',
            'password' => 'password123',
            'name' => 'Direct Student',
            'genius_id' => 'DIRECT-STUDENT-001',
            'age' => 11,
            'grade' => 'Grade 5',
        ];

        $response = $this->postJson('/auth/register/student', $payload);

        $response->assertOk();

        $user = User::where('email', $payload['email'])->firstOrFail();
        $profile = GeniusProfile::where('genius_id', $payload['genius_id'])->firstOrFail();

        $this->assertSame('student', $user->role);
        $this->assertSame($user->id, $profile->parent_id);

        $this->assertDatabaseHas('rewards', [
            'student_id' => $profile->id,
            'coins' => 100,
        ]);

        $this->assertDatabaseMissing('rewards', [
            'student_id' => $user->id,
        ]);

        $this->assertDatabaseHas('aipreneur_rewards', [
            'student_id' => $profile->id,
            'coins' => 0,
            'ai_tokens' => 0,
        ]);
    }

    public function test_general_register_with_student_role_creates_rewards_for_genius_profile_id(): void
    {
        $payload = [
            'email' => 'student-role@example.com',
            'password' => 'password123',
            'name' => 'Role Student',
            'role' => 'student',
            'genius_id' => 'ROLE-STUDENT-001',
            'age' => 10,
            'grade' => 'Grade 4',
        ];

        $response = $this->postJson('/auth/register', $payload);

        $response->assertOk();

        $user = User::where('email', $payload['email'])->firstOrFail();
        $profile = GeniusProfile::where('genius_id', $payload['genius_id'])->firstOrFail();

        $this->assertSame('student', $user->role);
        $this->assertSame($user->id, $profile->parent_id);

        $this->assertDatabaseHas('rewards', [
            'student_id' => $profile->id,
            'coins' => 100,
        ]);

        $this->assertDatabaseMissing('rewards', [
            'student_id' => $user->id,
        ]);

        $this->assertDatabaseHas('aipreneur_rewards', [
            'student_id' => $profile->id,
            'coins' => 0,
            'ai_tokens' => 0,
        ]);
    }

    public function test_register_student_endpoint_allows_duplicate_email_when_genius_ids_are_unique(): void
    {
        $sharedEmail = 'siblings@example.com';

        $first = [
            'email' => $sharedEmail,
            'password' => 'password123',
            'name' => 'Sibling One',
            'genius_id' => 'SIBLING-ONE-001',
        ];

        $second = [
            'email' => $sharedEmail,
            'password' => 'password456',
            'name' => 'Sibling Two',
            'genius_id' => 'SIBLING-TWO-001',
        ];

        $this->postJson('/auth/register/student', $first)->assertOk();
        $this->postJson('/auth/register/student', $second)->assertOk();

        $this->assertSame(2, User::query()->where('email', $sharedEmail)->count());
        $this->assertDatabaseHas('genius_profiles', ['genius_id' => $first['genius_id']]);
        $this->assertDatabaseHas('genius_profiles', ['genius_id' => $second['genius_id']]);
    }

    public function test_general_register_parent_role_still_requires_unique_email(): void
    {
        $payload = [
            'email' => 'parent-unique@example.com',
            'password' => 'password123',
            'name' => 'Parent User',
            'role' => 'parent',
        ];

        $this->postJson('/auth/register', $payload)->assertOk();

        $response = $this->postJson('/auth/register', $payload);
        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['email']);
    }

    public function test_login_with_duplicate_email_uses_matching_password_candidate(): void
    {
        $sharedEmail = 'duplicate-login@example.com';

        $student = User::create([
            'email' => $sharedEmail,
            'password_hash' => Hash::make('student-pass'),
            'name' => 'Student Account',
            'role' => 'student',
        ]);

        $parent = User::create([
            'email' => $sharedEmail,
            'password_hash' => Hash::make('parent-pass'),
            'name' => 'Parent Account',
            'role' => 'parent',
        ]);

        $response = $this->postJson('/auth/login', [
            'email' => $sharedEmail,
            'password' => 'parent-pass',
        ]);

        $response->assertOk();
        $response->assertJsonPath('user.id', $parent->id);
        $this->assertNotSame($student->id, $parent->id);
    }
}
