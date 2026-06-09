<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SystemConfig extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'system_config';

    public $timestamps = false;

    protected $fillable = [
        'config_key',
        'config_value',
        'description',
        'category',
        'data_type',
        'default_value',
        'updated_at',
        'updated_by',
    ];

    protected $casts = [
        'config_value' => 'array',
        'default_value' => 'array',
        'updated_at' => 'datetime',
    ];

    // Static helpers
    public static function getValue(string $key, $default = null)
    {
        $config = self::where('config_key', $key)->first();

        if (!$config) {
            return $default;
        }

        $value = $config->config_value;

        // Parse based on data type
        return match ($config->data_type) {
            'boolean' => filter_var($value, FILTER_VALIDATE_BOOLEAN),
            'number' => is_numeric($value) ? (float) $value : $default,
            'string' => (string) $value,
            'json' => $value,
            default => $value,
        };
    }

    public static function setValue(string $key, $value, ?string $updatedBy = null): self
    {
        $config = self::where('config_key', $key)->first();

        if ($config) {
            $config->update([
                'config_value' => is_array($value) ? $value : json_encode($value),
                'updated_at' => now(),
                'updated_by' => $updatedBy,
            ]);
        }

        return $config;
    }

    public static function getByCategory(string $category): array
    {
        return self::where('category', $category)->pluck('config_value', 'config_key')->toArray();
    }
}
