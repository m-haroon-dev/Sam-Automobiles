<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // A single row: the mailbox that sends website enquiries. The password is encrypted with APP_KEY.
        Schema::create('mail_settings', function (Blueprint $table) {
            $table->id();
            $table->string('email');
            $table->text('password');
            $table->string('host');
            $table->unsignedSmallInteger('port');
            $table->string('security', 8);
            $table->string('recipient')->nullable();
            $table->boolean('is_enabled')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mail_settings');
    }
};
