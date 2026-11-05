# SAM Automobiles webapp

The approved dark showroom website, rebuilt as a React 19 + Tailwind CSS 4 frontend with an Inertia 3 / Laravel 13 backend. Inventory, photographs, publication status and featured selections are stored in a database. The original showroom film, imagery, business details and public routes are preserved.

## Owner workflow

Sign in at `/admin/login`. The left sidebar opens the **Dashboard** (stock counts, recent updates and category totals), **Cars**, **Add a car**, **Categories** and **Users**. Select **Add a car**, enter its details and upload JPEG, PNG or WebP photographs. Save as **Draft** while preparing it; choose **Available** to publish. A published car needs a photograph, ideal-buyer line and standout feature.

- **Categories** group cars (for example SUV, Saloon, Pickup). Add, rename, reorder or delete them under Categories, and choose one in the car editor. Customers can filter the public catalogue by category. Deleting a category keeps its cars without a category. Existing stock starts grouped by its body style.
- There is exactly **one Admin**. Everyone else is a **User** who can sign in and add, edit, sell, feature, archive and delete cars, and add, edit and delete categories. Only the Admin sees **Users**: they create users (with an optional profile photo), edit names, emails and photos, set a new password, turn sign-in off or delete a user. **Make admin** hands the single Admin role to another active user, and the previous Admin becomes a User. `sam:create-admin` refuses to create a second Admin.
- **My profile** (bottom of the sidebar) lets every account change its own name, profile photo and password. Photos are JPEG, PNG or WebP up to 5 MB, stored as 256px square WebP files under `storage/app/public/avatars`. Password fields have Show/Hide, a live requirements checklist and, for new users, a strong-password generator; passwords need at least 12 characters with mixed case, a number and a symbol. A new password, turned-off sign-in or deletion signs that user out elsewhere.
- **Featured** selects available cars for the homepage collection. Lower homepage-order numbers appear first.
- **Enquiries** lists every viewing request and sell/trade-in enquiry sent from the website, newest first, with search and filters by status (New, Contacted, Closed) and type. Change the status from the table, **Edit** details and add staff-only notes, or **Delete** an enquiry with its photos. **Download CSV** exports the enquiries matching the current filters. Trade-in photos are stored privately under `storage/app/private/enquiries` and open only for signed-in staff. The sidebar shows how many are still New, and the Dashboard shows the latest five.
- **Email** (Admin only) connects the mailbox that receives website enquiries. Enter the email and its password; the SMTP server, port and security fill in from the domain (Gmail, Outlook, Yahoo, iCloud and Zoho addresses, and for business domains from their MX records: Google Workspace, Microsoft 365, Hostinger, Zoho, Titan, GoDaddy; otherwise `mail.<domain>`) and can be changed under Advanced. Gmail needs an App Password. **Send test email** checks the connection. The password is stored encrypted with `APP_KEY`.
- **Mark sold** retains the listing and adds its Sold tag, removes it from featured cars and adds it to Recently sold.
- Edit photo descriptions, accessible descriptions, vertical framing and cover/order. Upload up to 12 photographs per save, 10 MB each, 30 per car. Export HEIC files as JPEG before upload.
- **Archive** hides a listing while retaining its photographs. Filter by Archived to restore it as a private Draft.
- Existing listing addresses remain stable when names or specifications change.

The approved six-car showroom film is preserved separately from the featured inventory. Uploading new stock updates the catalogue, details and featured collection; it does not regenerate the filmed hero.

## Development

Use current PHP 8.4+, Composer 2 and Node 24 with pnpm 11. Required PHP extensions include PDO MySQL or SQLite, GD with WebP support, EXIF, Fileinfo, Mbstring, DOM/XML, cURL, OpenSSL and Laravel's standard extensions. Versions are pinned in both lockfiles.

```sh
composer install
pnpm install --frozen-lockfile
cp .env.example .env
# For local HTTP development, set APP_ENV=local, APP_DEBUG=true,
# APP_URL=http://127.0.0.1:8000 and SESSION_SECURE_COOKIE=false in .env.
# Use DB_CONNECTION=sqlite; create database/database.sqlite.
php artisan key:generate
php artisan migrate --seed
php artisan storage:link
php artisan sam:create-admin owner@example.com
pnpm run build
php artisan serve
```

The administrator command uses hidden password prompts and refuses to change an existing account. No production account, password, application key or database is shipped. Initial seeding adds the nine supplied cars and 39 photos once; repeating it preserves owner edits and archived records.

```sh
php artisan test --compact
pnpm test
vendor/bin/pint --test
```

Responsive browser and performance scripts in `scripts/` use an external Playwright installation. They do not ship a browser or Node server to production. `scripts/serve-preview.mjs` is a local QA transport for native video byte ranges, not a hosting requirement. Browser-admin tests read a private, local-only credential file outside this repository and operate on disposable QA records.

## Hosting

See `deployment/HOSTINGER-SETUP.md`. The prebuilt Hostinger package includes production PHP dependencies, compiled React/Tailwind files and the approved assets. It needs PHP hosting and a database; uploading a standalone HTML file or a ChatGPT static Site cannot run the new admin/backend. A Node process is not required in production.

## Data boundaries

Saved cars and comparison choices remain in the visitor's browser. Viewing and sell/trade forms prepare WhatsApp messages. Each valid enquiry is saved for Admin › Enquiries (trade-in photos, resized in the browser, on the private disk) and, when a mailbox is connected under Admin › Email, also emailed to the showroom inbox with photos capped at 20 MB. Google review excerpts, portraits, branding and social posts remain the existing verified source content; there is no automatic Google/Instagram feed or background scraping.

Back up the SQL database, `storage/app/public`, `storage/app/private` (enquiry photos) and the private `.env` before upgrades. The database stores uploaded-photo paths; the files themselves live on disk. The existing seed photographs live under public assets.

## Source structure

- `app/Models`, `app/Services`, `app/Http`: inventory, photos, authentication and public-page responses.
- `database/migrations`, `database/seeders`, `resources/inventory`: schema and the preserved initial stock/content.
- `resources/js`: React components, customer pages, inventory admin and scoped motion controllers.
- `resources/css`: Tailwind theme/utilities and preserved showroom component styles.
- `public/assets`: approved local photographs, original motion film, logos, fonts and map.
- `deployment`: split-root Hostinger entry point, environment example and installation guide.
