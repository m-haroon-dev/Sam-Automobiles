<!doctype html>
<html lang="en">
<body style="margin:0;padding:24px;background:#f2f3ee;font-family:Arial,Helvetica,sans-serif;color:#171a18">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #d8ddd2;border-radius:12px">
    <tr><td style="padding:24px 28px;background:#293b2d;border-radius:12px 12px 0 0;color:#f2f3ee">
        <p style="margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.75">{{ config('app.name') }}</p>
        <h1 style="margin:6px 0 0;font-size:22px;font-weight:600">{{ $heading }}</h1>
    </td></tr>
    <tr><td style="padding:20px 28px">
        @if ($note)
            <p style="margin:0 0 16px;font-size:15px;line-height:1.5">{{ $note }}</p>
        @endif
        @if ($details)
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:15px;line-height:1.45">
                @foreach ($details as $label => $value)
                    <tr>
                        <td style="padding:8px 12px 8px 0;border-bottom:1px solid #eef0ea;color:#586153;vertical-align:top;white-space:nowrap">{{ $label }}</td>
                        <td style="padding:8px 0;border-bottom:1px solid #eef0ea;white-space:pre-line">{{ $value }}</td>
                    </tr>
                @endforeach
            </table>
        @endif
        @if ($photos)
            <p style="margin:16px 0 0;font-size:14px;color:#586153">{{ count($photos) }} {{ count($photos) === 1 ? 'photo is' : 'photos are' }} attached.</p>
        @endif
        @if ($link)
            <p style="margin:20px 0 0"><a href="{{ $link }}" style="display:inline-block;padding:10px 18px;border-radius:999px;background:#293b2d;color:#ffffff;text-decoration:none;font-size:14px">Reply on WhatsApp</a></p>
        @endif
    </td></tr>
    <tr><td style="padding:14px 28px 22px;font-size:12px;color:#586153">Sent from the enquiry form on {{ config('app.url') }}.</td></tr>
</table>
</body>
</html>
