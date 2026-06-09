<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * WorkshopShop — a partner shop (Zus, Mamee, KitKat, AirAsia, …)
 * managed by superadmins via /superadmin/event-workshops.
 *
 * Appears on a student's AIpreneur globe carousel after a staff
 * member scans the student's QR (workshop_shop_unlocks).
 */
class WorkshopShop extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'workshop_shops';

    protected $fillable = [
        'name',
        'company_name',
        'business_nature',
        'shop_image_path',
        'modules',
        'is_active',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'modules'   => 'array',
        'is_active' => 'boolean',
    ];

    /**
     * Absolute URL the wp-aigenius globe + scanner can load
     * cross-origin. The frontend never touches `shop_image_path`
     * directly — always read from this accessor.
     */
    public function getShopImageUrlAttribute(): string
    {
        $path = $this->shop_image_path;
        if (! $path) {
            return '';
        }
        if (preg_match('#^https?://#i', $path) || str_starts_with($path, '/assets/')) {
            // Already absolute or a wp-aigenius static asset path.
            return $path;
        }
        return url('/storage/' . ltrim($path, '/'));
    }

    public function unlocks(): HasMany
    {
        return $this->hasMany(WorkshopShopUnlock::class);
    }

    public function staff(): HasMany
    {
        return $this->hasMany(WorkshopShopStaff::class);
    }
}
