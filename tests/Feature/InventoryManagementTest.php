<?php

namespace Tests\Feature;

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\Car;
use App\Models\User;
use Database\Seeders\InventorySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class InventoryManagementTest extends TestCase
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

    private function payload(array $extra = []): array
    {
        return [...['name' => 'QA Test Sedan', 'make' => 'QA', 'model' => 'Test Sedan', 'year' => 2025, 'status' => 'available', 'best_for' => 'A disposable test listing.', 'usp' => 'Tests real inventory persistence.', 'is_featured' => true, 'featured_order' => 0, 'uploads' => [UploadedFile::fake()->image('test.jpg', 1200, 900)]], ...$extra];
    }

    public function test_original_inventory_is_seeded_once_without_overwriting_owner_edits(): void
    {
        $this->assertDatabaseCount('cars', 9);
        $this->assertDatabaseCount('car_photos', 39);
        $car = Car::first();
        $car->update(['name' => 'Owner edit']);
        $this->seed(InventorySeeder::class);
        $this->assertSame('Owner edit', $car->fresh()->name);
        $this->assertDatabaseCount('car_photos', 39);
    }

    public function test_admin_routes_require_login_and_no_public_registration_exists(): void
    {
        $this->get('/admin')->assertRedirect('/admin/login');
        $this->post('/admin/cars', $this->payload())->assertRedirect('/admin/login');
        $this->get('/register')->assertNotFound();
    }

    public function test_regular_users_cannot_manage_any_inventory(): void
    {
        $this->actingAs(User::factory()->create())->get('/admin')->assertForbidden();
        $this->post('/admin/cars', $this->payload())->assertForbidden();
    }

    public function test_public_inventory_does_not_expose_private_drafts_or_admin_data(): void
    {
        $car = Car::first();
        $slug = $car->slug;
        $car->update(['status' => 'draft']);
        $this->getJson('/cars.json')->assertOk()->assertJsonCount(8);
        $this->get('/cars/'.$slug)->assertNotFound();
        $this->assertStringNotContainsString('password', $this->getJson('/cars.json')->getContent());
    }

    public function test_publishing_with_real_upload_generates_responsive_photos_and_all_public_views(): void
    {
        $this->actingAs($this->admin())->post('/admin/cars', $this->payload())->assertRedirect();
        $car = Car::where('name', 'QA Test Sedan')->firstOrFail();
        $this->assertTrue($car->is_featured);
        $photo = $car->photos()->firstOrFail();
        foreach (['src' => 1200, 'medium' => 800, 'small' => 400] as $key => $width) {
            $path = str_replace('/storage/', '', $photo->publicData()[$key]);
            Storage::disk('public')->assertExists($path);
            $this->assertSame($width, getimagesize(Storage::disk('public')->path($path))[0]);
        }
        $this->getJson('/cars.json')->assertJsonFragment(['id' => $car->slug]);
        $this->withHeader('X-Inertia', 'true')->get('/cars/'.$car->slug)->assertOk()->assertJsonPath('props.car.name', 'QA Test Sedan');
        $this->withHeader('X-Inertia', 'true')->get('/')->assertJsonPath('props.featuredCars.0.id', $car->slug);
    }

    public function test_sold_state_is_persistent_visible_and_removed_from_featured(): void
    {
        $car = Car::first();
        $this->actingAs($this->admin())->patch('/admin/cars/'.$car->id.'/status', ['status' => 'sold'])->assertRedirect();
        $this->assertSame('sold', $car->fresh()->status);
        $this->assertFalse($car->fresh()->is_featured);
        $r = $this->withHeader('X-Inertia', 'true')->get('/');
        $r->assertJsonPath('props.soldCars.0.id', $car->slug);
        $this->assertNotContains($car->slug, array_column($r->json('props.featuredCars'), 'id'));
        $this->withHeader('X-Inertia', 'true')->get('/cars/'.$car->slug)->assertJsonPath('props.car.status', 'sold');
        $this->getJson('/cars.json')->assertJsonFragment(['id' => $car->slug, 'status' => 'sold']);
    }

    public function test_empty_photo_publish_rolls_back_entire_car_creation(): void
    {
        $this->actingAs($this->admin())->postJson('/admin/cars', $this->payload(['uploads' => []]))->assertUnprocessable()->assertJsonValidationErrors('uploads');
        $this->assertDatabaseCount('cars', 9);
    }

    public function test_invalid_image_cannot_be_uploaded(): void
    {
        $this->actingAs($this->admin())->postJson('/admin/cars', $this->payload(['uploads' => [UploadedFile::fake()->createWithContent('bad.svg', '<svg onload="alert(1)"></svg>')]]))->assertUnprocessable()->assertJsonValidationErrors('uploads.0');
        $this->assertDatabaseCount('cars', 9);
    }

    public function test_another_cars_photo_cannot_be_reordered_or_removed(): void
    {
        $a = Car::first();
        $b = Car::whereKeyNot($a->id)->first();
        $id = $b->photos()->first()->id;
        $this->actingAs($this->admin())->putJson('/admin/cars/'.$a->id, ['name' => $a->name, 'status' => 'draft', 'remove_photo_ids' => [$id]])->assertUnprocessable()->assertJsonValidationErrors('remove_photo_ids.0');
        $this->assertDatabaseHas('car_photos', ['id' => $id, 'car_id' => $b->id]);
    }

    public function test_cover_order_and_photo_captions_are_saved(): void
    {
        $car = Car::first();
        $ids = $car->photos()->pluck('id')->reverse()->values()->all();
        $photo = $car->photos()->first();
        $this->actingAs($this->admin())->put('/admin/cars/'.$car->id, ['slug' => $car->slug, 'name' => $car->name, 'status' => 'available', 'best_for' => $car->best_for, 'usp' => $car->usp, 'photo_order' => $ids, 'photo_updates' => [['id' => $photo->id, 'alt' => 'Revised alt text', 'description' => 'Side profile', 'object_position' => '50% 70%']]])->assertRedirect();
        $this->assertSame($ids[0], $car->fresh()->photos()->first()->id);
        $this->assertSame('Side profile', $photo->fresh()->description);
    }

    public function test_removing_the_last_public_photo_is_rolled_back(): void
    {
        $car = Car::first();
        $ids = $car->photos()->pluck('id')->all();
        $this->actingAs($this->admin())->putJson('/admin/cars/'.$car->id, ['name' => $car->name, 'status' => 'available', 'best_for' => $car->best_for, 'usp' => $car->usp, 'remove_photo_ids' => $ids])->assertUnprocessable()->assertJsonValidationErrors('uploads');
        $this->assertCount(count($ids), $car->fresh()->photos);
    }

    public function test_archive_hides_a_car_and_restore_keeps_it_as_private_draft(): void
    {
        $car = Car::first();
        $this->actingAs($this->admin())->delete('/admin/cars/'.$car->id)->assertRedirect('/admin/cars');
        $this->get('/cars/'.$car->slug)->assertNotFound();
        $this->post('/admin/cars/'.$car->id.'/restore')->assertRedirect();
        $this->assertSame('draft', $car->fresh()->status);
        $this->get('/cars/'.$car->slug)->assertNotFound();
    }

    public function test_deleted_car_can_be_permanently_removed_with_its_uploaded_photos(): void
    {
        $this->actingAs($this->admin())->post('/admin/cars', $this->payload())->assertRedirect();
        $car = Car::where('name', 'QA Test Sedan')->firstOrFail();
        $directory = $car->photos()->first()->directory;
        Storage::disk('public')->assertExists($directory.'/src.webp');

        $this->delete('/admin/cars/'.$car->id.'/permanent')->assertNotFound();
        $this->delete('/admin/cars/'.$car->id)->assertRedirect('/admin/cars');
        $this->delete('/admin/cars/'.$car->id.'/permanent')->assertRedirect();
        $this->assertDatabaseMissing('cars', ['id' => $car->id]);
        $this->assertDatabaseMissing('car_photos', ['car_id' => $car->id]);
        Storage::disk('public')->assertMissing($directory);
        $this->assertDatabaseCount('cars', 9);
    }

    public function test_deleting_from_the_dashboard_returns_to_the_dashboard(): void
    {
        $car = Car::first();
        $this->actingAs($this->admin())->from('/admin')->delete('/admin/cars/'.$car->id)->assertRedirect('/admin');
        $this->from('/admin/cars/'.$car->id.'/edit')->delete('/admin/cars/'.Car::first()->id)->assertRedirect('/admin/cars');
        $this->from('https://example.com/')->delete('/admin/cars/'.Car::first()->id)->assertRedirect('/admin/cars');
    }

    public function test_only_available_public_stock_can_be_featured(): void
    {
        $car = Car::first();
        $car->update(['status' => 'sold', 'is_featured' => false]);
        $this->actingAs($this->admin())->patchJson('/admin/cars/'.$car->id.'/feature', ['is_featured' => true])->assertUnprocessable();
        $this->assertFalse($car->fresh()->is_featured);
    }

    public function test_non_admin_credentials_fail_and_login_is_rate_limited(): void
    {
        $user = User::factory()->create(['password' => 'test-password']);
        for ($i = 0; $i < 5; $i++) {
            $this->post('/admin/login', ['email' => $user->email, 'password' => 'test-password'])->assertSessionHasErrors('email');
        }$this->post('/admin/login', ['email' => $user->email, 'password' => 'test-password'])->assertTooManyRequests();
        $this->assertGuest();
    }

    public function test_multipart_edits_can_clear_optional_lists_and_feature_selection(): void
    {
        $car = Car::first();
        $car->update(['features' => ['Old equipment'], 'notes' => ['Old note'], 'attractions' => [['label' => 'Old', 'value' => 'Fact']], 'is_featured' => true]);
        $this->actingAs($this->admin())->post('/admin/cars/'.$car->id, ['_method' => 'PUT', 'name' => $car->name, 'status' => 'available', 'best_for' => $car->best_for, 'usp' => $car->usp])->assertRedirect();
        $car->refresh();
        $this->assertSame([], $car->features);
        $this->assertSame([], $car->notes);
        $this->assertSame([], $car->attractions);
        $this->assertFalse($car->is_featured);
    }

    public function test_control_fields_cannot_be_mass_assigned_and_unsafe_references_are_rejected(): void
    {
        $car = Car::first();
        $this->actingAs($this->admin())->putJson('/admin/cars/'.$car->id, ['name' => $car->name, 'status' => 'draft', 'source_url' => 'javascript:alert(1)'])->assertUnprocessable()->assertJsonValidationErrors('source_url');
        $this->put('/admin/cars/'.$car->id, ['name' => $car->name, 'status' => 'draft', 'deleted_at' => now(), 'id' => 99999, 'published_at' => '2099-01-01'])->assertRedirect();
        $this->assertSame($car->id, $car->fresh()->id);
        $this->assertNull($car->fresh()->deleted_at);
        $this->assertSame($car->published_at->toDateTimeString(), $car->fresh()->published_at->toDateTimeString());
    }
}
