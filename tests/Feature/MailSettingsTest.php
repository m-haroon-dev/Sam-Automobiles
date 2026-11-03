<?php

namespace Tests\Feature;

use App\Http\Controllers\EnquiryController;
use App\Http\Middleware\HandleInertiaRequests;
use App\Mail\LeadReceived;
use App\Models\MailSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class MailSettingsTest extends TestCase
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
        // No DNS in tests: these domains stand in for a Hostinger mailbox and a Google Workspace one.
        MailSetting::$mailExchangers = fn (string $domain) => ['samautomobiles.co' => ['mx1.hostinger.com.'], 'aptech.example' => ['ASPMX.L.GOOGLE.COM']][$domain] ?? [];
    }

    protected function tearDown(): void
    {
        MailSetting::$mailExchangers = null;
        parent::tearDown();
    }

    private function connect(array $values = []): MailSetting
    {
        return MailSetting::create([...['email' => 'showroom@gmail.com', 'password' => 'abcdefghijklmnop', 'host' => 'smtp.gmail.com', 'port' => 587, 'security' => 'tls'], ...$values]);
    }

    public function test_only_the_admin_manages_email_settings(): void
    {
        $this->get('/admin/mail')->assertRedirect('/admin/login');
        $this->actingAs(User::factory()->member()->create())->get('/admin/mail')->assertForbidden();
        $this->actingAs(User::factory()->member()->create())->put('/admin/mail', ['email' => 'x@gmail.com', 'password' => 'secret'])->assertForbidden();
        $this->actingAs(User::factory()->admin()->create())->get('/admin/mail')
            ->assertInertia(fn (AssertableInertia $page) => $page->component('Admin/Mail', false)->where('settings', null));
        $this->actingAs(User::factory()->member()->create())->getJson('/admin/mail/provider?email=a@gmail.com')->assertForbidden();
    }

    public function test_the_provider_is_detected_from_the_domain_and_its_mail_servers(): void
    {
        $this->actingAs(User::factory()->admin()->create());
        $this->getJson('/admin/mail/provider?email=a@gmail.com')->assertExactJson(['name' => 'Gmail', 'host' => 'smtp.gmail.com', 'port' => 587, 'security' => 'tls']);
        $this->getJson('/admin/mail/provider?email=haroon@aptech.example')->assertJson(['name' => 'Google Workspace (Gmail)', 'host' => 'smtp.gmail.com']);
        $this->getJson('/admin/mail/provider?email=info@samautomobiles.co')->assertJson(['name' => 'Hostinger email', 'host' => 'smtp.hostinger.com', 'port' => 465]);
        $this->getJson('/admin/mail/provider?email=info@unknown.example')->assertJson(['host' => 'mail.unknown.example', 'port' => 465, 'security' => 'ssl']);
        $this->getJson('/admin/mail/provider?email=nope')->assertUnprocessable();
    }

    public function test_email_and_password_fill_in_the_server_and_encrypt_the_password(): void
    {
        $admin = User::factory()->admin()->create();
        $this->actingAs($admin)->put('/admin/mail', ['email' => 'Showroom@Gmail.com', 'password' => 'abcd efgh ijkl mnop', 'is_enabled' => true])->assertSessionHasNoErrors();
        $settings = MailSetting::current();
        $this->assertSame(['showroom@gmail.com', 'smtp.gmail.com', 587, 'tls', 'abcdefghijklmnop'], [$settings->email, $settings->host, $settings->port, $settings->security, $settings->password]);
        $this->assertStringNotContainsString('abcdefghijklmnop', DB::table('mail_settings')->value('password'));
        $this->assertSame('showroom@gmail.com', $settings->inbox());

        // A blank password keeps the saved one; a business domain follows its mail servers (here Hostinger).
        $this->actingAs($admin)->put('/admin/mail', ['email' => 'sales@samautomobiles.co', 'password' => '', 'recipient' => 'owner@gmail.com', 'is_enabled' => true]);
        $settings->refresh();
        $this->assertSame(['smtp.hostinger.com', 465, 'ssl', 'owner@gmail.com'], [$settings->host, $settings->port, $settings->security, $settings->inbox()]);
        $this->assertSame('abcdefghijklmnop', $settings->password);
        $this->actingAs($admin)->get('/admin/mail')->assertInertia(fn (AssertableInertia $page) => $page->where('settings.has_password', true)->where('settings.automatic', true)
            ->where('settings.provider', 'Hostinger email')->missing('settings.password'));

        // A Google Workspace domain moves to Gmail's server when re-saved, as long as Advanced is left blank.
        $this->actingAs($admin)->put('/admin/mail', ['email' => 'haroon@aptech.example', 'is_enabled' => true]);
        $this->assertSame(['smtp.gmail.com', 587, 'tls'], [$settings->fresh()->host, $settings->fresh()->port, $settings->fresh()->security]);
    }

    public function test_the_first_save_needs_a_password(): void
    {
        $this->actingAs(User::factory()->admin()->create())->put('/admin/mail', ['email' => 'showroom@gmail.com', 'password' => ''])->assertSessionHasErrors('password');
        $this->assertNull(MailSetting::current());
    }

    public function test_test_email_goes_to_the_inbox(): void
    {
        Mail::fake();
        $this->connect(['recipient' => 'owner@example.com']);
        $this->actingAs(User::factory()->admin()->create())->post('/admin/mail/test')->assertSessionHas('success');
        Mail::assertSent(LeadReceived::class, fn (LeadReceived $mail) => $mail->hasTo('owner@example.com') && $mail->from[0]['address'] === 'showroom@gmail.com' && $mail->heading === 'Test email');
    }

    public function test_viewing_enquiry_is_emailed_with_a_whatsapp_reply_link(): void
    {
        Mail::fake();
        $this->connect();
        $this->postJson('/enquiries', ['kind' => 'viewing', 'name' => 'Ali Khan', 'phone' => '0300 1234567', 'day' => '2030-05-06', 'time' => '15:30', 'message' => 'Is it still available?'])
            ->assertOk()->assertJson(['emailed' => true]);
        Mail::assertSent(LeadReceived::class, fn (LeadReceived $mail) => $mail->hasTo('showroom@gmail.com') && $mail->details['Mobile'] === '+923001234567'
            && $mail->details['Preferred time'] === '3:30 PM (Karachi)' && $mail->link === 'https://wa.me/923001234567');
    }

    public function test_trade_enquiry_attaches_photos(): void
    {
        Mail::fake();
        $this->connect();
        $this->post('/enquiries', ['kind' => 'trade', 'name' => 'Sara', 'phone' => '+92 321 7654321', 'car' => 'Toyota Corolla Altis', 'year' => 2021, 'mileage' => 42000, 'intent' => 'sell',
            'photos' => [UploadedFile::fake()->image('front.jpg'), UploadedFile::fake()->image('back.png')]], ['Accept' => 'application/json'])->assertOk()->assertJson(['emailed' => true]);
        Mail::assertSent(LeadReceived::class, fn (LeadReceived $mail) => count($mail->attachments()) === 2 && $mail->details['Car'] === '2021 Toyota Corolla Altis' && $mail->heading === 'Sell my car from Sara');
    }

    public function test_enquiries_are_not_emailed_when_off_invalid_or_from_bots(): void
    {
        Mail::fake();
        $viewing = ['kind' => 'viewing', 'name' => 'Ali Khan', 'phone' => '03001234567', 'day' => '2030-05-06', 'time' => '15:30'];
        $this->postJson('/enquiries', $viewing)->assertJson(['emailed' => false]);
        $this->connect(['is_enabled' => false]);
        $this->postJson('/enquiries', $viewing)->assertJson(['emailed' => false]);
        MailSetting::current()->update(['is_enabled' => true]);
        $this->postJson('/enquiries', [...$viewing, 'website' => 'spam.example'])->assertJson(['emailed' => false]);
        $this->postJson('/enquiries', [...$viewing, 'phone' => '12345'])->assertUnprocessable()->assertJsonValidationErrors('phone');
        Mail::assertNothingSent();
    }

    public function test_pakistan_mobile_numbers_match_the_form(): void
    {
        foreach (['03242607773' => '+923242607773', '+92 324 2607773' => '+923242607773', '0092-324-2607773' => '+923242607773', '923242607773' => '+923242607773', '0423456789' => '', 'call me' => ''] as $input => $expected) {
            $this->assertSame($expected, EnquiryController::pakistanMobile($input), $input);
        }
    }
}
