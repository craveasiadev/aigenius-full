<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AIpreneurDecorationItem extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'aipreneur_decoration_items';

    protected $fillable = [
        'student_id',
        'item_type',
        'item_name',
        'item_config',
        'zone',
        'position_x',
        'position_y',
        'is_active',
    ];

    protected $casts = [
        'item_config' => 'array',
        'is_active' => 'boolean',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(GeniusProfile::class, 'student_id');
    }
}
