<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('name', 80)->unique();
            $table->string('slug', 100)->unique();
            $table->string('description', 500)->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });
        Schema::table('cars', fn (Blueprint $table) => $table->foreignId('category_id')->nullable()->after('slug')->constrained()->nullOnDelete());

        // Existing stock keeps its advertised body style as its first category.
        foreach (DB::table('cars')->whereNotNull('body')->where('body', '!=', '')->distinct()->orderBy('body')->pluck('body') as $index => $body) {
            $id = DB::table('categories')->insertGetId(['name' => $body, 'slug' => Str::slug($body), 'sort_order' => $index, 'created_at' => now(), 'updated_at' => now()]);
            DB::table('cars')->where('body', $body)->update(['category_id' => $id]);
        }
    }

    public function down(): void
    {
        Schema::table('cars', fn (Blueprint $table) => $table->dropConstrainedForeignId('category_id'));
        Schema::dropIfExists('categories');
    }
};
