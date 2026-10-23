<?php

namespace App\Http\Requests;

use Closure;
use Illuminate\Http\UploadedFile;

/**
 * Shared validation for any request that carries a file upload.
 */
trait UploadRules
{
    protected function fileRules(): array
    {
        $maxKb = config('portal.max_upload_mb') * 1024;

        return [
            'required',
            'file',
            "max:{$maxKb}",
            function (string $attribute, mixed $value, Closure $fail) {
                if (! $value instanceof UploadedFile) {
                    return;
                }
                $ext = strtolower($value->getClientOriginalExtension());
                if (in_array($ext, config('portal.blocked_extensions'), true)) {
                    $fail("Files of type .{$ext} can't be uploaded.");
                }
            },
        ];
    }
}
