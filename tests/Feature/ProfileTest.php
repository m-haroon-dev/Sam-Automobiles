<?php

namespace Tests\Feature;

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class ProfileTest extends TestCase
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

    public function test_profile_requires_sign_in_access(): void
    {
        $this->get('/admin/profile')->assertRedirect('/admin/login');
        $this->actingAs(User::factory()->create())->get('/admin/profile')->assertForbidden();
    }

    public function test_every_user_sees_their_own_profile(): void
    {
        $member = User::factory()->member()->create(['name' => 'Sales Desk']);
        $this->actingAs($member)->get('/admin/profile')->assertOk()->assertInertia(fn (AssertableInertia $page) => $page->component('Admin/Profile', false)
            ->where('profile.id', $member->id)->where('profile.name', 'Sales Desk')->where('profile.is_admin', false)->missing('profile.password'));
    }

    public function test_a_user_can_change_their_name_and_photo_but_not_their_email_or_role(): void
    {
        $member = User::factory()->member()->create();
        $email = $member->email;
        $this->actingAs($member)->post('/admin/profile', ['_method' => 'PUT', 'name' => 'New Name', 'email' => 'other@example.com', 'is_admin' => true, 'avatar' => UploadedFile::fake()->image('me.jpg', 640, 480)])
            ->assertRedirect()->assertSessionHasNoErrors();
        $member->refresh();
        $this->assertSame(['New Name', $email, false], [$member->name, $member->email, $member->is_admin]);
        Storage::disk('public')->assertExists($member->avatar_path);

        $this->get('/admin')->assertInertia(fn (AssertableInertia $page) => $page->where('auth.user.avatar_url', '/storage/'.$member->avatar_path));

        $this->put('/admin/profile', ['name' => 'New Name', 'remove_avatar' => true])->assertSessionHasNoErrors();
        $this->assertNull($member->fresh()->avatar_path);
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_password_change_needs_the_current_password(): void
    {
        $member = User::factory()->member()->create(['password' => self::PASSWORD]);
        $this->actingAs($member);
        $this->put('/admin/profile/password', ['current_password' => 'Wrong-Pass-2026!', 'password' => 'Brand-New-Pass-2026!', 'password_confirmation' => 'Brand-New-Pass-2026!'])->assertSessionHasErrors('current_password');
        $this->put('/admin/profile/password', ['current_password' => self::PASSWORD, 'password' => 'weak', 'password_confirmation' => 'weak'])->assertSessionHasErrors('password');
        $this->assertTrue(Hash::check(self::PASSWORD, $member->fresh()->password));

        $this->put('/admin/profile/password', ['current_password' => self::PASSWORD, 'password' => 'Brand-New-Pass-2026!', 'password_confirmation' => 'Brand-New-Pass-2026!'])->assertSessionHasNoErrors();
        $this->assertTrue(Hash::check('Brand-New-Pass-2026!', $member->fresh()->password));
    }
}
