<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Reward extends Model
{
    use HasFactory, HasUuids;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'student_id',
        'coins',
        'xp',
        'level',
        'streak_days',
        'last_check_in',
        'badges',
    ];

    protected $casts = [
        'badges' => 'array',
        'last_check_in' => 'datetime',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(GeniusProfile::class, 'student_id');
    }

    public function addCoins(int $amount): void
    {
        $this->coins += $amount;
        $this->save();
    }

    public function addXp(int $amount): void
    {
        $this->xp += $amount;
        $this->updateLevel();
        $this->save();
    }

    protected function updateLevel(): void
    {
        if ($this->xp >= 900) {
            $this->level = 5;
        } elseif ($this->xp >= 500) {
            $this->level = 4;
        } elseif ($this->xp >= 250) {
            $this->level = 3;
        } elseif ($this->xp >= 100) {
            $this->level = 2;
        } else {
            $this->level = 1;
        }
    }

    public function addBadge(string $badge): void
    {
        $badges = $this->badges ?? [];
        if (!in_array($badge, $badges)) {
            $badges[] = $badge;
            $this->badges = $badges;
            $this->save();
        }
    }
}
