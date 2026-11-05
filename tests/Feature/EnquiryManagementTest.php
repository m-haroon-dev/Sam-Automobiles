<?php

namespace Tests\Feature;

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\Car;
use App\Models\Enquiry;
use App\Models\User;
use Database\Seeders\InventorySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class EnquiryManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        Storage::fake(Enquiry::DISK);
        $version = (new HandleInertiaRequests)->version(Request::create('/'));
        if ($version !== null) {
            $this->withHeader('X-Inertia-Version', $version);
        }
    }

    private function viewing(array $values = []): Enquiry
    {
        return Enquiry::create([...['kind' => 'viewing', 'name' => 'Ali Khan', 'phone' => '+923001234567', 'vehicle' => '2022 Toyota Fortuner', 'preferred_day' => '2030-05-06', 'preferred_time' => '15:30'], ...$values]);
    }

    public function test_form_submissions_are_saved_with_their_car_and_photos(): void
    {
        $this->seed(InventorySeeder::class);
        $car = Car::published()->firstOrFail();
        $this->postJson('/enquiries', ['kind' => 'viewing', 'name' => 'Ali Khan', 'phone' => '0300 1234567', 'vehicle' => $car->slug, 'day' => '2030-05-06', 'time' => '15:30', 'message' => 'Still available?'])
            ->assertOk()->assertJson(['saved' => true]);
        $viewing = Enquiry::firstWhere('kind', 'viewing');
        $this->assertSame([$car->id, 'new', '+923001234567', '2030-05-06', '15:30', 'Still available?'], [$viewing->car_id, $viewing->fresh()->status, $viewing->phone, $viewing->preferred_day->format('Y-m-d'), $viewing->preferred_time, $viewing->message]);
        $this->assertStringContainsString($car->name, $viewing->vehicle);

        $this->post('/enquiries', ['kind' => 'trade', 'name' => 'Sara', 'phone' => '03217654321', 'car' => 'Honda Civic RS', 'year' => 2022, 'mileage' => 31000, 'intent' => 'trade',
            'photos' => [UploadedFile::fake()->image('a.jpg'), UploadedFile::fake()->image('b.png')]], ['Accept' => 'application/json'])->assertOk();
        $trade = Enquiry::firstWhere('kind', 'trade');
        $this->assertSame(['Honda Civic RS', 2022, 31000, 'trade'], [$trade->vehicle, $trade->year, $trade->mileage, $trade->intent]);
        $this->assertCount(2, $trade->photos);
        Storage::disk(Enquiry::DISK)->assertExists($trade->photos[1]['path']);
    }

    public function test_every_signed_in_account_sees_enquiries_and_new_ones_are_counted(): void
    {
        $this->get('/admin/enquiries')->assertRedirect('/admin/login');
        $this->get('/admin/enquiries/export')->assertRedirect('/admin/login');
        $this->viewing();
        $this->viewing(['name' => 'Old Lead', 'status' => 'closed']);
        $this->actingAs(User::factory()->member()->create())->get('/admin/enquiries')->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page->component('Admin/Enquiries', false)->has('enquiries.data', 2)->where('counts.all', 2)->where('counts.new', 1)
                ->where('adminNav.enquiries', 1)->where('enquiries.data.0.details.Preferred time', '3:30 PM (Karachi)'));
        $this->get('/admin')->assertInertia(fn (AssertableInertia $page) => $page->where('enquiries.new', 1)->has('enquiries.latest', 2));
    }

    public function test_enquiries_filter_by_status_type_and_search(): void
    {
        $this->viewing();
        $this->viewing(['name' => 'Bilal', 'phone' => '+923339998877', 'status' => 'contacted']);
        Enquiry::create(['kind' => 'trade', 'name' => 'Sara', 'phone' => '+923217654321', 'vehicle' => 'Honda Civic', 'year' => 2020, 'mileage' => 1000, 'intent' => 'sell']);
        $this->actingAs(User::factory()->member()->create());
        $names = fn (string $query) => collect($this->get('/admin/enquiries'.$query)->viewData('page')['props']['enquiries']['data'])->pluck('name')->sort()->values()->all();
        $this->assertSame(['Bilal'], $names('?status=contacted'));
        $this->assertSame(['Sara'], $names('?kind=trade'));
        $this->assertSame(['Bilal'], $names('?q=0333 9998877'));
        $this->assertSame(['Sara'], $names('?q=civic'));
    }

    public function test_staff_update_status_and_details(): void
    {
        $enquiry = $this->viewing();
        $this->actingAs(User::factory()->member()->create());
        $this->patch('/admin/enquiries/'.$enquiry->id.'/status', ['status' => 'contacted'])->assertSessionHas('success');
        $this->assertSame('contacted', $enquiry->fresh()->status);
        $this->patch('/admin/enquiries/'.$enquiry->id.'/status', ['status' => 'lost'])->assertSessionHasErrors('status');

        $this->put('/admin/enquiries/'.$enquiry->id, ['status' => 'closed', 'name' => 'Ali Raza', 'phone' => '0300 7654321', 'vehicle' => '', 'message' => 'Changed',
            'notes' => 'Bought the Fortuner', 'preferred_day' => '', 'preferred_time' => ''])->assertSessionHasNoErrors();
        $enquiry->refresh();
        $this->assertSame(['closed', 'Ali Raza', '+923007654321', null, 'Bought the Fortuner', null, null], [$enquiry->status, $enquiry->name, $enquiry->phone, $enquiry->vehicle, $enquiry->notes, $enquiry->preferred_day, $enquiry->preferred_time]);
        $this->put('/admin/enquiries/'.$enquiry->id, ['status' => 'new', 'name' => 'A', 'phone' => '123'])->assertSessionHasErrors(['name', 'phone']);
    }

    public function test_deleting_an_enquiry_removes_its_photos(): void
    {
        $enquiry = Enquiry::create(['kind' => 'trade', 'name' => 'Sara', 'phone' => '+923217654321', 'vehicle' => 'Honda Civic', 'year' => 2020, 'mileage' => 1000, 'intent' => 'sell']);
        $enquiry->storePhotos([UploadedFile::fake()->image('a.jpg')]);
        $path = $enquiry->photos[0]['path'];
        $this->actingAs(User::factory()->member()->create());
        $this->get('/admin/enquiries/'.$enquiry->id.'/photos/0')->assertOk();
        $this->get('/admin/enquiries/'.$enquiry->id.'/photos/3')->assertNotFound();
        $this->delete('/admin/enquiries/'.$enquiry->id)->assertSessionHas('success');
        $this->assertModelMissing($enquiry);
        Storage::disk(Enquiry::DISK)->assertMissing($path);
    }

    public function test_csv_export_follows_the_filters_and_neutralises_formulas(): void
    {
        $this->viewing(['message' => '=HYPERLINK("http://evil.example")']);
        $this->viewing(['name' => 'Closed Lead', 'status' => 'closed']);
        $this->actingAs(User::factory()->member()->create());
        $response = $this->get('/admin/enquiries/export?status=new')->assertOk()->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
        $this->assertStringContainsString('attachment; filename=sam-enquiries-', $response->headers->get('Content-Disposition'));
        $rows = array_map(str_getcsv(...), explode("\n", trim(ltrim($response->streamedContent(), "\u{FEFF}"))));
        $this->assertCount(2, $rows);
        $this->assertSame(['ID', 'Received', 'Type', 'Status', 'Name', 'Mobile'], array_slice($rows[0], 0, 6));
        $this->assertSame(['Viewing request', 'New', 'Ali Khan', "'+923001234567"], array_slice($rows[1], 2, 4));
        $this->assertSame("'=HYPERLINK(\"http://evil.example\")", $rows[1][12]);
    }
}
