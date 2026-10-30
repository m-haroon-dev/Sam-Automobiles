<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

class CreateAdmin extends Command
{
    protected $signature = 'sam:create-admin {email}';

    protected $description = 'Create the single Admin using a hidden password prompt; refuses when an Admin exists and never changes an existing user.';

    public function handle(): int
    {
        $email = mb_strtolower(trim($this->argument('email')));
        if ($existing = User::where('is_admin', true)->value('email')) {
            $this->error('The showroom already has its Admin ('.$existing.'). Add other people as Users from the admin panel, or hand over the Admin role from the Users page.');

            return self::FAILURE;
        }
        if (User::where('email', $email)->exists()) {
            $this->error('This email already exists. No account was changed.');

            return self::FAILURE;
        }
        $password = $this->secret('Choose an administrator password (at least 12 characters)');
        $check = Validator::make(['email' => $email, 'password' => $password], ['email' => ['required', 'email', 'max:254'], 'password' => ['required', Password::min(12)->mixedCase()->numbers()->symbols()]]);
        if ($check->fails()) {
            foreach ($check->errors()->all() as $message) {
                $this->error($message);
            }

            return self::FAILURE;
        }
        if ($password !== $this->secret('Confirm password')) {
            $this->error('Passwords do not match.');

            return self::FAILURE;
        }
        $user = new User;
        $user->forceFill(['name' => 'SAM Administrator', 'email' => $email, 'password' => Hash::make($password), 'is_admin' => true, 'is_active' => true])->save();
        $this->info('Administrator created. Sign in at /admin/login.');

        return self::SUCCESS;
    }
}
