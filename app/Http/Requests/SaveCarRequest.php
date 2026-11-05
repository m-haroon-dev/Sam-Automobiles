<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveCarRequest extends FormRequest
{
    /** Largest 3D model upload, in kilobytes (40 MB). */
    public const MODEL_MAX_KB = 40960;

    public function authorize(): bool
    {
        return (bool) $this->user()?->is_active;
    }

    protected function prepareForValidation(): void
    {
        $this->merge(['is_featured' => $this->boolean('is_featured'), 'features' => $this->input('features', []), 'notes' => $this->input('notes', []), 'attractions' => $this->input('attractions', []), 'remove_model' => $this->boolean('remove_model')]);
    }

    public function rules(): array
    {
        $car = $this->route('car');
        $photoId = Rule::exists('car_photos', 'id')->where('car_id', $car?->id ?? 0);

        return [
            'name' => ['required', 'string', 'max:150'],
            'slug' => ['nullable', 'string', 'max:190', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('cars')->ignore($car?->id), ...($car ? [Rule::in([$car->slug])] : [])],
            'category_id' => ['nullable', 'integer', Rule::exists('categories', 'id')],
            'make' => ['nullable', 'string', 'max:80'], 'model' => ['nullable', 'string', 'max:100'],
            'year' => ['nullable', 'integer', 'between:1900,'.(now()->year + 1)],
            'trim' => ['nullable', 'string', 'max:180'], 'mileage' => ['nullable', 'integer', 'between:0,10000000'],
            'price' => ['nullable', 'integer', 'between:0,999999999999'],
            'status' => ['required', Rule::in(['draft', 'available', 'sold'])],
            'is_featured' => ['boolean'], 'featured_order' => ['nullable', 'integer', 'between:0,9999'],
            'body' => ['nullable', 'string', 'max:60'], 'fuel' => ['nullable', 'string', 'max:60'],
            'colour' => ['nullable', 'string', 'max:100'], 'interior' => ['nullable', 'string', 'max:180'],
            'registration' => ['nullable', 'string', 'max:120'], 'origin' => ['nullable', 'string', 'max:100'],
            'import_year' => ['nullable', 'integer', 'between:1900,'.(now()->year + 1)],
            'import_mileage' => ['nullable', 'integer', 'between:0,10000000'], 'auction_grade' => ['nullable', 'string', 'max:80'],
            'best_for' => ['required_unless:status,draft', 'nullable', 'string', 'max:1200'],
            'usp' => ['required_unless:status,draft', 'nullable', 'string', 'max:1200'],
            'features' => ['nullable', 'array', 'max:80'], 'features.*' => ['string', 'max:250'],
            'notes' => ['nullable', 'array', 'max:30'], 'notes.*' => ['string', 'max:500'],
            'attractions' => ['nullable', 'array', 'max:12'], 'attractions.*.label' => ['required', 'string', 'max:80'],
            'attractions.*.value' => ['required', 'string', 'max:250'], 'attractions.*.manufacturer' => ['sometimes', 'boolean'],
            'performance_source' => ['nullable', 'array'], 'performance_source.title' => ['nullable', 'string', 'max:180'],
            'performance_source.url' => ['nullable', 'url:http,https', 'max:1500'], 'performance_note' => ['nullable', 'string', 'max:1000'],
            'source_url' => ['nullable', 'url:http,https', 'max:1500'],
            'uploads' => ['nullable', 'array', 'max:12'],
            'uploads.*' => ['file', 'image', 'mimes:jpg,jpeg,png,webp', 'max:10240', 'dimensions:max_width=12000,max_height=12000'],
            'photo_order' => ['nullable', 'array', 'max:30'], 'photo_order.*' => ['integer', 'distinct', clone $photoId],
            'remove_photo_ids' => ['nullable', 'array', 'max:30'], 'remove_photo_ids.*' => ['integer', 'distinct', clone $photoId],
            'photo_updates' => ['nullable', 'array', 'max:30'], 'photo_updates.*.id' => ['required', 'integer', clone $photoId],
            'photo_updates.*.alt' => ['required', 'string', 'max:250'], 'photo_updates.*.description' => ['required', 'string', 'max:250'],
            'photo_updates.*.object_position' => ['required', 'regex:/^(100|\d{1,2})% (100|\d{1,2})%$/'],
            'model_upload' => ['nullable', 'file', 'extensions:glb', 'max:'.self::MODEL_MAX_KB],
            'remove_model' => ['boolean'],
        ];
    }

    /** A .glb file opens with the binary glTF magic "glTF"; anything else is refused whatever its name. */
    public function after(): array
    {
        return [function ($validator) {
            $file = $this->file('model_upload');
            if ($file && $file->isValid() && ! $validator->errors()->has('model_upload')) {
                $handle = fopen($file->getRealPath(), 'rb');
                $magic = $handle ? fread($handle, 4) : '';
                $handle && fclose($handle);
                if ($magic !== 'glTF') {
                    $validator->errors()->add('model_upload', 'This file is not a binary glTF (.glb) 3D model. Export or download the model as .glb.');
                }
            }
        }];
    }

    public function messages(): array
    {
        return ['slug.in' => 'Published URLs are retained. Edit the car name without changing its URL.', 'uploads.*.mimes' => 'Upload JPEG, PNG or WebP photos. Export HEIC photos as JPEG first.', 'category_id.exists' => 'Choose a category from the list.',
            'model_upload.extensions' => 'Upload the 3D model as a .glb file.', 'model_upload.max' => 'Keep the 3D model under 40 MB. Compress it or choose a lighter version.',
            'model_upload.uploaded' => 'The 3D model did not upload. It may be larger than the server allows; keep it under 40 MB.'];
    }
}
