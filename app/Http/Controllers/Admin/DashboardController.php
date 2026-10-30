<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Car;
use App\Models\Category;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(): Response
    {
        $card = fn ($car) => ['id' => $car->id, 'name' => $car->name, 'year' => $car->year, 'status' => $car->status, 'is_featured' => $car->is_featured,
            'featured_order' => $car->featured_order, 'category' => $car->category?->name, 'photo' => $car->photos->first()?->publicData(), 'updated_at' => $car->updated_at?->toIso8601String()];
        $since = now()->subDays(30);

        return Inertia::render('Admin/Dashboard', ['stats' => CarController::stats(),
            'recent' => Car::with('photos', 'category')->latest('updated_at')->take(6)->get()->map($card),
            'featured' => Car::published()->where('status', 'available')->where('is_featured', true)->with('photos', 'category')->orderBy('featured_order')->orderBy('name')->take(6)->get()->map($card),
            'insights' => ['added' => Car::where('created_at', '>=', $since)->count(), 'sold' => Car::where('status', 'sold')->where('sold_at', '>=', $since)->count()],
            'categories' => Category::ordered()->withCount('cars')->get(['id', 'name']), 'uncategorised' => Car::whereNull('category_id')->count()]);
    }
}
