<?php

namespace App\Services;

use App\Models\Car;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class SaveCar
{
    public function __construct(private PhotoStorage $photos) {}

    public function execute(Car $car, array $data): Car
    {
        $created = [];
        $removed = [];
        try {
            DB::transaction(function () use ($car, $data, &$created, &$removed) {
                $attributes = Arr::except($data, ['uploads', 'photo_order', 'remove_photo_ids', 'photo_updates']);
                if (! $car->exists) {
                    $slug = $attributes['slug'] ?? Str::slug($attributes['name'].' '.($attributes['year'] ?? ''));
                    if (! $slug) {
                        $slug = 'vehicle';
                    }$candidate = $slug;
                    $i = 2;
                    while (Car::withTrashed()->where('slug', $candidate)->exists()) {
                        $candidate = $slug.'-'.$i++;
                    }
                    $attributes['slug'] = $candidate;
                } else {
                    unset($attributes['slug']);
                }
                $attributes['featured_order'] ??= $car->featured_order ?? 0;
                $status = $attributes['status'];
                if ($status !== 'available') {
                    $attributes['is_featured'] = false;
                }
                if ($status !== 'draft') {
                    $attributes['published_at'] = $car->published_at ?? now();
                }
                $attributes['sold_at'] = $status === 'sold' ? ($car->sold_at ?? now()) : null;
                $car->fill($attributes)->save();
                foreach ($data['uploads'] ?? [] as $index => $upload) {
                    $photo = $this->photos->store($upload);
                    $created[] = $photo['directory'];
                    $car->photos()->create([...$photo, 'alt' => $car->name.' — photograph '.($car->photos()->count() + 1),
                        'description' => 'Vehicle photograph', 'sort_order' => 1000 + $index]);
                }
                $remove = $data['remove_photo_ids'] ?? [];
                foreach ($car->photos()->whereIn('id', $remove)->get() as $photo) {
                    if ($photo->directory) {
                        $removed[] = $photo->directory;
                    }$photo->delete();
                }
                foreach ($data['photo_updates'] ?? [] as $photo) {
                    $car->photos()->whereKey($photo['id'])->update(Arr::only($photo, ['alt', 'description', 'object_position']));
                }
                $order = array_values(array_diff($data['photo_order'] ?? [], $remove));
                $all = $car->photos()->pluck('id')->all();
                $order = array_values(array_unique([...$order, ...$all]));
                foreach ($order as $index => $id) {
                    $car->photos()->whereKey($id)->update(['sort_order' => $index]);
                }
                if ($car->photos()->count() > 30) {
                    throw ValidationException::withMessages(['uploads' => 'Keep no more than 30 photographs per car.']);
                }
                if ($status !== 'draft' && ! $car->photos()->exists()) {
                    throw ValidationException::withMessages(['uploads' => 'Add at least one photograph before publishing this car.']);
                }
            });
        } catch (\Throwable $error) {
            foreach ($created as $directory) {
                Storage::disk('public')->deleteDirectory($directory);
            }throw $error;
        }
        foreach ($removed as $directory) {
            Storage::disk('public')->deleteDirectory($directory);
        }

        return $car->refresh()->load('photos');
    }
}
