<?php

namespace App\Services;

use App\Models\Car;

class Catalogue
{
    public function config(string $file): array
    {
        return json_decode(file_get_contents(resource_path('inventory/'.$file.'.json')), true, 512, JSON_THROW_ON_ERROR);
    }

    public function payload(): array
    {
        $records = Car::published()->with('photos', 'category')->orderByDesc('published_at')->orderBy('name')->get();
        $heroEntries = [];
        foreach ([...$this->config('cars'), ...$this->config('wheel-models')] as $record) {
            if (empty($record['showroom'])) {
                continue;
            }
            $public = $records->firstWhere('slug', $record['id']);
            $heroEntries[] = [...array_intersect_key($record, array_flip(['id', 'name', 'year', 'mileage', 'importYear', 'body', 'showroom', 'modelReference', 'availabilityNote'])),
                'href' => ! empty($record['modelReference']) ? '/models/'.$record['id'].'/' : ($public ? '/cars/'.$public->slug.'/' : '/inventory/'),
                'status' => $public?->status];
        }
        usort($heroEntries, fn ($a, $b) => ($a['showroom']['order'] ?? 99) <=> ($b['showroom']['order'] ?? 99));
        $site = $this->config('site');
        $site['origin'] = rtrim(config('app.url'), '/');

        return ['site' => $site, 'heroCars' => $heroEntries, 'cars' => $records->map->publicData()->values()->all(),
            'featuredCars' => $records->filter(fn ($c) => $c->status === 'available' && $c->is_featured)->sortBy('featured_order')->map->publicData()->values()->all(),
            'soldCars' => $records->where('status', 'sold')->sortByDesc('sold_at')->take(6)->map->publicData()->values()->all(),
            'wheelModels' => $this->config('wheel-models'), 'trust' => $this->config('trust'),
            'showroomFilm' => $this->config('showroom-film'), 'instagramPosts' => $this->config('instagram-posts')];
    }
}
