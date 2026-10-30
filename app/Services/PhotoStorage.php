<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PhotoStorage
{
    /** Decodes an upload with its JPEG EXIF orientation applied; the caller destroys the image. */
    public function decode(UploadedFile $file, string $field = 'uploads'): \GdImage
    {
        $size = @getimagesize($file->getRealPath());
        if (! $size || $size[0] * $size[1] > 50000000) {
            throw ValidationException::withMessages([$field => 'Choose an image of at most 50 megapixels.']);
        }
        $image = @imagecreatefromstring($file->getContent());
        if (! $image) {
            throw ValidationException::withMessages([$field => 'The photo could not be decoded. Export it as JPEG or WebP and try again.']);
        }
        if ($file->getMimeType() === 'image/jpeg' && function_exists('exif_read_data')) {
            $orientation = @exif_read_data($file->getRealPath())['Orientation'] ?? 1;
            if (in_array($orientation, [2, 4, 5, 7])) {
                imageflip($image, IMG_FLIP_HORIZONTAL);
            }
            $angle = match ((int) $orientation) {
                3,4 => 180,5,6 => -90,7,8 => 90,default => 0
            };
            if ($angle) {
                $rotated = imagerotate($image, $angle, 0);
                imagedestroy($image);
                $image = $rotated;
            }
        }

        return $image;
    }

    public function store(UploadedFile $file): array
    {
        $image = $this->decode($file);
        $directory = 'cars/'.Str::uuid();
        try {
            $width = imagesx($image);
            $height = imagesy($image);
            $variants = [];
            foreach (['src' => 1600, 'medium' => 800, 'small' => 400] as $key => $target) {
                $outWidth = min($target, $width);
                $outHeight = max(1, (int) round($height * $outWidth / $width));
                $canvas = imagecreatetruecolor($outWidth, $outHeight);
                imagealphablending($canvas, false);
                imagesavealpha($canvas, true);
                imagefill($canvas, 0, 0, imagecolorallocatealpha($canvas, 0, 0, 0, 127));
                imagecopyresampled($canvas, $image, 0, 0, 0, 0, $outWidth, $outHeight, $width, $height);
                ob_start();
                $ok = imagewebp($canvas, null, 85);
                $bytes = ob_get_clean();
                imagedestroy($canvas);
                if (! $ok || ! $bytes) {
                    throw new \RuntimeException('Photo encoding failed.');
                }
                $path = $directory.'/'.$key.'.webp';
                if (! Storage::disk('public')->put($path, $bytes)) {
                    throw new \RuntimeException('Photo storage is not writable.');
                }
                $variants[$key] = '/storage/'.$path;
                $variants[$key.'Width'] = $outWidth;
            }

            return ['directory' => $directory, 'variants' => $variants, 'width' => $width, 'height' => $height];
        } catch (\Throwable $error) {
            Storage::disk('public')->deleteDirectory($directory);
            throw $error;
        } finally {
            imagedestroy($image);
        }
    }
}
