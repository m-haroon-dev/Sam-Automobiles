# SAM Automobiles webapp continuation — 29 October 2026

The user requested the approved website converted to **React + Tailwind CSS with Laravel/PHP**, with an authenticated inventory admin to add/edit cars and photographs, publish/draft, mark sold and choose featured cars. Preserve the approved door-opening hero, brand content and customer layouts. Do not substitute a static/mock admin or claim PHP runs on ChatGPT Sites.

## Workspace and preserved releases

Active source: `/Users/rehqnn/.codex/visualizations/2026/10/19/01a15356-6d37-7d90-9b90-13aa1b8f2166/sam-automobiles-webapp-2026-10-29`.
Git branch: `codex/laravel-inventory`. Initial implementation commit: `1d1fd6d`; verified webapp code checkpoint: `e453784`. Inspect current Git log for later documentation updates.
Original static baseline: sibling `sam-automobiles-door-hostinger-release-2026-10-29`.
The existing public showroom and wheel Sites have not been changed by this backend task:
- https://sam-automobiles-private-showroom.sergioaustin58.chatgpt.site
- https://sam-automobiles-wheel.sergioaustin58.chatgpt.site
Planned PHP domain: https://samautomobiles.co. No Hostinger credentials are available; no PHP deployment has been performed.

## Implementation

Laravel 13.39.0, Inertia Laravel 3.5.2 / React adapter 3.9.1, React 19.3.1, Tailwind 4.3.3, Vite 8.3.5, GSAP 3.15.0 / @gsap/react 2.1.2. Lockfiles included. Production requirements are PHP 8.4+, GD/WebP, EXIF, Fileinfo and Laravel's normal extensions. Node/pnpm are build tools; production needs no Node process.

Real Eloquent cars/photos schema and authenticated admin: inventory dashboard/search/status filters, details, prices or price-on-request, ideal-buyer/USP, equipment/notes, attractions/references, photo uploads/cover/order/captions/framing/removal, feature/order, sold, archive/restore. Drafts/archives are hidden from public data and routes. Available published cars can be featured. Sold listings remain public with a badge and appear in Recently sold. Existing slugs remain stable. Initial nine cars and 39 photographs seed once and preserve owner edits even when seeding is repeated.

Uploads are re-encoded to maximum 1600/800/400 WebP variants using real dimensions and JPEG EXIF orientation. JPEG/PNG/WebP; 10 MB/image, 50 MP, 12 uploads/save, 30 photos/car. Filesystem rollback on validation/transaction failure. Random upload folders, scoped photo IDs and URL validation. Admin-only login, hashed passwords, regenerated/encrypted sessions, CSRF, failed-login rate limits, no public registration. `sam:create-admin EMAIL` uses hidden password prompts and refuses to overwrite accounts.

The public frontend uses genuine React components/context, Inertia links and URL state, the original native 60 fps film/controller and native touch carousel. Metadata/structured data come from Laravel. Photo frame geometry is 4:3/10px with real child-image fill, including Safari comparison table cells. All 196 public asset files match baseline SHA-256, including 117 listing-photo variants and both hero movies. Hero selection is a fixed representative film; featuring/uploading inventory does not regenerate that film.

Customer saved/compare state remains localStorage. Viewing and trade forms prepare WhatsApp messages; they do not store customer leads or send messages automatically. Existing source-verified Google review excerpts/avatars, social content and map remain, without automatic external feeds. Since 2014, 789 delivered, Monday–Saturday 11 am–7 pm, canonical domain samautomobiles.co.

## Guidance and lessons

The Laravel scaffold supplied its own AGENTS.md (read), and Boost generated applicable PHP/Laravel/Inertia/Tailwind/testing skills under `.agents/skills`; these were read. No `.ai/rules` directory exists. No subagents were used. GSAP skill was applied earlier. Follow user preservation constraints above any optional design rules.

Important fixes already made:
- HTML-to-JSX conversion must retain children accidentally nested under HTML5 void `source` elements by lxml; regenerated real image/video siblings.
- Inertia 3 React `form.transform()` returns void: call transform and post separately.
- New-car editor must not dereference `car.public_url` when car is null.
- Multipart omits empty arrays: request normalization explicitly clears features/notes/attractions and unchecked feature flag.
- Inertia asset-version headers are needed in request tests after compiling Vite assets.
- Wait for React render and Inertia URL completion before testing immediate reload.
- Safari table-cell pictures need the child image positioned absolutely to fill the fixed frame.
- Hostinger's split public path must update `filesystems.links` after the public path is rebound, or Artisan will link uploads in the private default public directory.
- Development Boost browser logger is disabled in local `.env` to avoid preview-proxy logging errors; Boost is absent from the production vendor tree.

## Verification completed

