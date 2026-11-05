<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;

/** A viewing request or sell/trade-in enquiry sent from the website. */
class Enquiry extends Model
{
    public const KINDS = ['viewing' => 'Viewing request', 'trade' => 'Sell / trade-in'];

    public const STATUSES = ['new' => 'New', 'contacted' => 'Contacted', 'closed' => 'Closed'];

    /** Photos stay private: only signed-in staff can open them. */
    public const DISK = 'local';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['photos' => 'array', 'preferred_day' => 'date:Y-m-d', 'year' => 'integer', 'mileage' => 'integer'];
    }

    protected static function booted(): void
    {
        static::deleted(fn (self $enquiry) => Storage::disk(self::DISK)->deleteDirectory('enquiries/'.$enquiry->id));
    }

    public function car(): BelongsTo
    {
        return $this->belongsTo(Car::class)->withTrashed();
    }

    /** Matches the admin filters: search text, kind and status. */
    public function scopeFilter(Builder $query, array $filters): void
    {
        $query->when($filters['q'] ?? null, function (Builder $query, string $q) {
            $like = '%'.str_replace(['%', '_'], ['\%', '\_'], $q).'%';
            $digits = preg_replace('/\D/', '', $q);
            $query->where(fn (Builder $query) => $query->where('name', 'like', $like)->orWhere('vehicle', 'like', $like)->orWhere('message', 'like', $like)
                ->when(strlen($digits) >= 3, fn (Builder $query) => $query->orWhere('phone', 'like', '%'.ltrim($digits, '0').'%')));
        })->when(isset(self::KINDS[$filters['kind'] ?? '']), fn (Builder $query) => $query->where('kind', $filters['kind']))
            ->when(isset(self::STATUSES[$filters['status'] ?? '']), fn (Builder $query) => $query->where('status', $filters['status']));
    }

    /** @param  array<int, UploadedFile>  $files */
    public function storePhotos(array $files): void
    {
        $photos = [];
        foreach (array_values($files) as $index => $file) {
            $name = 'photo-'.($index + 1).'.'.($file->guessExtension() ?: 'jpg');
            $photos[] = ['path' => $file->storeAs('enquiries/'.$this->id, $name, self::DISK), 'name' => $name, 'mime' => $file->getMimeType(), 'size' => $file->getSize()];
        }
        $this->update(['photos' => $photos ?: null]);
    }

    /** The enquiry as label => value, shared by the email, the admin table and the CSV. */
    public function details(): array
    {
        $trade = $this->kind === 'trade';

        return array_filter([
            'Name' => $this->name, 'Mobile' => $this->phone,
            'Wants to' => $trade ? ($this->intent === 'trade' ? 'Discuss a trade-in' : 'Sell their car') : null,
            'Car' => $trade ? trim($this->year.' '.$this->vehicle) : ($this->vehicle ?: 'Exploring the collection'),
            'Car page' => ! $trade && $this->car && ! $this->car->trashed() ? rtrim(config('app.url'), '/').'/cars/'.$this->car->slug.'/' : null,
            'Mileage' => $trade && $this->mileage !== null ? number_format($this->mileage).' km' : null,
            'Preferred day' => $this->preferred_day?->format('l j F Y'),
            'Preferred time' => $this->preferred_time ? Carbon::createFromFormat('H:i', $this->preferred_time)->format('g:i A').' (Karachi)' : null,
            'Message' => $this->message ?: null,
        ], fn ($value) => $value !== null && $value !== '');
    }

    public function heading(): string
    {
        return ($this->kind === 'trade' ? ($this->intent === 'trade' ? 'Trade-in enquiry' : 'Sell my car') : 'Viewing request').' from '.$this->name;
    }

    public function whatsapp(): string
    {
        return 'https://wa.me/'.ltrim($this->phone, '+');
    }

    public function summary(): array
    {
        return [...$this->only(['id', 'kind', 'status', 'name', 'phone', 'vehicle', 'year', 'mileage', 'intent', 'preferred_time', 'message', 'notes']),
            'preferred_day' => $this->preferred_day?->format('Y-m-d'), 'heading' => $this->heading(), 'details' => $this->details(), 'whatsapp' => $this->whatsapp(),
            'photos' => collect($this->photos ?? [])->keys()->map(fn ($i) => '/admin/enquiries/'.$this->id.'/photos/'.$i)->all(),
            'created_at' => $this->created_at?->toIso8601String()];
    }
}
