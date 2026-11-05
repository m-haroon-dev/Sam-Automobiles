<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\EnquiryController as PublicEnquiryController;
use App\Models\Enquiry;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Every signed-in account follows up, edits, deletes and exports website enquiries. */
class EnquiryController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->only(['q', 'kind', 'status']);

        return Inertia::render('Admin/Enquiries', ['filters' => $filters,
            'enquiries' => Enquiry::with('car')->filter($filters)->latest()->latest('id')->paginate(25)->withQueryString()->through(fn (Enquiry $e) => $e->summary()),
            'counts' => ['all' => Enquiry::count(), ...Enquiry::query()->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status')->map(fn ($n) => (int) $n)],
            'statuses' => Enquiry::STATUSES, 'kinds' => Enquiry::KINDS]);
    }

    public function update(Request $request, Enquiry $enquiry): RedirectResponse
    {
        $trade = $enquiry->kind === 'trade';
        $request->merge(['phone' => PublicEnquiryController::pakistanMobile((string) $request->input('phone'))]);
        $data = $request->validate(['status' => ['required', Rule::in(array_keys(Enquiry::STATUSES))], 'name' => ['required', 'string', 'min:2', 'max:100'],
            'phone' => ['required', 'string'], 'vehicle' => [$trade ? 'required' : 'nullable', 'string', 'max:160'], 'message' => ['nullable', 'string', 'max:1800'],
            'notes' => ['nullable', 'string', 'max:5000'],
            ...($trade ? ['year' => ['required', 'integer', 'between:1900,'.(now()->year + 1)], 'mileage' => ['required', 'integer', 'between:0,10000000'], 'intent' => ['required', Rule::in(['sell', 'trade'])]]
                : ['preferred_day' => ['nullable', 'date_format:Y-m-d'], 'preferred_time' => ['nullable', 'date_format:H:i']])],
            ['phone.required' => 'Enter a Pakistan mobile number such as +92 324 2607773.']);
        $enquiry->update($data);

        return back()->with('success', 'Enquiry from '.$enquiry->name.' updated.');
    }

    public function status(Request $request, Enquiry $enquiry): RedirectResponse
    {
        $enquiry->update($request->validate(['status' => ['required', Rule::in(array_keys(Enquiry::STATUSES))]]));

        return back()->with('success', $enquiry->name.' marked '.Enquiry::STATUSES[$enquiry->status].'.');
    }

    public function destroy(Enquiry $enquiry): RedirectResponse
    {
        $enquiry->delete();

        return back()->with('success', 'Enquiry from '.$enquiry->name.' deleted.');
    }

    public function photo(Enquiry $enquiry, int $index): StreamedResponse
    {
        $photo = $enquiry->photos[$index] ?? abort(404);

        return Storage::disk(Enquiry::DISK)->response($photo['path'], $photo['name'], ['Cache-Control' => 'private, max-age=3600']);
    }

    /** Downloads the enquiries matching the current filters, newest first. */
    public function export(Request $request): StreamedResponse
    {
        $query = Enquiry::with('car')->filter($request->only(['q', 'kind', 'status']))->latest()->latest('id');

        return response()->streamDownload(function () use ($query) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\u{FEFF}"); // Lets Excel read the file as UTF-8.
            fputcsv($out, ['ID', 'Received', 'Type', 'Status', 'Name', 'Mobile', 'Car', 'Model year', 'Mileage (km)', 'Wants to', 'Preferred day', 'Preferred time', 'Message', 'Notes', 'Photos'], escape: '');
            $query->chunk(500, function ($enquiries) use ($out) {
                foreach ($enquiries as $e) {
                    fputcsv($out, array_map(self::cell(...), [$e->id, $e->created_at?->timezone('Asia/Karachi')->format('Y-m-d H:i'), Enquiry::KINDS[$e->kind] ?? $e->kind,
                        Enquiry::STATUSES[$e->status] ?? $e->status, $e->name, $e->phone, $e->vehicle, $e->year, $e->mileage,
                        $e->kind === 'trade' ? ($e->intent === 'trade' ? 'Trade-in' : 'Sell') : '', $e->preferred_day?->format('Y-m-d'), $e->preferred_time,
                        $e->message, $e->notes, count($e->photos ?? [])]), escape: '');
                }
            });
            fclose($out);
        }, 'sam-enquiries-'.now()->timezone('Asia/Karachi')->format('Y-m-d').'.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /** Spreadsheet apps run cells that start with = + - @ as formulas; a leading apostrophe keeps them as text. */
    private static function cell(mixed $value): string
    {
        $value = (string) $value;

        return preg_match('/^[=+\-@\t\r]/', $value) ? "'".$value : $value;
    }
}
