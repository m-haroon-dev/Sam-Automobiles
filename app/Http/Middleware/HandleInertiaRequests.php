<?php

namespace App\Http\Middleware;

use App\Models\Car;
use App\Models\Category;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function share(Request $request): array
    {
        return [...parent::share($request),
            'auth' => fn () => ['user' => $request->user()?->summary()],
            'flash' => fn () => ['success' => $request->session()->get('success')],
            'adminNav' => fn () => $request->user()?->is_active ? ['cars' => Car::count(), 'categories' => Category::count(), ...($request->user()->is_admin ? ['users' => User::count()] : [])] : null];
    }
}
