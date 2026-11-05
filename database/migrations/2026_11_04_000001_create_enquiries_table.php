<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Viewing requests and sell/trade-in enquiries from the website forms. Photos live on the private disk.
        Schema::create('enquiries', function (Blueprint $table) {
            $table->id();
            $table->string('kind', 8);
            $table->string('status', 12)->default('new')->index();
            $table->string('name', 100);
            $table->string('phone', 16);
            $table->foreignId('car_id')->nullable()->constrained()->nullOnDelete();
            $table->string('vehicle', 160)->nullable();
            $table->unsignedSmallInteger('year')->nullable();
            $table->unsignedInteger('mileage')->nullable();
            $table->string('intent', 8)->nullable();
            $table->date('preferred_day')->nullable();
            $table->string('preferred_time', 5)->nullable();
            $table->text('message')->nullable();
            $table->text('notes')->nullable();
            $table->json('photos')->nullable();
            $table->timestamps();
            $table->index(['kind', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('enquiries');
    }
};
