<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', fn (Blueprint $table) => $table->boolean('is_admin')->default(false));
        Schema::create('cars', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name', 150);
            $table->string('make', 80)->nullable()->index();
            $table->string('model', 100)->nullable();
            $table->unsignedSmallInteger('year')->nullable();
            $table->string('trim', 180)->nullable();
            $table->unsignedInteger('mileage')->nullable();
            $table->unsignedBigInteger('price')->nullable();
            $table->string('status', 20)->default('draft')->index();
            $table->boolean('is_featured')->default(false);
            $table->unsignedSmallInteger('featured_order')->default(0);
            $table->string('body', 60)->nullable();
            $table->string('fuel', 60)->nullable();
            $table->string('colour', 100)->nullable();
            $table->string('interior', 180)->nullable();
            $table->string('registration', 120)->nullable();
            $table->string('origin', 100)->nullable();
            $table->unsignedSmallInteger('import_year')->nullable();
            $table->unsignedInteger('import_mileage')->nullable();
            $table->string('auction_grade', 80)->nullable();
            $table->text('best_for')->nullable();
            $table->text('usp')->nullable();
            $table->json('features')->nullable();
            $table->json('attractions')->nullable();
            $table->json('notes')->nullable();
            $table->json('showroom')->nullable();
            $table->json('performance_source')->nullable();
            $table->text('performance_note')->nullable();
            $table->string('source_url', 1500)->nullable();
            $table->timestamp('published_at')->nullable()->index();
            $table->timestamp('sold_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['status', 'is_featured', 'featured_order']);
        });
        Schema::create('car_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('car_id')->constrained()->cascadeOnDelete();
            $table->string('directory')->nullable();
            $table->json('variants');
            $table->string('alt', 250);
            $table->string('description', 250);
            $table->string('object_position', 30)->default('50% 65%');
            $table->unsignedInteger('width');
            $table->unsignedInteger('height');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('representative')->default(false);
            $table->timestamps();
            $table->index(['car_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('car_photos');
        Schema::dropIfExists('cars');
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('is_admin'));
    }
};
