<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AvatarStorage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/** The single Admin manages every account; Users manage cars and categories but not accounts. */
class UserController extends Controller
{
    public const AVATAR_RULES = ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120', 'dimensions:max_width=8000,max_height=8000'];

    public function __construct(private AvatarStorage $avatars) {}

    public function index(Request $request): Response
    {
        return Inertia::render('Admin/Users', ['users' => User::orderByDesc('is_admin')->orderByDesc('is_active')->orderBy('name')->get()
            ->map(fn ($user) => [...$user->summary(), 'is_you' => $user->id === $request->user()->id])]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);
        $avatar = $request->hasFile('avatar') ? $this->avatars->store($request->file('avatar')) : null;
        try {
            $user = new User;
            $user->forceFill(['name' => $data['name'], 'email' => $data['email'], 'password' => $data['password'], 'avatar_path' => $avatar, 'is_admin' => false, 'is_active' => $data['is_active']])->save();
        } catch (\Throwable $error) {
            $this->avatars->delete($avatar);
            throw $error;
        }

        return back()->with('success', 'User created. '.($user->is_active ? 'They can now sign in at /admin/login and manage cars and categories.' : 'Sign-in stays off until you turn it on.'));
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $data = $this->validated($request, $user);
        if ($user->id === $request->user()->id && ! $data['is_active']) {
            throw ValidationException::withMessages(['user' => 'You cannot turn off your own sign-in.']);
        }
        $old = $user->avatar_path;
        $avatar = $request->hasFile('avatar') ? $this->avatars->store($request->file('avatar')) : ($request->boolean('remove_avatar') ? null : $old);
        $user->forceFill(['name' => $data['name'], 'email' => $data['email'], 'avatar_path' => $avatar, 'is_active' => $data['is_active']]);
        if (! empty($data['password'])) {
            $user->forceFill(['password' => $data['password'], 'remember_token' => Str::random(60)]);
        }
        $user->save();
        if ($old !== $avatar) {
            $this->avatars->delete($old);
        }
        // A new password or removed sign-in ends that user's other sessions.
        if ((! empty($data['password']) || ! $user->is_active) && $user->id !== $request->user()->id) {
            self::endSessions($user);
        }

        return back()->with('success', 'User updated.'.(! empty($data['password']) ? ' The new password is active.' : ''));
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        if ($user->id === $request->user()->id || $user->is_admin) {
            throw ValidationException::withMessages(['user' => 'You cannot delete your own Admin account while signed in.']);
        }
        self::endSessions($user);
        $user->delete();
        $this->avatars->delete($user->avatar_path);

        return back()->with('success', 'User deleted. They can no longer sign in.');
    }

    /** Hands the single Admin role to another active user; the current Admin becomes a User. */
    public function makeAdmin(Request $request, User $user): RedirectResponse
    {
        if ($user->id === $request->user()->id) {
            throw ValidationException::withMessages(['user' => 'You are already the Admin.']);
        }
        if (! $user->is_active) {
            throw ValidationException::withMessages(['user' => 'Turn on sign-in for '.$user->name.' before making them the Admin.']);
        }
        DB::transaction(function () use ($user) {
            User::where('is_admin', true)->update(['is_admin' => false]);
            $user->forceFill(['is_admin' => true])->save();
        });

        return redirect('/admin')->with('success', $user->name.' is now the Admin. Your account is now a User and can no longer manage users.');
    }

    private function validated(Request $request, ?User $user = null): array
    {
        $request->merge(['email' => mb_strtolower(trim((string) $request->input('email'))), 'is_active' => $request->boolean('is_active')]);

        return $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:254', Rule::unique('users')->ignore($user?->id)],
            'password' => [$user ? 'nullable' : 'required', 'confirmed', Password::min(12)->mixedCase()->numbers()->symbols()],
            'is_active' => ['boolean'],
            'avatar' => self::AVATAR_RULES,
            'remove_avatar' => ['sometimes', 'boolean'],
        ], ['email.unique' => 'Another user already uses this email address.', 'avatar.mimes' => 'Upload a JPEG, PNG or WebP photo.', 'avatar.max' => 'Choose a photo of at most 5 MB.']);
    }

    public static function endSessions(User $user, ?string $except = null): void
    {
        $table = config('session.table', 'sessions');
        if (Schema::hasTable($table)) {
            DB::table($table)->where('user_id', $user->id)->when($except, fn ($q) => $q->where('id', '!=', $except))->delete();
        }
    }
}
