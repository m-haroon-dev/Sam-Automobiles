<?php

namespace App\Http\Controllers;

use App\Mail\LeadReceived;
use App\Models\Car;
use App\Models\Enquiry;
use App\Services\LeadMailer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Throwable;

/**
 * Saves viewing and sell/trade enquiries for Admin › Enquiries and, once a mailbox is
 * connected under Admin › Email, emails them too. The visitor still continues to WhatsApp.
 */
class EnquiryController extends Controller
{
    /** Gmail and most providers refuse messages above 25 MB; attachments stay below this. */
    private const ATTACHMENT_BUDGET = 20 * 1024 * 1024;

    public function store(Request $request, LeadMailer $mailer): JsonResponse
    {
        // Bots fill the hidden "website" field; people never see it.
        if (filled($request->input('website'))) {
            return response()->json(['saved' => false, 'emailed' => false]);
        }
        $request->merge(['phone' => self::pakistanMobile((string) $request->input('phone'))]);
        $data = $request->validate(self::rules($request->input('kind') === 'trade'), ['phone.required' => 'Enter a Pakistan mobile number such as +92 324 2607773.']);
        $enquiry = Enquiry::create(self::values($data));
        if ($enquiry->kind === 'trade') {
            $enquiry->storePhotos($request->file('photos', []));
        }

        $emailed = $mailer->ready();
        if ($emailed) {
            // The visitor goes on to WhatsApp straight away; the mail server is contacted after the response.
            defer(function () use ($mailer, $enquiry) {
                try {
                    $mailer->send(self::mail($enquiry));
                } catch (Throwable $e) {
                    Log::error('Enquiry email failed', ['enquiry' => $enquiry->id, 'error' => $e->getMessage()]);
                }
            });
        }

        return response()->json(['saved' => true, 'emailed' => $emailed]);
    }

    private static function rules(bool $trade): array
    {
        return ['kind' => ['required', Rule::in(array_keys(Enquiry::KINDS))], 'name' => ['required', 'string', 'min:2', 'max:100'],
            'phone' => ['required', 'string'], 'message' => ['nullable', 'string', 'max:1800'],
            ...($trade ? ['car' => ['required', 'string', 'min:3', 'max:150'], 'year' => ['required', 'integer', 'between:1900,'.(now()->year + 1)],
                'mileage' => ['required', 'integer', 'between:0,10000000'], 'intent' => ['required', Rule::in(['sell', 'trade'])],
                'photos' => ['nullable', 'array', 'max:6'], 'photos.*' => ['file', 'mimetypes:image/jpeg,image/png,image/webp,image/heic,image/heif', 'max:10240']]
            : ['vehicle' => ['nullable', 'string', 'max:120'], 'day' => ['required', 'date_format:Y-m-d'], 'time' => ['required', 'date_format:H:i']])];
    }

    /** Form fields to enquiry columns. A viewing names one of our cars by its slug; its name is kept in case the car is later removed. */
    private static function values(array $data): array
    {
        $values = array_intersect_key($data, array_flip(['kind', 'name', 'phone', 'year', 'mileage', 'intent'])) + ['message' => trim($data['message'] ?? '') ?: null];
        if ($data['kind'] === 'trade') {
            return $values + ['vehicle' => $data['car']];
        }
        $car = filled($data['vehicle'] ?? null) ? Car::query()->where('slug', $data['vehicle'])->first() : null;

        return $values + ['car_id' => $car?->id, 'vehicle' => $car ? trim($car->year.' '.$car->name.($car->trim ? ' · '.$car->trim : '')) : null,
            'preferred_day' => $data['day'], 'preferred_time' => $data['time']];
    }

    private static function mail(Enquiry $enquiry): LeadReceived
    {
        $photos = [];
        $budget = self::ATTACHMENT_BUDGET;
        foreach ($enquiry->photos ?? [] as $photo) {
            if ($photo['size'] > $budget) {
                continue;
            }
            $budget -= $photo['size'];
            $photos[] = ['name' => $photo['name'], 'mime' => $photo['mime'], 'data' => Storage::disk(Enquiry::DISK)->get($photo['path'])];
        }
        $skipped = count($enquiry->photos ?? []) - count($photos);
        $details = $enquiry->details() + ($skipped ? ['Photos' => $skipped.' more '.($skipped === 1 ? 'photo is' : 'photos are').' too large to email. Open the enquiry in the admin panel.'] : []);

        return new LeadReceived($enquiry->heading(), $details, $photos, $enquiry->whatsapp());
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
}
