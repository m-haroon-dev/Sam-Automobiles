<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Car;
use App\Models\Category;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CategoryController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Categories', ['categories' => Category::ordered()->withCount('cars')->get(),
            'uncategorised' => Car::whereNull('category_id')->count()]);
    }

    public function store(Request $request): RedirectResponse
    {
        Category::create($this->validated($request));

        return back()->with('success', 'Category added. Assign it to cars from the car editor.');
    }

    public function update(Request $request, Category $category): RedirectResponse
    {
        $category->update($this->validated($request, $category));

        return back()->with('success', 'Category updated. The website now shows the new name.');
    }

    public function destroy(Category $category): RedirectResponse
    {
        DB::transaction(function () use ($category) {
            Car::withTrashed()->where('category_id', $category->id)->update(['category_id' => null]);
            $category->delete();
        });

        return back()->with('success', 'Category deleted. Its cars are kept without a category.');
    }

    private function validated(Request $request, ?Category $category = null): array
    {
        $request->merge(['slug' => Str::slug($request->input('slug') ?: $request->input('name', ''))]);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80', Rule::unique('categories')->ignore($category?->id)],
            'slug' => ['required', 'string', 'max:100', Rule::unique('categories')->ignore($category?->id)],
            'description' => ['nullable', 'string', 'max:500'],
            'sort_order' => ['nullable', 'integer', 'between:0,9999'],
        ], ['slug.required' => 'Enter a name that contains letters or numbers.', 'slug.unique' => 'Another category already uses this address.']);
        $data['sort_order'] ??= $category?->sort_order ?? Category::max('sort_order') + 1;

        return $data;
    }
}
