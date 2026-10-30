<?php

use App\Http\Controllers\Admin\AuthController;
use App\Http\Controllers\Admin\CarController;
use App\Http\Controllers\Admin\CategoryController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\ProfileController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\CatalogueController;
use Illuminate\Support\Facades\Route;
use Inertia\Middleware\EncryptHistory;

Route::get('/', [CatalogueController::class, 'page'])->defaults('page', 'Home')->name('home');
foreach (['inventory' => 'Inventory', 'shortlist' => 'Shortlist', 'compare' => 'Compare', 'visit' => 'Visit', 'sell' => 'Sell', 'about' => 'About', 'privacy' => 'Privacy', 'wheel-preview' => 'Wheel', 'offline.html' => 'Offline', '404.html' => 'NotFound'] as $path => $page) {
    Route::get('/'.$path, [CatalogueController::class, 'page'])->defaults('page', $page);
}
Route::get('/cars/{slug}', [CatalogueController::class, 'car'])->name('cars.show');
Route::get('/models/{slug}', [CatalogueController::class, 'model']);
Route::get('/cars.json', [CatalogueController::class, 'json']);
Route::get('/sitemap.xml', [CatalogueController::class, 'sitemap']);
Route::get('/robots.txt', fn () => response("User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: ".rtrim(config('app.url'), '/')."/sitemap.xml\n")->header('Content-Type', 'text/plain'));
Route::middleware('guest')->group(function () {
    Route::get('/admin/login', [AuthController::class, 'create'])->name('login');
    Route::post('/admin/login', [AuthController::class, 'store']);
});
// Signing out needs only a session, so a user whose sign-in was turned off can still end it.
Route::post('/admin/logout', [AuthController::class, 'destroy'])->middleware('auth')->name('logout');
// Admin pages keep their history encrypted; signing out clears the key, so Back asks the server again instead of showing old pages.
Route::middleware(['auth', 'panel', EncryptHistory::class])->prefix('admin')->group(function () {
    // Every signed-in account manages cars, categories and its own profile.
    Route::get('/', DashboardController::class)->name('admin.index');
    Route::get('/cars', [CarController::class, 'index'])->name('admin.cars');
    Route::get('/cars/create', [CarController::class, 'create']);
    Route::post('/cars', [CarController::class, 'store']);
    Route::get('/cars/{car}/edit', [CarController::class, 'edit']);
    Route::put('/cars/{car}', [CarController::class, 'update']);
    Route::patch('/cars/{car}/status', [CarController::class, 'status']);
    Route::patch('/cars/{car}/feature', [CarController::class, 'feature']);
    Route::delete('/cars/{car}', [CarController::class, 'destroy']);
    Route::delete('/cars/{car}/permanent', [CarController::class, 'forceDestroy']);
    Route::post('/cars/{car}/restore', [CarController::class, 'restore']);
    Route::get('/categories', [CategoryController::class, 'index'])->name('admin.categories');
    Route::post('/categories', [CategoryController::class, 'store']);
    Route::put('/categories/{category}', [CategoryController::class, 'update']);
    Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);
    Route::get('/profile', [ProfileController::class, 'show'])->name('admin.profile');
    Route::put('/profile', [ProfileController::class, 'update']);
    Route::put('/profile/password', [ProfileController::class, 'password']);

    // Only the single Admin manages user accounts.
    Route::middleware('admin')->group(function () {
        Route::get('/users', [UserController::class, 'index'])->name('admin.users');
        Route::post('/users', [UserController::class, 'store']);
        Route::put('/users/{user}', [UserController::class, 'update']);
        Route::delete('/users/{user}', [UserController::class, 'destroy']);
        Route::post('/users/{user}/make-admin', [UserController::class, 'makeAdmin']);
    });
});
Route::fallback(fn () => app(CatalogueController::class)->page(request(), 'NotFound')->toResponse(request())->setStatusCode(404));
