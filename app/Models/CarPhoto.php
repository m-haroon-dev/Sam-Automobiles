<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CarPhoto extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['variants' => 'array', 'representative' => 'boolean', 'width' => 'integer', 'height' => 'integer'];
    }

    public function car(): BelongsTo
    {
        return $this->belongsTo(Car::class);
    }

    public function publicData(): array
    {
        return [...$this->variants, 'width' => $this->width, 'height' => $this->height, 'alt' => $this->alt,
            'description' => $this->description, 'objectPosition' => $this->object_position, 'representative' => $this->representative];
    }
}
