<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // is_admin now means the Admin role; is_active decides who may sign in to the panel at all.
        Schema::table('users', fn (Blueprint $table) => $table->boolean('is_active')->default(false)->after('is_admin'));
        DB::table('users')->where('is_admin', true)->update(['is_active' => true]);
    }

    public function down(): void
    {
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('is_active'));
    }
};
