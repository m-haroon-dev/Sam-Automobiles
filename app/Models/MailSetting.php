<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/** The mailbox that sends website enquiries to the showroom. Only one row exists. */
class MailSetting extends Model
{
    protected $guarded = ['id'];

    protected $hidden = ['password'];

    /** Server details for public mailboxes, chosen from the email's domain. */
    public const PROVIDERS = [
        'gmail.com' => ['Gmail', 'smtp.gmail.com', 587, 'tls'],
        'googlemail.com' => ['Gmail', 'smtp.gmail.com', 587, 'tls'],
        'outlook.com' => ['Outlook', 'smtp-mail.outlook.com', 587, 'tls'],
        'hotmail.com' => ['Outlook', 'smtp-mail.outlook.com', 587, 'tls'],
        'live.com' => ['Outlook', 'smtp-mail.outlook.com', 587, 'tls'],
        'yahoo.com' => ['Yahoo Mail', 'smtp.mail.yahoo.com', 465, 'ssl'],
        'icloud.com' => ['iCloud Mail', 'smtp.mail.me.com', 587, 'tls'],
        'zoho.com' => ['Zoho Mail', 'smtp.zoho.com', 465, 'ssl'],
    ];

    /** Business domains are matched by the company that receives their mail (the end of their MX hosts). */
    public const MAIL_HOSTS = [
        'google.com' => ['Google Workspace (Gmail)', 'smtp.gmail.com', 587, 'tls'],
        'googlemail.com' => ['Google Workspace (Gmail)', 'smtp.gmail.com', 587, 'tls'],
        'outlook.com' => ['Microsoft 365', 'smtp.office365.com', 587, 'tls'],
        'hostinger.com' => ['Hostinger email', 'smtp.hostinger.com', 465, 'ssl'],
        'zoho.com' => ['Zoho Mail', 'smtp.zoho.com', 465, 'ssl'],
        'zoho.in' => ['Zoho Mail', 'smtp.zoho.in', 465, 'ssl'],
        'zoho.eu' => ['Zoho Mail', 'smtp.zoho.eu', 465, 'ssl'],
        'titan.email' => ['Titan email', 'smtp.titan.email', 465, 'ssl'],
        'secureserver.net' => ['GoDaddy email', 'smtpout.secureserver.net', 465, 'ssl'],
        'yahoodns.net' => ['Yahoo Mail', 'smtp.mail.yahoo.com', 465, 'ssl'],
    ];

    /** Replaceable in tests; returns a domain's MX hosts. */
    public static ?\Closure $mailExchangers = null;

    protected function casts(): array
    {
        return ['password' => 'encrypted', 'port' => 'integer', 'is_enabled' => 'boolean'];
    }

    public static function current(): ?self
    {
        return static::query()->first();
    }

    /** @return array{0: string, 1: string, 2: int, 3: string} */
    public static function providerFor(string $email): array
    {
        $domain = Str::lower(Str::after($email, '@'));
        if (isset(self::PROVIDERS[$domain])) {
            return self::PROVIDERS[$domain];
        }
        $lookup = self::$mailExchangers ?? fn (string $domain) => @getmxrr($domain, $hosts) ? $hosts : [];
        foreach ($lookup($domain) as $host) {
            foreach (self::MAIL_HOSTS as $suffix => $provider) {
                if (Str::endsWith(Str::lower(rtrim($host, '.')), $suffix)) {
                    return $provider;
                }
            }
        }

        // Most other hosts (cPanel and similar) serve SMTP at mail.<domain>.
        return ['your email host', 'mail.'.$domain, 465, 'ssl'];
    }

    public function inbox(): string
    {
        return $this->recipient ?: $this->email;
    }

    /** Laravel mailer configuration for this mailbox. */
    public function mailerConfig(): array
    {
        return ['transport' => 'smtp', 'scheme' => $this->security === 'ssl' ? 'smtps' : 'smtp', 'host' => $this->host, 'port' => $this->port,
            'username' => $this->email, 'password' => $this->password, 'timeout' => 20, 'local_domain' => parse_url((string) config('app.url'), PHP_URL_HOST)];
    }

    public function summary(): array
    {
        [$provider, $host, $port, $security] = self::providerFor($this->email);

        return ['email' => $this->email, 'provider' => $provider, 'automatic' => [$host, $port, $security] === [$this->host, $this->port, $this->security], 'host' => $this->host, 'port' => $this->port, 'security' => $this->security, 'recipient' => $this->recipient,
            'is_enabled' => $this->is_enabled, 'has_password' => filled($this->password), 'updated_at' => $this->updated_at?->toIso8601String()];
    }
}
