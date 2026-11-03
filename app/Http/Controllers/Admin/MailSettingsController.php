<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Mail\LeadReceived;
use App\Models\MailSetting;
use App\Services\LeadMailer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

/** The Admin connects the mailbox that emails website enquiries; the server details fill in from the email's domain and its MX records. */
class MailSettingsController extends Controller
{
    public function show(): Response
    {
        return Inertia::render('Admin/Mail', ['settings' => MailSetting::current()?->summary()]);
    }

    /** Which server an email address would use, shown while the Admin types it. */
    public function provider(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email', 'max:190']]);
        [$name, $host, $port, $security] = MailSetting::providerFor($request->string('email'));

        return response()->json(compact('name', 'host', 'port', 'security'));
    }

    public function update(Request $request): RedirectResponse
    {
        $settings = MailSetting::current();
        $data = $request->validate(['email' => ['required', 'email', 'max:190'], 'password' => [$settings ? 'nullable' : 'required', 'string', 'max:190'],
            'recipient' => ['nullable', 'email', 'max:190'], 'host' => ['nullable', 'string', 'max:190', 'regex:/^[A-Za-z0-9.-]+$/'], 'port' => ['nullable', 'integer', 'between:1,65535'],
            'security' => ['nullable', Rule::in(['ssl', 'tls'])], 'is_enabled' => ['boolean']],
            ['password.required' => 'Enter the password for this email.', 'host.regex' => 'Enter a server name such as smtp.gmail.com.']) + ['password' => null, 'recipient' => null, 'host' => null, 'port' => null, 'security' => null];
        [, $host, $port, $security] = MailSetting::providerFor($data['email']);
        $host = Str::lower($data['host'] ?: $host);
        $values = ['email' => Str::lower($data['email']), 'host' => $host, 'port' => $data['port'] ?: $port, 'security' => $data['security'] ?: $security,
            'recipient' => $data['recipient'] ? Str::lower($data['recipient']) : null, 'is_enabled' => $request->boolean('is_enabled', true)];
        if (filled($data['password'])) {
            // Google shows App Passwords in groups of four; the spaces are not part of them.
            $values['password'] = $host === 'smtp.gmail.com' ? preg_replace('/\s+/', '', $data['password']) : $data['password'];
        }
        $settings ? $settings->update($values) : MailSetting::create($values);

        return back()->with('success', 'Email settings saved. Send a test email to check them.');
    }

    public function test(LeadMailer $mailer): RedirectResponse
    {
        $settings = MailSetting::current();
        if (! $settings) {
            return back()->withErrors(['mail' => 'Save your email settings first.']);
        }
        try {
            $mailer->send(new LeadReceived('Test email', [], note: 'Your website can now email you enquiries. New viewing requests and sell or trade-in enquiries will arrive at this address.'), $settings);
        } catch (Throwable $e) {
            Log::warning('Test email failed', ['host' => $settings->host, 'error' => $e->getMessage()]);

            return back()->withErrors(['mail' => self::explain($e->getMessage(), $settings->host)]);
        }

        return back()->with('success', 'Test email sent to '.$settings->inbox().'. Check the inbox (and spam folder).');
    }

    /** Turns a mail server's reply into a next step the owner can act on. */
    public static function explain(string $error, string $host): string
    {
        if (preg_match('/\b(535|534|530)\b|authenticat|password|credentials/i', $error)) {
            return match ($host) {
                'smtp.gmail.com' => 'Gmail did not accept the password. Turn on 2-Step Verification, create an App Password at myaccount.google.com/apppasswords and paste its 16 letters here instead of your normal password.',
                'smtp.hostinger.com' => 'Hostinger did not accept the password. Use the password of this mailbox (hPanel › Emails › Email accounts), not your Hostinger account login. Check it by signing in at mail.hostinger.com, or reset it there and paste the new one here.',
                'smtp.office365.com' => 'Microsoft 365 did not accept the password. Your administrator must allow "Authenticated SMTP" for this mailbox, and accounts with two-step sign-in need an app password.',
                default => 'The mail server did not accept this email and password. Check them, or ask your email provider whether SMTP sign-in is allowed.',
            };
        }
        if (preg_match('/connection|timed out|resolve|refused|getaddrinfo/i', $error)) {
            return 'Could not reach '.$host.'. Check the server name and port under Advanced, or try port 587 with TLS.';
        }

        return 'The email could not be sent: '.Str::limit($error, 240);
    }
}
