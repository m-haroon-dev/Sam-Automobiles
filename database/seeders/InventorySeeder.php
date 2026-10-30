<?php

namespace Database\Seeders;

use App\Models\Car;
use App\Models\Category;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class InventorySeeder extends Seeder
{
    public function run(): void
    {
        $records = json_decode(file_get_contents(resource_path('inventory/cars.json')), true, 512, JSON_THROW_ON_ERROR);
        foreach ($records as $index => $c) {
            if (Car::withTrashed()->where('slug', $c['id'])->exists()) {
                continue;
            }
            $category = $c['body'] ? Category::firstOrCreate(['slug' => Str::slug($c['body'])], ['name' => $c['body'], 'sort_order' => Category::count()]) : null;
            $car = Car::create(['slug' => $c['id'], 'category_id' => $category?->id, 'name' => $c['name'], 'make' => $c['make'], 'model' => $c['model'], 'year' => $c['year'],
                'trim' => $c['trim'], 'mileage' => $c['mileage'], 'price' => $c['price'], 'status' => $c['status'],
                'is_featured' => $c['status'] === 'available', 'featured_order' => $index, 'body' => $c['body'], 'fuel' => $c['fuel'],
                'colour' => $c['colour'], 'interior' => $c['interior'], 'registration' => $c['registration'], 'origin' => $c['origin'],
                'import_year' => $c['importYear'], 'import_mileage' => $c['importMileageKm'], 'auction_grade' => $c['auctionGrade'],
                'best_for' => $c['bestFor'], 'usp' => $c['usp'], 'features' => $c['features'], 'attractions' => $c['attractions'], 'notes' => $c['notes'],
                'showroom' => $c['showroom'], 'source_url' => $c['instagramPermalink'], 'performance_source' => $c['performanceSource'] ?? null,
                'performance_note' => $c['performanceNote'] ?? null, 'published_at' => $c['advertisedDate'].' 12:00:00']);
            foreach ($c['photos'] as $i => $p) {
                $car->photos()->create(['variants' => array_intersect_key($p, array_flip(['src', 'medium', 'small', 'srcWidth', 'mediumWidth', 'smallWidth'])),
                    'width' => $p['width'], 'height' => $p['height'], 'alt' => $p['alt'], 'description' => $p['description'],
                    'object_position' => $p['objectPosition'] ?? '50% 65%', 'representative' => $p['representative'] ?? false, 'sort_order' => $i]);
            }
        }
    }
}
