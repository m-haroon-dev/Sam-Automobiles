<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/** Profile photos: re-encoded as a 256px square WebP, cropped from the upper-centre where faces usually are. */
class AvatarStorage
{
    private const SIZE = 256;

    public function __construct(private PhotoStorage $photos) {}

    public function store(UploadedFile $file): string
    {
        $image = $this->photos->decode($file, 'avatar');
        try {
            $width = imagesx($image);
            $height = imagesy($image);
            $side = min($width, $height);
            $canvas = imagecreatetruecolor(self::SIZE, self::SIZE);
            imagealphablending($canvas, false);
            imagesavealpha($canvas, true);
            imagefill($canvas, 0, 0, imagecolorallocatealpha($canvas, 0, 0, 0, 127));
            imagecopyresampled($canvas, $image, 0, 0, intdiv($width - $side, 2), intdiv($height - $side, 3), self::SIZE, self::SIZE, $side, $side);
            ob_start();
            $ok = imagewebp($canvas, null, 85);
            $bytes = ob_get_clean();
            imagedestroy($canvas);
            $path = 'avatars/'.Str::uuid().'.webp';
            if (! $ok || ! $bytes || ! Storage::disk('public')->put($path, $bytes)) {
                throw new \RuntimeException('Profile photo could not be saved.');
            }

            return $path;
        } finally {
            imagedestroy($image);
        }
    }

    public function delete(?string $path): void
    {
        if ($path && str_starts_with($path, 'avatars/')) {
            Storage::disk('public')->delete($path);
        }
    }

    public static function url(?string $path): ?string
    {
        return $path ? '/storage/'.$path : null;
    }
}
