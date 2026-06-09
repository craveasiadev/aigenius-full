<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;

use Laravel\Sanctum\HasApiTokens;

class GeniusProfile extends Model
{
    use HasFactory, HasUuids, HasApiTokens;

    protected $table = 'genius_profiles';

    protected $fillable = [
        'parent_id',
        'genius_id',
        'genius_name',
        'password_hash',
        'gender',
        'date_of_birth',
        'profile_picture_url',
        'selfie_url',
        'signboard_url',
        'age',
        'persona_quiz_completed',
        'persona_quiz_date',
        'passion_category',
        'aipreneur_shop_name',
        'aipreneur_onboarding_completed',
        'onboarding_stage',
        'remember_token',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
        'persona_quiz_completed' => 'boolean',
        'persona_quiz_date' => 'datetime',
        'aipreneur_onboarding_completed' => 'boolean',
    ];

    protected $hidden = [
        'password_hash',
        'remember_token',
    ];

    // Relationships
    public function parent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'parent_id');
    }

    public function business(): HasOne
    {
        return $this->hasOne(AIpreneurBusiness::class, 'student_id');
    }

    public function rewards(): HasOne
    {
        return $this->hasOne(AIpreneurReward::class, 'student_id');
    }

    public function products(): HasMany
    {
        return $this->hasMany(AIpreneurProduct::class, 'student_id');
    }

    public function staff(): HasMany
    {
        return $this->hasMany(AIpreneurStaff::class, 'student_id');
    }

    public function decorations(): HasMany
    {
        return $this->hasMany(AIpreneurDecoration::class, 'student_id');
    }

    public function campaigns(): HasMany
    {
        return $this->hasMany(AIpreneurCampaign::class, 'student_id');
    }

    public function innovations(): HasMany
    {
        return $this->hasMany(AIpreneurInnovation::class, 'student_id');
    }

    public function interviews(): HasMany
    {
        return $this->hasMany(AIpreneurInterview::class, 'student_id');
    }

    public function aiTokens(): HasOne
    {
        return $this->hasOne(AIpreneurToken::class, 'student_id');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(AIpreneurTransaction::class, 'student_id');
    }

    public function marketingAssets(): HasMany
    {
        return $this->hasMany(AIpreneurMarketingAsset::class, 'student_id');
    }

    public function influencerCampaigns(): HasMany
    {
        return $this->hasMany(AIpreneurInfluencerCampaign::class, 'student_id');
    }

    public function decorationItems(): HasMany
    {
        return $this->hasMany(AIpreneurDecorationItem::class, 'student_id');
    }

    public function dailyStats(): HasMany
    {
        return $this->hasMany(AIpreneurDailyStats::class, 'student_id');
    }

    public function chapterProgresses(): HasMany
    {
        return $this->hasMany(ChapterProgress::class, 'student_id');
    }

    // Accessor for first_name (maps from genius_name for frontend compatibility)
    public function getFirstNameAttribute(): ?string
    {
        return $this->genius_name;
    }

    // Accessor for last_name (not stored separately, return null)
    public function getLastNameAttribute(): ?string
    {
        return null;
    }

    // Accessor for avatar_url (maps from profile_picture_url for frontend compatibility)
    public function getAvatarUrlAttribute(): ?string
    {
        return $this->profile_picture_url;
    }

    // Append these virtual attributes to JSON output
    protected $appends = ['first_name', 'last_name', 'avatar_url'];

    // Helper methods
    public function verifyPassword(string $password): bool
    {
        // In production, use proper password hashing
        return $this->password_hash === $password;
    }

    public function calculateAge(): ?int
    {
        if (!$this->date_of_birth) {
            return null;
        }
        return $this->date_of_birth->age;
    }

    public function getAgeGroup(): string
    {
        $age = $this->calculateAge();
        if ($age === null) return 'unknown';
        return $age <= 12 ? 'kids' : 'teens';
    }
}
