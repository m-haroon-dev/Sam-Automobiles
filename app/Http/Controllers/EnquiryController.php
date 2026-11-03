<?php

namespace App\Http\Controllers;

use App\Mail\LeadReceived;
use App\Models\Car;
use App\Services\LeadMailer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Throwable;

/**
 * Emails viewing and sell/trade enquiries to the showroom inbox set under Admin › Email.
 * Nothing is stored; the visitor still continues to WhatsApp as before.
 */
class EnquiryController extends Controller
{
    /** Gmail and most providers refuse messages above 25 MB; attachments stay below this. */
    private const ATTACHMENT_BUDGET = 20 * 1024 * 1024;

    public function store(Request $request, LeadMailer $mailer): JsonResponse
    {
        // Bots fill the hidden "website" field; people never see it.
        if (filled($request->input('website')) || ! $mailer->ready()) {
            return response()->json(['emailed' => false]);
        }
        $request->merge(['phone' => self::pakistanMobile((string) $request->input('phone'))]);
        $trade = $request->input('kind') === 'trade';
        $data = $request->validate(['kind' => ['required', Rule::in(['viewing', 'trade'])], 'name' => ['required', 'string', 'min:2', 'max:100'],
            'phone' => ['required', 'string'], 'message' => ['nullable', 'string', 'max:1800'],
            ...($trade ? ['car' => ['required', 'string', 'min:3', 'max:150'], 'year' => ['required', 'integer', 'between:1900,'.(now()->year + 1)],
                'mileage' => ['required', 'integer', 'between:0,10000000'], 'intent' => ['required', Rule::in(['sell', 'trade'])],
                'photos' => ['nullable', 'array', 'max:6'], 'photos.*' => ['file', 'mimetypes:image/jpeg,image/png,image/webp,image/heic,image/heif', 'max:10240']]
            : ['vehicle' => ['nullable', 'string', 'max:120'], 'day' => ['required', 'date_format:Y-m-d'], 'time' => ['required', 'date_format:H:i']])],
            ['phone.required' => 'Enter a Pakistan mobile number such as +92 324 2607773.']);
        $mail = $trade ? $this->trade($data, $request->file('photos', [])) : $this->viewing($data);

        // The visitor goes on to WhatsApp straight away; the mail server is contacted after the response.
        defer(function () use ($mailer, $mail, $data) {
            try {
                $mailer->send($mail);
            } catch (Throwable $e) {
                Log::error('Enquiry email failed', ['kind' => $data['kind'], 'error' => $e->getMessage()]);
            }
        });

        return response()->json(['emailed' => true]);
    }

    private function viewing(array $data): LeadReceived
    {
        $car = filled($data['vehicle'] ?? null) ? Car::query()->where('slug', $data['vehicle'])->first() : null;
        $origin = rtrim(config('app.url'), '/');

        return new LeadReceived('Viewing request from '.$data['name'], array_filter([
            'Name' => $data['name'], 'Mobile' => $data['phone'],
            'Car' => $car ? trim($car->year.' '.$car->name.($car->trim ? ' · '.$car->trim : '')) : 'Exploring the collection',
            'Car page' => $car ? $origin.'/cars/'.$car->slug.'/' : null,
            'Preferred day' => Carbon::parse($data['day'])->format('l j F Y'),
            'Preferred time' => Carbon::createFromFormat('H:i', $data['time'])->format('g:i A').' (Karachi)',
            'Message' => trim($data['message'] ?? '') ?: null,
        ]), link: self::whatsapp($data['phone']));
    }

    /** @param  array<int, UploadedFile>  $files */
    private function trade(array $data, array $files): LeadReceived
    {
        $photos = [];
        $budget = self::ATTACHMENT_BUDGET;
        foreach ($files as $index => $file) {
            if ($file->getSize() > $budget) {
                continue;
            }
            $budget -= $file->getSize();
            $photos[] = ['name' => 'car-photo-'.($index + 1).'.'.($file->guessExtension() ?: 'jpg'), 'mime' => $file->getMimeType(), 'data' => $file->get()];
        }
        $skipped = count($files) - count($photos);

        return new LeadReceived(($data['intent'] === 'trade' ? 'Trade-in enquiry' : 'Sell my car').' from '.$data['name'], array_filter([
            'Name' => $data['name'], 'Mobile' => $data['phone'],
            'Wants to' => $data['intent'] === 'trade' ? 'Discuss a trade-in' : 'Sell their car',
            'Car' => $data['year'].' '.$data['car'], 'Mileage' => number_format($data['mileage']).' km',
            'Message' => trim($data['message'] ?? '') ?: null,
            'Photos' => $skipped ? $skipped.' more '.($skipped === 1 ? 'photo was' : 'photos were').' too large to email. Ask for them on WhatsApp.' : null,
        ]), $photos, self::whatsapp($data['phone']));
    }

    /** Mirrors normalizePakistanPhone() in resources/js/lib/leads.js; anything else becomes empty and fails validation. */
    public static function pakistanMobile(string $value): string
    {
        $raw = trim($value);
        if (! preg_match('/^[+\d\s()-]+$/', $raw)) {
            return '';
        }
        $phone = preg_replace('/[\s()-]/', '', $raw);
        $phone = preg_replace(['/^0092/', '/^0(3\d{9})$/', '/^(923\d{9})$/'], ['+92', '+92$1', '+$1'], $phone);

        return preg_match('/^\+923\d{9}$/', $phone) ? $phone : '';
    }

    private static function whatsapp(string $phone): string
    {
        return 'https://wa.me/'.ltrim($phone, '+');
    }
}
