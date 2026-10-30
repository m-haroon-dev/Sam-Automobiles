# SAM Automobiles — webapp quality report

29 October 2026 · React / Tailwind / Laravel · samautomobiles.co

The approved showroom design is preserved and the inventory is connected to a real database/admin. The source and prebuilt Hostinger packages are ready for installation. The existing public static Sites have not been replaced; the PHP application has not yet been deployed on Hostinger.

| Check | Result |
| --- | --- |
| Backend | 18 PHPUnit tests, 89 assertions passed, including one retained scaffold unit example |
| Frontend helpers | 4 Node tests passed |
| Code and dependencies | Pint, Composer validation and production platform requirements passed |
| Clean source rebuild | Frozen offline install; byte-identical manifest, JavaScript and CSS |
| Public routes | 126 phone/tablet/laptop route previews, Chromium + WebKit; zero failures |
| Customer features | 66 grouped checks; 54 internal-link responses; zero failures |
| Admin layouts | 6 responsive checks; zero failures |
| Management lifecycle | Desktop Chromium + phone WebKit, in development and extracted production package; zero failures |
| Additional responsive/gesture stress | 57 cases; 320, 412, 1024, 1920px layouts; zero failures |
| React navigation | 6 cases × 4 repeated cycles; back/forward, saved state, metadata and hero remounts passed |
| Extracted deployment | Fresh DB/migrations/seed, production vendor, upload link, cache optimization and 63 route previews passed |
| Approved media | All 196 public asset files match baseline SHA-256; includes 117 vehicle-photo variants and both hero movies |

## Database and owner workflow

Real uploads created responsive WebP photographs and became visible in inventory/detail pages without rebuilding. Feature selection changed the homepage collection. Cover order, captions and optional-list clearing persisted. Sold status added the badge, retained the detail page, removed the car from featured selection and included it in Recently sold. Archive hid the car; restore returned it as a private draft.

Checks covered login/authorization, draft privacy, failed-login limits, scoped photo IDs, invalid image rejection, photo-removal rollback, safe rendering of HTML-like entered text and an actual authenticated request without a CSRF token returning HTTP419. All disposable test records were isolated or removed. No customer enquiry was sent. No test login, application key, local database or credentials are included in the packages.

## Motion measurements

These measurements are bounded browser previews, not physical iPhone/Samsung certification.

The final cold-phone test used 390×844, DPR3, 6× CPU throttling, 1.6Mbps download and 150ms latency. During **84 seconds**, it completed two full six-car cycles, with **0 dropped frames out of 5041**, a 17.5ms p95 frame interval and no long tasks. All nine featured covers were loaded. First contentful paint was 2.42s; the first moving hero frame arrived at 7.42s on that constrained cold connection. A poster remains visible while video loads. Two native waiting events were recorded across the two loops.

The initial harsh cold diagnostic showed 1.22% dropped frames and buffering. The repeat above added host/browser clocks, which agreed on the full 84-second window, and passed. Retain this variability when judging emulation; no claim of perfect playback on every connection is made.

Isolated hero previews at phone/tablet/laptop had approximately 17–18ms p95 frame intervals. Continuous synthetic swipe/trackpad profiles settled around 33ms in both the unchanged static reference and the React app. The repeat showed no frame intervals above 50ms; one 53ms browser long task appeared in the desktop profile. Phone/tablet carousel JS work stayed below 45ms total across the gesture run, and the hero paused offscreen. These synthetic input measurements show no observed conversion regression; they are not a guarantee of 60fps native touch on a physical device.

## Preserved content and scope

Nine supplied cars, 39 listing photos, Google-review excerpts/portraits, Instagram/Facebook icons, contact numbers, one Visit map, since2014, 789 delivered and Monday–Saturday11am–7pm remain. Shared photo styling is10px /4:3 /cover, with captions below and reduced-motion support. The showroom background, doors, car film, number plates and representative hero sequence remain unchanged. Featured inventory is editable separately; new cars do not regenerate the filmed hero.

Saved/compare selections remain in browser storage. Viewing and sell/trade forms prepare WhatsApp messages. They do not store leads or send messages automatically. No automatic Google or Instagram feed is added.

## Installation still required

Follow HOSTINGER-SETUP.md: upload the private sam-app beside public_html, configure current PHP8.4+, MySQL credentials, HTTPS and APP_KEY, run migrations/seed, create the upload link, and choose the owner's own administrator account through the hidden CLI prompts. Repeat checks on the actual Hostinger account and physical phones. SQLite was used for local database QA; the customer's live MySQL service and network were not available for testing.

Back up the SQL database, uploaded-photo directory and private environment together. No Node server is needed in production.