- 18 PHPUnit tests / 89 assertions (17 behavior tests plus retained scaffold unit example), four Node helper tests, Pint and Composer validation passed.
- 21 public routes × phone390/tablet834/laptop1440 × Chromium/WebKit =126 route previews, plus 66 grouped feature checks and 54 internal-link responses, no failures. Reports `qa/final-final-webapp-{chromium,webkit}`.
- Six admin layout checks and full real-upload/publish/feature/cover/edit/clear/sold/archive/restore lifecycles on desktop Chromium and phone WebKit. Real missing-CSRF request returned419. Disposable test cars removed from the development DB; nine originals remain.
- Same real management lifecycle passed against an independently extracted package with production-only vendor, including safe rendering of entered HTML-like text. Its test DB/admin remain only in the temporary extraction, never the ZIP.
- Expanded320/412/1024/1920 layouts plus rapid gesture/reversal/rotation/gallery/reduced-motion checks: Chromium30 cases, WebKit27, zero failures. SPA navigation/back/forward/saved state/metadata/hero remount checks: six cases ×four cycles, zero failures.
- Extracted Hostinger package initialized a fresh SQLite DB, seeded, linked uploads, optimized caches and served all63 responsive route previews. Live Hostinger MySQL/SSL/range delivery still needs post-install verification.
- Hero/carousel profiles are in `qa/profile-*`. Isolated hero p95 roughly17–18ms with 4x mobile CPU. Native synthetic swipe profile settles near33ms both in the unchanged static baseline and the React app, without an observed conversion regression. A first harsh6x CPU/cold1.6Mbps run showed1.22% video-frame drops and buffering; the instrumented final repeat in `qa/cold-sustained-final-webapp` completed84 seconds/two full cycles with0 dropped out of5041 frames,17.5ms p95, no long tasks and all9 covers loaded. Host/browser clocks agreed. FCP2.424s; moving hero7.417s on that harsh cold connection. Do not describe emulator results as physical iPhone/Samsung certification or claim every diagnostic passed.

## Local runtime and servers

Bundled Node executable: `/Users/rehqnn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node`.
pnpm executable: `/Users/rehqnn/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm`; prepend the Node bin to PATH when building.
PHP/Composer local-only runtime: `/private/tmp/sam-laravel-runtime/php`, `composer.phar`; use `PHPRC=/private/tmp/sam-laravel-runtime/php.ini`. Do not ship this old local PHP binary. PHP is8.4.1 for local QA; production uses current patched8.4+.
Playwright module: `/Users/rehqnn/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs`; `PLAYWRIGHT_BROWSERS_PATH=/private/tmp/sam-door-browsers`.
Random local preview-admin credentials are in `/private/tmp/sam-laravel-runtime/preview-access.json`, mode0600. Do not print, commit or package it. Production has no default account.

Development PHP8781 must run with CWD `public`: `php -S 127.0.0.1:8781 -t . ../vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php`. Local QA proxy8780: `node scripts/serve-preview.mjs` from app root. It adds gzip/range serving only for QA. Task-owned server sessions originally PHP85820/proxy96420. Additional temporary servers: extracted package8782 session27355, reference static8785 session49560. Inspect before stopping only task-owned processes. Do not kill unrelated servers/browsers.

## Packaging and remaining delivery work

Hostinger staging sibling: `sam-webapp-hostinger-package-2026-10-29`, with private `sam-app` beside `public_html`. Source staging: `sam-webapp-source-package-2026-10-29`. Production Composer install was performed in its private sam-app with `--no-dev --classmap-authoritative`; no Boost, PHPUnit, node_modules, local .env, keys, credentials, DBs or QA fixtures may enter release ZIPs. Production `.env.hostinger.example` uses MySQL, APP_PUBLIC_PATH=../public_html and HTTPS secure cookies.

`scripts/package-webapp.py` prepares staging and archives with per-file SHA-256 manifests, checks forbidden files, tests ZIP integrity. Staging has already been prepared; do not rerun preparation into existing folders. `--zip` safely regenerates the distinct webapp output ZIPs. Source/staging copies of scripts/docs must be refreshed after final edits; compare important source/build files against the working app. Production provider public-path fix has already been copied into both staging roots.

Outputs are in the parent `outputs` directory:
- SAM-Automobiles-Laravel-Hostinger.zip
- SAM-Automobiles-React-Tailwind-Laravel-Source.zip
Final source rebuild used a frozen offline install and produced byte-identical JS/CSS/manifests after explicitly scoping Tailwind to resources/js and resources/views. Package integrity and installation verification are recorded in the output QA report. Do not overwrite old static RECHECKED artifacts.

Delivery checks are complete: both ZIPs pass CRC and every per-file SHA-256, and the freshly extracted final Hostinger archive migrated/seeded/linked/optimized successfully, served all21 public routes and compiled assets, retained9 cars/39 photos and denied private-file URLs. No remaining coding work is required for this request. Hostinger account installation and live MySQL/SSL/media/device checks still require the hosting environment. Primary local preview8780/8781 is retained for review; temporary package/reference servers are cleaned up. Keep all factual test limits in the final handoff. Final response should link the Hostinger package and editable source and state that Hostinger DB/env/admin setup remains, with the setup guide. Do not present the unchanged public static Site as the deployed Laravel backend.
