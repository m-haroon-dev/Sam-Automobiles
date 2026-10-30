<?php

namespace Tests\Feature;

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\Car;
use App\Models\Category;
use App\Models\User;
use Database\Seeders\InventorySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    private const PASSWORD = 'Showroom-Pass-2026!';

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        Storage::fake('public');
        $version = (new HandleInertiaRequests)->version(Request::create('/'));
        if ($version !== null) {
            $this->withHeader('X-Inertia-Version', $version);
        }
    }

    private function newUser(array $extra = []): array
    {
        return ['name' => 'Showroom Manager', 'email' => 'manager@example.com', 'password' => self::PASSWORD, 'password_confirmation' => self::PASSWORD, 'is_active' => true, ...$extra];
    }

    private function details(User $user, array $extra = []): array
    {
        return ['name' => $user->name, 'email' => $user->email, 'is_active' => $user->is_active, ...$extra];
    }

    public function test_user_pages_are_for_the_admin_only(): void
    {
        $this->get('/admin/users')->assertRedirect('/admin/login');
        $this->actingAs(User::factory()->create())->get('/admin/users')->assertForbidden();
        $this->actingAs(User::factory()->member()->create())->get('/admin/users')->assertForbidden();
        $this->post('/admin/users', $this->newUser())->assertForbidden();
        $this->assertDatabaseMissing('users', ['email' => 'manager@example.com']);
    }

    public function test_a_user_cannot_edit_delete_or_take_over_the_admin(): void
    {
        $admin = User::factory()->admin()->create(['name' => 'Owner']);
        $member = User::factory()->member()->create();
        $this->actingAs($member);
        $this->put('/admin/users/'.$admin->id, $this->details($admin, ['name' => 'Changed']))->assertForbidden();
        $this->delete('/admin/users/'.$admin->id)->assertForbidden();
        $this->post('/admin/users/'.$member->id.'/make-admin')->assertForbidden();
        $this->assertSame(['Owner', true, false], [$admin->fresh()->name, $admin->fresh()->is_admin, $member->fresh()->is_admin]);
    }

    public function test_users_manage_cars_and_categories_but_not_user_accounts(): void
    {
        $this->seed(InventorySeeder::class);
        $car = Car::first();
        $category = Category::first();
        $this->actingAs(User::factory()->member()->create());

        $this->get('/admin')->assertOk()->assertInertia(fn (AssertableInertia $page) => $page->component('Admin/Dashboard', false)->missing('adminNav.users')->where('auth.user.is_admin', false));
        $this->get('/admin/cars/create')->assertOk();
        $this->get('/admin/cars/'.$car->id.'/edit')->assertOk();

        $this->post('/admin/cars', ['name' => 'User Added Car', 'status' => 'draft', 'category_id' => $category->id])->assertRedirect()->assertSessionHasNoErrors();
        $added = Car::where('name', 'User Added Car')->firstOrFail();
        $this->assertSame($category->id, $added->category_id);
        $this->put('/admin/cars/'.$car->id, ['name' => 'User edit', 'status' => 'available', 'best_for' => $car->best_for, 'usp' => $car->usp])->assertSessionHasNoErrors();
        $this->assertSame('User edit', $car->fresh()->name);
        $this->patch('/admin/cars/'.$car->id.'/status', ['status' => 'sold'])->assertSessionHasNoErrors();
        $this->assertSame('sold', $car->fresh()->status);
        $this->delete('/admin/cars/'.$added->id)->assertRedirect();
        $this->delete('/admin/cars/'.$added->id.'/permanent')->assertRedirect();
        $this->assertDatabaseMissing('cars', ['id' => $added->id]);

        $this->post('/admin/categories', ['name' => 'Electric'])->assertSessionHasNoErrors();
        $electric = Category::where('name', 'Electric')->firstOrFail();
        $this->put('/admin/categories/'.$electric->id, ['name' => 'Electric Cars'])->assertSessionHasNoErrors();
        $this->assertSame('Electric Cars', $electric->fresh()->name);
        $this->delete('/admin/categories/'.$electric->id)->assertRedirect();
        $this->assertModelMissing($electric);

        $this->get('/admin/users')->assertForbidden();
        $this->post('/admin/users', $this->newUser())->assertForbidden();
    }

    public function test_users_table_lists_every_account_with_photos_and_without_secrets(): void
    {
        $admin = User::factory()->admin()->create();
        User::factory()->member()->create(['avatar_path' => 'avatars/test.webp']);
        $this->actingAs($admin)->get('/admin/users')->assertOk()->assertInertia(fn (AssertableInertia $page) => $page->component('Admin/Users', false)
            ->has('users', 2)->where('users.0.id', $admin->id)->where('users.0.is_you', true)->where('users.1.is_admin', false)
            ->where('users.1.avatar_url', '/storage/avatars/test.webp')->missing('users.0.password')->missing('users.1.avatar_path')->where('adminNav.users', 2));
    }

    public function test_the_admin_creates_users_with_a_photo_who_can_then_sign_in(): void
    {
        $this->actingAs(User::factory()->admin()->create())->post('/admin/users', $this->newUser(['email' => ' Manager@Example.com ', 'avatar' => UploadedFile::fake()->image('face.jpg', 900, 600)]))
            ->assertRedirect()->assertSessionHasNoErrors();
        $user = User::where('email', 'manager@example.com')->firstOrFail();
        $this->assertSame([false, true], [$user->is_admin, $user->is_active]);
        $this->assertTrue(Hash::check(self::PASSWORD, $user->password));
        Storage::disk('public')->assertExists($user->avatar_path);
        $this->assertSame([256, 256], array_slice(getimagesizefromstring(Storage::disk('public')->get($user->avatar_path)), 0, 2));

        $this->post('/admin/logout');
        $this->post('/admin/login', ['email' => 'manager@example.com', 'password' => self::PASSWORD])->assertRedirect('/admin');
        $this->assertAuthenticatedAs($user);
    }

    public function test_there_is_only_ever_one_admin(): void
    {
        $this->actingAs(User::factory()->admin()->create())->post('/admin/users', $this->newUser(['is_admin' => true, 'role' => 'admin']))->assertSessionHasNoErrors();
        $this->assertFalse(User::where('email', 'manager@example.com')->value('is_admin'));
        $this->assertSame(1, User::where('is_admin', true)->count());
    }

    public function test_the_admin_role_can_be_handed_over(): void
    {
        $admin = User::factory()->admin()->create();
        $member = User::factory()->member()->create(['name' => 'New Owner']);
        $inactive = User::factory()->create();
        $this->actingAs($admin)->post('/admin/users/'.$inactive->id.'/make-admin')->assertSessionHasErrors('user');
        $this->post('/admin/users/'.$admin->id.'/make-admin')->assertSessionHasErrors('user');

        $this->post('/admin/users/'.$member->id.'/make-admin')->assertRedirect('/admin');
        $this->assertSame([false, true], [$admin->fresh()->is_admin, $member->fresh()->is_admin]);
        $this->assertSame(1, User::where('is_admin', true)->count());
        $this->actingAs($admin->fresh())->get('/admin/users')->assertForbidden();
    }

    public function test_new_users_need_a_strong_confirmed_password_a_unique_email_and_a_real_photo(): void
    {
        $admin = User::factory()->admin()->create();
        $this->actingAs($admin)->post('/admin/users', $this->newUser(['password' => 'short', 'password_confirmation' => 'short']))->assertSessionHasErrors('password');
        $this->post('/admin/users', $this->newUser(['password_confirmation' => 'Different-Pass-2026!']))->assertSessionHasErrors('password');
        $this->post('/admin/users', $this->newUser(['email' => strtoupper($admin->email)]))->assertSessionHasErrors('email');
        $this->post('/admin/users', $this->newUser(['avatar' => UploadedFile::fake()->create('notes.pdf', 10, 'application/pdf')]))->assertSessionHasErrors('avatar');
        $this->assertDatabaseCount('users', 1);
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_the_admin_can_edit_a_user_replace_their_photo_and_reset_their_password(): void
    {
        $this->actingAs(User::factory()->admin()->create());
        $this->post('/admin/users', $this->newUser(['avatar' => UploadedFile::fake()->image('a.png', 300, 300)]));
        $other = User::where('email', 'manager@example.com')->firstOrFail();
        $first = $other->avatar_path;

        $this->post('/admin/users/'.$other->id, $this->details($other, ['_method' => 'PUT', 'name' => 'New Name', 'avatar' => UploadedFile::fake()->image('b.webp', 400, 500)]))->assertSessionHasNoErrors();
        $other->refresh();
        $this->assertSame('New Name', $other->name);
        $this->assertNotSame($first, $other->avatar_path);
        Storage::disk('public')->assertMissing($first);
        Storage::disk('public')->assertExists($other->avatar_path);

        DB::table('sessions')->insert(['id' => 'other-session', 'user_id' => $other->id, 'payload' => '', 'last_activity' => time()]);
        $this->put('/admin/users/'.$other->id, $this->details($other, ['password' => 'Another-Pass-2026!', 'password_confirmation' => 'Another-Pass-2026!', 'remove_avatar' => true]))->assertSessionHasNoErrors();
        $this->assertTrue(Hash::check('Another-Pass-2026!', $other->fresh()->password));
        $this->assertNull($other->fresh()->avatar_path);
        $this->assertSame([], Storage::disk('public')->allFiles());
        $this->assertDatabaseMissing('sessions', ['id' => 'other-session']);
    }

    public function test_turning_off_sign_in_blocks_the_user(): void
    {
        $other = User::factory()->member()->create(['password' => self::PASSWORD]);
        $this->actingAs(User::factory()->admin()->create())->put('/admin/users/'.$other->id, $this->details($other, ['is_active' => false]))->assertSessionHasNoErrors();
        $this->assertFalse($other->fresh()->is_active);
        $this->actingAs($other->fresh())->get('/admin')->assertForbidden();
        $this->post('/admin/logout');
        $this->post('/admin/login', ['email' => $other->email, 'password' => self::PASSWORD])->assertSessionHasErrors('email');
    }

    public function test_the_admin_cannot_lock_themselves_out(): void
    {
        $admin = User::factory()->admin()->create();
        $this->actingAs($admin)->put('/admin/users/'.$admin->id, $this->details($admin, ['is_active' => false]))->assertSessionHasErrors('user');
        $this->delete('/admin/users/'.$admin->id)->assertSessionHasErrors('user');
        $this->assertSame([true, true], [$admin->fresh()->is_admin, $admin->fresh()->is_active]);

        $this->put('/admin/users/'.$admin->id, $this->details($admin, ['name' => 'Renamed Owner']))->assertSessionHasNoErrors();
        $this->assertSame('Renamed Owner', $admin->fresh()->name);

        $member = User::factory()->member()->create(['avatar_path' => 'avatars/old.webp']);
        Storage::disk('public')->put('avatars/old.webp', 'x');
        $this->delete('/admin/users/'.$member->id)->assertSessionHasNoErrors();
        $this->assertModelMissing($member);
        Storage::disk('public')->assertMissing('avatars/old.webp');
    }

    public function test_the_create_admin_command_refuses_a_second_admin(): void
    {
        $admin = User::factory()->admin()->create();
        $this->artisan('sam:create-admin', ['email' => 'second@example.com'])->expectsOutputToContain($admin->email)->assertFailed();
        $this->assertDatabaseMissing('users', ['email' => 'second@example.com']);
    }
}
