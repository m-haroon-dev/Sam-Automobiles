<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\AvatarStorage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

/** Every signed-in account manages its own name, photo and password here; emails and access stay with the Admin. */
class ProfileController extends Controller
{
    public function __construct(private AvatarStorage $avatars) {}

    public function show(Request $request): Response
    {
        return Inertia::render('Admin/Profile', ['profile' => $request->user()->summary()]);
    }

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:120'], 'avatar' => UserController::AVATAR_RULES, 'remove_avatar' => ['sometimes', 'boolean']],
            ['avatar.mimes' => 'Upload a JPEG, PNG or WebP photo.', 'avatar.max' => 'Choose a photo of at most 5 MB.']);
        $user = $request->user();
        $old = $user->avatar_path;
        $avatar = $request->hasFile('avatar') ? $this->avatars->store($request->file('avatar')) : ($request->boolean('remove_avatar') ? null : $old);
        $user->forceFill(['name' => $data['name'], 'avatar_path' => $avatar])->save();
        if ($old !== $avatar) {
            $this->avatars->delete($old);
        }

        return back()->with('success', 'Profile updated.');
    }

    public function password(Request $request): RedirectResponse
    {
        $data = $request->validate(['current_password' => ['required', 'current_password'], 'password' => ['required', 'confirmed', 'different:current_password', Password::min(12)->mixedCase()->numbers()->symbols()]],
            ['current_password.current_password' => 'Your current password is not correct.', 'password.different' => 'Choose a password different from your current one.']);
        $request->user()->forceFill(['password' => $data['password'], 'remember_token' => Str::random(60)])->save();
        UserController::endSessions($request->user(), $request->session()->getId());

        return back()->with('success', 'Password changed. Other devices have been signed out.');
    }
}
