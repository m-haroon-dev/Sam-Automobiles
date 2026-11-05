<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Path on the public disk of an uploaded .glb model shown in the car's 3D view.
        Schema::table('cars', fn (Blueprint $table) => $table->string('model_3d')->nullable()->after('source_url'));
    }

    public function down(): void
    {
        Schema::table('cars', fn (Blueprint $table) => $table->dropColumn('model_3d'));
    }
};
