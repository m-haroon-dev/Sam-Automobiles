<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', fn (Blueprint $table) => $table->string('avatar_path')->nullable()->after('email'));

        // The showroom has exactly one Admin. Keep the earliest one; the role can be handed over from the Users page.
        $keep = DB::table('users')->where('is_admin', true)->orderBy('id')->value('id');
        if ($keep) {
            DB::table('users')->where('is_admin', true)->where('id', '!=', $keep)->update(['is_admin' => false]);
            DB::table('users')->where('id', $keep)->update(['is_active' => true]);
        }
    }

    public function down(): void
    {
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('avatar_path'));
    }
};
