<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Chapter extends Model
{
    use HasFactory, HasUuids;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'chapter_code',
        'title',
        'description',
        'subject',
        'grade_level',
        'page_count',
        'display_title',
        'display_subtitle',
        'display_description',
        'display_icon',
        'display_banner_url',
        'display_order',
        'difficulty_level',
        'estimated_minutes',
        'learning_outcomes',
        'prerequisites',
        'keywords',
        'category',
        'is_premium',
        'is_active',
    ];

    protected $casts = [
        'learning_outcomes' => 'array',
        'prerequisites' => 'array',
        'keywords' => 'array',
        'is_premium' => 'boolean',
        'is_active' => 'boolean',
    ];
}
