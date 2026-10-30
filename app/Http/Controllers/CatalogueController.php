<?php

namespace App\Http\Controllers;

use App\Models\Car;
use App\Services\Catalogue;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Inertia\Inertia;
use Inertia\Response;

class CatalogueController extends Controller
{
    public function __construct(private Catalogue $catalogue) {}

    public function page(Request $request, string $page = 'Home'): Response
    {
        $titles = ['Home' => 'Imported luxury cars in Karachi', 'Inventory' => 'The open catalogue', 'Shortlist' => 'Saved cars', 'Compare' => 'Compare cars', 'Visit' => 'Visit the showroom', 'Sell' => 'Sell or trade in your car', 'About' => 'About SAM', 'Privacy' => 'Privacy & website information', 'Wheel' => 'Animated wheel collection', 'Offline' => 'You are offline', 'NotFound' => 'Page not found'];

        return Inertia::render('Public/'.$page, [...$this->catalogue->payload(), 'page' => $page, 'seo' => $this->seo($titles[$page] ?? 'SAM Automobiles', $request->path())]);
    }

    public function car(Request $request, string $slug): Response
    {
        $car = Car::published()->where('slug', $slug)->with('photos', 'category')->firstOrFail();

        return Inertia::render('Public/Vehicle', [...$this->catalogue->payload(), 'page' => 'Vehicle', 'car' => $car->publicData(), 'seo' => $this->seo($car->name.' · '.$car->year, $request->path(), $car)]);
    }

    public function model(Request $request, string $slug): Response
    {
        $payload = $this->catalogue->payload();
        $model = collect($payload['wheelModels'])->firstWhere('id', $slug);
        abort_unless($model, 404);

        return Inertia::render('Public/Model', [...$payload, 'page' => 'Model', 'model' => $model, 'seo' => $this->seo($model['name'], $request->path())]);
    }

    public function json(): JsonResponse
    {
        return response()->json($this->catalogue->payload()['cars'])->header('Cache-Control', 'no-cache, must-revalidate');
    }

    public function sitemap(): HttpResponse
    {
        $paths = ['/', '/inventory/', '/about/', '/visit/', '/sell/', '/privacy/'];
        foreach (Car::published()->pluck('slug') as $slug) {
            $paths[] = '/cars/'.$slug.'/';
        }
        foreach ($this->catalogue->config('wheel-models') as $model) {
            $paths[] = '/models/'.$model['id'].'/';
        }
        $xml = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
        foreach ($paths as $path) {
            $xml .= '<url><loc>'.htmlspecialchars(rtrim(config('app.url'), '/').$path, ENT_XML1).'</loc></url>';
        }

        return response($xml.'</urlset>')->header('Content-Type', 'application/xml');
    }

    private function seo(string $title, string $path, ?Car $car = null): array
    {
        $origin = rtrim(config('app.url'), '/');
        $url = $origin.'/'.ltrim($path, '/');
        $site = $this->catalogue->config('site');
        $schema = ['@context' => 'https://schema.org', '@type' => 'AutoDealer', 'name' => 'SAM Automobiles', 'url' => $origin, 'telephone' => $site['phone'], 'address' => ['@type' => 'PostalAddress', 'streetAddress' => $site['address'], 'addressLocality' => 'Karachi', 'addressCountry' => 'PK'], 'openingHours' => ['Mo-Sa 11:00-19:00']];
        if ($car) {
            $schema = ['@context' => 'https://schema.org', '@type' => 'Vehicle', 'name' => $car->name, 'url' => $url, 'vehicleModelDate' => $car->year, 'description' => $car->best_for, 'image' => $origin.($car->photos->first()?->publicData()['src'] ?? '/assets/icon-512.png')];
            if ($car->mileage !== null) {
                $schema['mileageFromOdometer'] = ['@type' => 'QuantitativeValue', 'value' => $car->mileage, 'unitCode' => 'KMT'];
            }
            if ($car->price !== null) {
                $schema['offers'] = ['@type' => 'Offer', 'price' => $car->price, 'priceCurrency' => 'PKR', 'url' => $url, 'availability' => 'https://schema.org/'.($car->status === 'sold' ? 'OutOfStock' : 'InStock')];
            }
        }

        return ['title' => $title.' | SAM Automobiles', 'description' => $car?->best_for ?? 'Explore SAM Automobiles’ imported luxury and executive cars, photographs and advertised details in Karachi.', 'url' => $url, 'image' => $origin.($car?->photos->first()?->publicData()['medium'] ?? '/assets/branding/sam-logo-transparent.webp'), 'noindex' => preg_match('~^(admin|compare|shortlist|wheel-preview|404|offline)~', $path) === 1, 'schema' => $schema];
    }
}
