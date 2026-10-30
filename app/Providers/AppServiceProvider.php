<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $publicPath = config('app.public_path');
        if ($publicPath) {
            $this->app->usePublicPath(str_starts_with($publicPath, DIRECTORY_SEPARATOR) ? $publicPath : base_path($publicPath));
            config()->set('filesystems.links', [public_path('storage') => storage_path('app/public')]);
        }
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Login attempt limits are applied to failed credentials in AuthController.
    }
}
