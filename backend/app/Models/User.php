<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\Relations\HasMany;

use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasFactory, HasUuids, HasApiTokens;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'email',
        'password_hash',
        'name',
        'role',
        'is_superadmin',
        'teacher_id',
        'parent_ids',
        'persona_quiz_completed',
        'persona_quiz_date',
        'phone_number',
        'country_code',
        'location',
        'age',
        'grade',
        'city',
        'state',
        'referral_code',
        'remember_token',
    ];

    protected $casts = [
        'is_superadmin' => 'boolean',
        'parent_ids' => 'array',
        'persona_quiz_completed' => 'boolean',
        'persona_quiz_date' => 'datetime',
    ];

    protected $hidden = [
        'password_hash',
    ];

    public function geniusProfiles(): HasMany
    {
        return $this->hasMany(GeniusProfile::class, 'parent_id');
    }

    public function teacherInvites(): HasMany
    {
        return $this->hasMany(TeacherInvite::class, 'teacher_id');
    }

    public function isParent(): bool
    {
        return $this->role === 'parent';
    }

    public function isTeacher(): bool
    {
        return $this->role === 'teacher';
    }

    public function isMaster(): bool
    {
        return $this->role === 'master';
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === 'master' && (bool) $this->is_superadmin;
    }
}
