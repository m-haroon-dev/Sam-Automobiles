<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Car extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['year' => 'integer', 'mileage' => 'integer', 'price' => 'integer', 'import_year' => 'integer',
            'import_mileage' => 'integer', 'featured_order' => 'integer', 'is_featured' => 'boolean',
            'features' => 'array', 'attractions' => 'array', 'notes' => 'array', 'showroom' => 'array',
            'performance_source' => 'array', 'published_at' => 'datetime', 'sold_at' => 'datetime'];
    }

    public function photos(): HasMany
    {
        return $this->hasMany(CarPhoto::class)->orderBy('sort_order')->orderBy('id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function scopePublished(Builder $query): void
    {
        $query->whereIn('status', ['available', 'sold'])->whereNotNull('published_at')->where('published_at', '<=', now())->whereHas('photos');
    }

    public function publicData(): array
    {
        return ['id' => $this->slug, 'name' => $this->name, 'make' => $this->make, 'model' => $this->model, 'year' => $this->year,
            'category' => $this->category?->name, 'categorySlug' => $this->category?->slug,
            'trim' => $this->trim, 'mileage' => $this->mileage, 'mileageKm' => $this->mileage, 'price' => $this->price,
            'status' => $this->status, 'body' => $this->body, 'fuel' => $this->fuel, 'colour' => $this->colour, 'exterior' => $this->colour,
            'interior' => $this->interior, 'registration' => $this->registration, 'origin' => $this->origin,
            'importYear' => $this->import_year, 'importMileageKm' => $this->import_mileage, 'auctionGrade' => $this->auction_grade,
            'bestFor' => $this->best_for, 'usp' => $this->usp, 'features' => $this->features ?? [], 'attractions' => $this->attractions ?? [],
            'notes' => $this->notes ?? [], 'showroom' => $this->showroom, 'performanceSource' => $this->performance_source,
            'performanceNote' => $this->performance_note, 'sourceUrl' => $this->source_url, 'instagramPermalink' => $this->source_url,
            'advertisedDate' => $this->published_at?->format('Y-m-d'), 'isFeatured' => $this->is_featured,
            'model3d' => $this->model_3d ? '/storage/'.$this->model_3d : null,
            'photos' => $this->photos->map->publicData()->values()->all()];
    }
}
