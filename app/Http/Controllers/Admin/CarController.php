<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\SaveCarRequest;
use App\Models\Car;
use App\Models\CarPhoto;
use App\Models\Category;
use App\Services\SaveCar;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class CarController extends Controller
{
    public function index(Request $request): Response
    {
        $filter = $request->validate(['q' => ['nullable', 'string', 'max:150'], 'status' => ['nullable', Rule::in(['available', 'sold', 'draft', 'archived'])], 'category' => ['nullable', 'string', 'max:20']]);
        $query = Car::query()->with('photos', 'category');
        if (($filter['status'] ?? '') === 'archived') {
            $query->onlyTrashed();
        } elseif ($filter['status'] ?? null) {
            $query->where('status', $filter['status']);
        }
        if (($filter['category'] ?? '') === 'none') {
            $query->whereNull('category_id');
        } elseif (ctype_digit($filter['category'] ?? '')) {
            $query->where('category_id', (int) $filter['category']);
        }
        if ($search = trim($filter['q'] ?? '')) {
            $query->where(fn ($q) => $q->where('name', 'like', '%'.$search.'%')->orWhere('make', 'like', '%'.$search.'%'));
        }

        return Inertia::render('Admin/Inventory', ['cars' => $query->latest('updated_at')->get()->map(fn ($car) => $this->record($car)), 'filters' => $filter, 'stats' => self::stats(), 'categories' => $this->categories()]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/CarEditor', ['car' => null, 'categories' => $this->categories()]);
    }

    public function edit(Car $car): Response
    {
        return Inertia::render('Admin/CarEditor', ['car' => $this->record($car->load('photos', 'category')), 'categories' => $this->categories()]);
    }

    public static function stats(): array
    {
        return ['total' => Car::count(), 'available' => Car::where('status', 'available')->count(), 'sold' => Car::where('status', 'sold')->count(), 'draft' => Car::where('status', 'draft')->count(), 'archived' => Car::onlyTrashed()->count(), 'featured' => Car::published()->where('status', 'available')->where('is_featured', true)->count()];
    }

    private function categories(): array
    {
        return Category::ordered()->get(['id', 'name'])->all();
    }

    public function store(SaveCarRequest $request, SaveCar $save): RedirectResponse
    {
        $car = $save->execute(new Car, $request->validated());

        return redirect('/admin/cars/'.$car->id.'/edit')->with('success', 'Car saved. '.($car->status === 'draft' ? 'It remains a private draft.' : 'Its inventory page is now updated.'));
    }

    public function update(SaveCarRequest $request, Car $car, SaveCar $save): RedirectResponse
    {
        $save->execute($car, $request->validated());

        return back()->with('success', 'Car details, photos and homepage selection updated.');
    }

    public function status(Request $request, Car $car, SaveCar $save): RedirectResponse
    {
        $data = $request->validate(['status' => ['required', Rule::in(['draft', 'available', 'sold'])]]);
        if ($data['status'] !== 'draft' && (! $car->best_for || ! $car->usp)) {
            throw ValidationException::withMessages(['status' => 'Complete the ideal buyer and standout feature before publishing.']);
        }
        $save->execute($car, $data);

        return back()->with('success', 'Status updated. The website now reflects this change.');
    }

    public function feature(Request $request, Car $car): RedirectResponse
    {
        $data = $request->validate(['is_featured' => ['required', 'boolean']]);
        if ($data['is_featured'] && ($car->status !== 'available' || ! $car->published_at || ! $car->photos()->exists())) {
            throw ValidationException::withMessages(['is_featured' => 'Only published, available cars with photographs can be featured.']);
        }
        $car->update($data);

        return back()->with('success', 'Homepage feature selection updated.');
    }

    public function destroy(Car $car): RedirectResponse
    {
        $car->delete();
        // Return to the dashboard or list the delete came from; the deleted car's own editor no longer opens.
        $back = url()->previous('/admin/cars');
        $path = parse_url($back, PHP_URL_PATH) ?? '';
        if (! str_starts_with($path, '/admin') || str_ends_with($path, '/edit')) {
            $back = '/admin/cars';
        }

        return redirect($back)->with('success', 'Car deleted from the website. It is kept under Archived, where you can restore it or delete it permanently.');
    }

    public function forceDestroy(int $car): RedirectResponse
    {
        $record = Car::onlyTrashed()->with('photos')->findOrFail($car);
        $directories = $record->photos->pluck('directory')->filter()->all();
        DB::transaction(function () use ($record) {
            CarPhoto::where('car_id', $record->id)->delete();
            $record->forceDelete();
        });
        foreach ($directories as $directory) {
            Storage::disk('public')->deleteDirectory($directory);
        }

        return back()->with('success', 'Car permanently deleted with its uploaded photographs.');
    }

    public function restore(int $car): RedirectResponse
    {
        $record = Car::onlyTrashed()->findOrFail($car);
        $record->restore();
        $record->update(['status' => 'draft', 'is_featured' => false]);

        return back()->with('success', 'Car restored as a private draft. Review it before publishing.');
    }

    private function record(Car $car): array
    {
        return [...$car->toArray(), 'photos' => $car->photos->map(fn ($p) => ['id' => $p->id, ...$p->publicData()])->all(), 'public_url' => '/cars/'.$car->slug.'/'];
    }
}
