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
        $newModel = null;
        $oldModel = null;
        try {
            DB::transaction(function () use ($car, $data, &$created, &$removed, &$newModel, &$oldModel) {
                $attributes = Arr::except($data, ['uploads', 'photo_order', 'remove_photo_ids', 'photo_updates', 'model_upload', 'remove_model']);
                // A new or removed 3D model; the old file is deleted only once the save has committed.
                // Each upload gets a fresh name, so browsers and the service worker never show a cached older model.
                if (($data['model_upload'] ?? null) || ($data['remove_model'] ?? false)) {
                    $oldModel = $car->model_3d;
                    $attributes['model_3d'] = null;
                    if ($upload = $data['model_upload'] ?? null) {
                        $newModel = Storage::disk('public')->putFileAs('cars/models', $upload, Str::lower(Str::random(32)).'.glb');
                        if (! $newModel) {
                            throw ValidationException::withMessages(['model_upload' => 'The 3D model could not be stored. Try again.']);
                        }
                        $attributes['model_3d'] = $newModel;
                    }
                }
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
            }
            if ($newModel) {
                Storage::disk('public')->delete($newModel);
            }throw $error;
        }
        foreach ($removed as $directory) {
            Storage::disk('public')->deleteDirectory($directory);
        }
        if ($oldModel && $oldModel !== $car->model_3d) {
            Storage::disk('public')->delete($oldModel);
        }

        return $car->refresh()->load('photos');
    }
}
