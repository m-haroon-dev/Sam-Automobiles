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

class Car3DModelTest extends TestCase
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

    private function glb(string $name = 'dmax.glb', string $magic = 'glTF'): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($name, $magic.pack('V', 2).pack('V', 12).str_repeat("\0", 64));
    }

    /** Saves the car with its current details plus the given changes, as the editor does. */
    private function save(Car $car, array $changes)
    {
        $fields = $car->only(['name', 'make', 'model', 'year', 'status', 'best_for', 'usp', 'body', 'colour']);

        return $this->actingAs(User::factory()->admin()->create())->post('/admin/cars/'.$car->id, ['_method' => 'put', ...$fields, ...$changes]);
    }

    public function test_an_uploaded_glb_model_is_stored_and_published_with_the_car(): void
    {
        $car = Car::firstOrFail();
        $this->save($car, ['model_upload' => $this->glb()])->assertSessionHasNoErrors()->assertRedirect();

        $path = $car->fresh()->model_3d;
        $this->assertMatchesRegularExpression('~^cars/models/[a-z0-9]{32}\.glb$~', $path);
        Storage::disk('public')->assertExists($path);
        $public = collect($this->getJson('/cars.json')->json())->firstWhere('id', $car->slug);
        $this->assertSame('/storage/'.$path, $public['model3d']);
    }

    public function test_replacing_or_removing_the_model_deletes_the_old_file(): void
    {
        $car = Car::firstOrFail();
        $this->save($car, ['model_upload' => $this->glb()]);
        $first = $car->fresh()->model_3d;

        $this->save($car->fresh(), ['model_upload' => $this->glb('new.glb')])->assertSessionHasNoErrors();
        $second = $car->fresh()->model_3d;
        $this->assertNotSame($first, $second);
        Storage::disk('public')->assertMissing($first);
        Storage::disk('public')->assertExists($second);

        $this->save($car->fresh(), ['remove_model' => true])->assertSessionHasNoErrors();
        $this->assertNull($car->fresh()->model_3d);
        Storage::disk('public')->assertMissing($second);
        $this->assertNull(collect($this->getJson('/cars.json')->json())->firstWhere('id', $car->slug)['model3d']);
    }

    public function test_saving_other_details_keeps_the_model(): void
    {
        $car = Car::firstOrFail();
        $this->save($car, ['model_upload' => $this->glb()]);
        $path = $car->fresh()->model_3d;
        $this->save($car->fresh(), ['colour' => 'Obsidian Grey'])->assertSessionHasNoErrors();
        $this->assertSame($path, $car->fresh()->model_3d);
        Storage::disk('public')->assertExists($path);
    }

    public function test_files_that_are_not_glb_models_are_refused(): void
    {
        $car = Car::firstOrFail();
        $this->save($car, ['model_upload' => $this->glb('model.obj')])->assertSessionHasErrors('model_upload');
        $this->save($car, ['model_upload' => $this->glb('fake.glb', 'PK34')])->assertSessionHasErrors('model_upload');
        $this->save($car, ['model_upload' => UploadedFile::fake()->create('huge.glb', 41000)])->assertSessionHasErrors('model_upload');
        $this->assertNull($car->fresh()->model_3d);
        $this->assertSame([], Storage::disk('public')->allFiles('cars/models'));
    }

    public function test_permanently_deleting_a_car_deletes_its_model(): void
    {
        $car = Car::firstOrFail();
        $this->save($car, ['model_upload' => $this->glb()]);
        $path = $car->fresh()->model_3d;
        $admin = User::factory()->admin()->create();
        $this->actingAs($admin)->delete('/admin/cars/'.$car->id);
        $this->actingAs($admin)->delete('/admin/cars/'.$car->id.'/permanent')->assertRedirect();
        Storage::disk('public')->assertMissing($path);
    }
}
