<!DOCTYPE html>
<html lang="en" class="js">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="theme-color" content="#171a18">
    <title data-inertia="title">{{ $page['props']['seo']['title'] ?? 'SAM Inventory Admin | SAM Automobiles' }}</title>
    @if(isset($page['props']['seo']))
        <meta data-inertia="description" name="description" content="{{ $page['props']['seo']['description'] }}">
        <link data-inertia="canonical" rel="canonical" href="{{ $page['props']['seo']['url'] }}">
        <meta data-inertia="og-title" property="og:title" content="{{ $page['props']['seo']['title'] }}">
        <meta data-inertia="og-description" property="og:description" content="{{ $page['props']['seo']['description'] }}">
        <meta data-inertia="og-image" property="og:image" content="{{ $page['props']['seo']['image'] }}">
        <meta data-inertia="og-url" property="og:url" content="{{ $page['props']['seo']['url'] }}">
        <meta property="og:type" content="website">
        <meta name="twitter:card" content="summary_large_image">
        @if($page['props']['seo']['noindex'])<meta data-inertia="robots" name="robots" content="noindex,follow">@endif
        <script data-inertia="schema" type="application/ld+json">{!! json_encode($page['props']['seo']['schema'], JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT|JSON_UNESCAPED_SLASHES) !!}</script>
    @else
        <meta data-inertia="robots" name="robots" content="noindex,nofollow">
    @endif
    <link rel="icon" href="/assets/icon-64.png">
    <link rel="apple-touch-icon" href="/assets/icon-192.png">
    @viteReactRefresh
    @vite(['resources/css/app.css','resources/js/app.jsx'])
    @inertiaHead
</head>
<body class="{{ in_array($page['props']['page'] ?? '', ['Home','Wheel']) ? 'dark' : 'paper' }}">
    @inertia
    <noscript><div style="padding:32px;background:#f2f3ee;color:#202820"><h1>SAM Automobiles</h1><p>Explore the collection with JavaScript enabled, or call +92 324 2607773 to discuss a car.</p><a href="/inventory/">Inventory</a> · <a href="/visit/">Visit the showroom</a></div></noscript>
</body>
</html>
