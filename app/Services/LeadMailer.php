<?php

namespace App\Services;

use App\Mail\LeadReceived;
use App\Models\MailSetting;
use Illuminate\Support\Facades\Mail;

/** Sends mail through the mailbox saved under Admin › Email, not the .env mailer. */
class LeadMailer
{
    public function ready(): bool
    {
        return (bool) MailSetting::current()?->is_enabled;
    }

    /** Sends immediately and throws when the mail server refuses. */
    public function send(LeadReceived $mail, ?MailSetting $settings = null): void
    {
        $settings ??= MailSetting::current();
        config(['mail.mailers.showroom' => $settings->mailerConfig()]);
        Mail::purge('showroom');
        Mail::mailer('showroom')->to($settings->inbox())->send($mail->from($settings->email, config('app.name')));
    }
}
