<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_page_and_real_missing_route_responses(): void
    {
        $this->withoutVite();
        $this->get('/')->assertOk();
        $this->get('/this-route-does-not-exist')->assertNotFound();
    }
}
