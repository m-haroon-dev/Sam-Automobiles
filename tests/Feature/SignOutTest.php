<?php

namespace Tests\Feature;

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class SignOutTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        $version = (new HandleInertiaRequests)->version(Request::create('/'));
        if ($version !== null) {
            $this->withHeader('X-Inertia-Version', $version);
        }
    }

    public function test_admin_pages_store_encrypted_history_and_are_never_cached(): void
    {
        $response = $this->actingAs(User::factory()->member()->create())->get('/admin');
        $response->assertOk()->assertInertia(fn (AssertableInertia $page) => $page->component('Admin/Dashboard', false));
        $this->assertTrue($response->viewData('page')['encryptHistory']);
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
    }

    public function test_signing_out_clears_history_so_back_cannot_show_admin_pages(): void
    {
        $this->actingAs(User::factory()->admin()->create());
        $this->post('/admin/logout')->assertRedirect('/admin/login');
        $this->assertGuest();

        $login = $this->get('/admin/login');
        $this->assertTrue($login->viewData('page')['clearHistory']);
        // Back makes Inertia ask the server again, which now sends the visitor to sign in.
        $this->get('/admin')->assertRedirect('/admin/login');
        $this->get('/admin/cars')->assertRedirect('/admin/login');
    }

    public function test_history_is_only_cleared_once_after_signing_out(): void
    {
        $this->actingAs(User::factory()->admin()->create())->post('/admin/logout');
        $this->get('/admin/login');
        $this->assertFalse($this->get('/admin/login')->viewData('page')['clearHistory'] ?? false);
    }
}
