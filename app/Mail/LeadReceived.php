<?php

namespace App\Mail;

use Illuminate\Mail\Attachment;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/** A website enquiry (or test message) as one email. Photos are held in memory so the mail can be sent after the response. */
class LeadReceived extends Mailable
{
    /**
     * @param  array<string, string>  $details  label => value
     * @param  array<int, array{name: string, mime: string, data: string}>  $photos
     */
    public function __construct(public string $heading, public array $details, public array $photos = [], public ?string $link = null, public ?string $note = null) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->heading.' · '.config('app.name'));
    }

    public function content(): Content
    {
        return new Content(view: 'mail.lead');
    }

    public function attachments(): array
    {
        return array_map(fn (array $photo) => Attachment::fromData(fn () => $photo['data'], $photo['name'])->withMime($photo['mime']), $this->photos);
    }
}
