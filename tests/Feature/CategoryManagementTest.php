<?php

namespace Tests\Feature;

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\Car;
use App\Models\Category;
use App\Models\User;
use Database\Seeders\InventorySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class CategoryManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        $this->seed(InventorySeeder::class);
        Storage::fake('public');
        $version = (new HandleInertiaRequests)->version(Request::create('/'));
        if ($version !== null) {
            $this->withHeader('X-Inertia-Version', $version);
        }
    }

    private function admin(): User
    {
        return User::factory()->admin()->create();
    }

    public function test_seeded_cars_are_grouped_by_their_body_style(): void
    {
        $this->assertSame(['Pickup' => 1, 'SUV' => 5, 'Saloon' => 3], Category::withCount('cars')->orderBy('name')->pluck('cars_count', 'name')->all());
        $this->assertDatabaseMissing('cars', ['category_id' => null]);
    }

    public function test_category_pages_require_an_administrator(): void
    {
        $this->get('/admin/categories')->assertRedirect('/admin/login');
        $this->post('/admin/categories', ['name' => 'Electric'])->assertRedirect('/admin/login');
        $this->actingAs(User::factory()->create())->get('/admin/categories')->assertForbidden();
        $this->post('/admin/categories', ['name' => 'Electric'])->assertForbidden();
        $this->assertDatabaseMissing('categories', ['name' => 'Electric']);
    }

    public function test_dashboard_cars_and_categories_pages_render_for_admins(): void
    {
        // All admin screens live in AdminApp.jsx, so there is no per-page component file to check for.
        $this->actingAs($this->admin());
        $this->get('/admin')->assertOk()->assertInertia(fn (AssertableInertia $page) => $page->component('Admin/Dashboard', false)
            ->where('stats.total', 9)->has('recent', 6)->has('featured', 6)->where('featured.0.featured_order', 0)->where('insights.added', 9)->where('insights.sold', 0)
            ->has('categories', 3)->where('adminNav.categories', 3));
        $this->get('/admin/cars')->assertOk()->assertInertia(fn (AssertableInertia $page) => $page->component('Admin/Inventory', false)->has('cars', 9)->has('categories', 3));
        $this->get('/admin/categories')->assertOk()->assertInertia(fn (AssertableInertia $page) => $page->component('Admin/Categories', false)->has('categories', 3));
    }

    public function test_admin_can_add_rename_and_delete_a_category(): void
    {
        $this->actingAs($this->admin())->post('/admin/categories', ['name' => 'Electric Cars', 'description' => 'Battery electric stock'])->assertRedirect()->assertSessionHasNoErrors();
        $category = Category::where('name', 'Electric Cars')->firstOrFail();
        $this->assertSame('electric-cars', $category->slug);
        $this->assertSame(3, $category->sort_order);

        $this->post('/admin/categories', ['name' => 'Electric Cars'])->assertSessionHasErrors('name');
        $this->post('/admin/categories', ['name' => '!!!'])->assertSessionHasErrors('slug');

        $this->put('/admin/categories/'.$category->id, ['name' => 'Electric', 'slug' => 'electric', 'sort_order' => 0])->assertRedirect()->assertSessionHasNoErrors();
        $this->assertSame(['Electric', 'electric', 0], [$category->fresh()->name, $category->fresh()->slug, $category->fresh()->sort_order]);

        $this->delete('/admin/categories/'.$category->id)->assertRedirect();
        $this->assertModelMissing($category);
    }

    public function test_deleting_a_category_keeps_its_cars_including_archived_ones(): void
    {
        $suv = Category::where('name', 'SUV')->firstOrFail();
        $archived = Car::where('category_id', $suv->id)->first();
        $archived->delete();
        $this->actingAs($this->admin())->delete('/admin/categories/'.$suv->id)->assertRedirect();
        $this->assertSame(5, Car::withTrashed()->whereNull('category_id')->count());
        $this->assertDatabaseCount('cars', 9);
    }

    public function test_cars_can_be_assigned_a_category_and_filtered_by_it(): void
    {
        $car = Car::first();
        $electric = Category::create(['name' => 'Electric', 'slug' => 'electric']);
        $this->actingAs($this->admin())->put('/admin/cars/'.$car->id, ['name' => $car->name, 'status' => 'available', 'best_for' => $car->best_for, 'usp' => $car->usp, 'category_id' => $electric->id])->assertRedirect()->assertSessionHasNoErrors();
        $this->assertSame($electric->id, $car->fresh()->category_id);

        $this->get('/admin/cars?category='.$electric->id)->assertInertia(fn (AssertableInertia $page) => $page->has('cars', 1)->where('cars.0.id', $car->id));
        $this->put('/admin/cars/'.$car->id, ['name' => $car->name, 'status' => 'available', 'best_for' => $car->best_for, 'usp' => $car->usp, 'category_id' => 99999])->assertSessionHasErrors('category_id');

        $this->put('/admin/cars/'.$car->id, ['name' => $car->name, 'status' => 'available', 'best_for' => $car->best_for, 'usp' => $car->usp, 'category_id' => ''])->assertSessionHasNoErrors();
        $this->assertNull($car->fresh()->category_id);
        $this->get('/admin/cars?category=none')->assertInertia(fn (AssertableInertia $page) => $page->has('cars', 1));
    }

    public function test_public_catalogue_exposes_each_cars_category(): void
    {
        $cars = collect($this->getJson('/cars.json')->assertOk()->json());
        $this->assertSame(5, $cars->where('category', 'SUV')->count());
        $this->assertSame('suv', $cars->firstWhere('category', 'SUV')['categorySlug']);
    }
}
