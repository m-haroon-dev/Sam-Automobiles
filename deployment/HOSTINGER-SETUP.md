# SAM Automobiles — Hostinger installation

Prepared for **https://samautomobiles.co**. This is a PHP/database webapp, not the previous static HTML upload. The application has been tested locally; installation on your Hostinger account remains to be performed.

## 1. Prepare hosting

Use a PHP hosting plan with SSH, MySQL and a current PHP **8.4 or later** release. This package's locked dependencies require 8.4 even though Laravel's general minimum is lower. Enable PDO MySQL, GD/WebP, EXIF, Fileinfo, Mbstring, DOM/XML, cURL and OpenSSL. Enable HTTPS for samautomobiles.co. The optional `.user.ini` requests 512 MB memory, 12 MB per file and 128 MB per request; hPanel server limits take precedence.

Back up an existing site before replacing its public files. Preserve any `.well-known` certificate directory supplied by the host. Remove the old static `index.html`, `cars.json`, `sitemap.xml`, `robots.txt` and static route directories from the new web root: otherwise Apache can serve stale files instead of Laravel. The new `assets` directory replaces the matching release assets.

## 2. Upload the correct structure

Extract the **Hostinger** ZIP one level above the domain's `public_html`, for example:

```text
/home/YOUR_ACCOUNT/domains/samautomobiles.co/
    sam-app/          private Laravel code, vendor, storage, .env
    public_html/      public index.php, .htaccess, build, assets, sw.js
    HOSTINGER-SETUP.md
```

Keep `sam-app` beside `public_html`, never inside it. The public entry point already loads the private sibling. The package contains production Composer dependencies and compiled frontend assets, so Composer and Node installation are not required on the server for this upload.

## 3. Set the private environment

In `sam-app`, copy `.env.hostinger.example` to `.env`. Set your real database name, database user and database password. Quote passwords that contain spaces, `#` or other environment syntax. Keep these settings:

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_URL=https://samautomobiles.co
APP_PUBLIC_PATH=../public_html
DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=YOUR_DATABASE
DB_USERNAME=YOUR_DATABASE_USER
DB_PASSWORD="YOUR_DATABASE_PASSWORD"
SESSION_SECURE_COOKIE=true
```

Leave `APP_KEY` empty until the next command generates it. These examples contain no working credentials.

## 4. Initialize through SSH

Use the PHP 8.4 CLI binary supplied by your Hostinger account. Confirm `php -v` first; do not run with an older CLI version. From `sam-app`:

```sh
php artisan key:generate --force
php artisan migrate --seed --force
php artisan storage:link
php artisan sam:create-admin owner@your-company-domain.com
php artisan optimize
```

Choose your own administrator email and strong password at the hidden prompts. There is no public registration page. `storage:link` must create `public_html/storage` pointing to `sam-app/storage/app/public`; `APP_PUBLIC_PATH` above makes Artisan use the correct location. If symlinks are disabled, enable them through the hosting account or have the host configure an equivalent alias to that specific public-upload folder.

Ensure the PHP process can write to `sam-app/storage` and `sam-app/bootstrap/cache` using normal owner permissions. Do not make the private application publicly accessible. Do not expose a temporary web installer or an `.env` download.

## 5. Verify the live account

Open `/`, `/inventory/`, a car detail page, `/compare/`, `/visit/`, `/sell/`, `/sitemap.xml` and `/admin/login` over HTTPS. Sign in, create a private Draft, upload a photo, publish and feature that test listing, then mark it Sold and archive it. Verify the changes on another device in a fresh browser tab. Check the showroom video loads and plays through the range-capable host, images have the expected proportions, and the Visit page has one map.

The source package contains local QA evidence references and reusable tests. Local previews do not certify a physical phone, the customer's cellular connection or this hosting account's PHP/MySQL/media settings. These deployment checks must be repeated after installation.

## Daily use and backups

Use `/admin` to add/edit cars, choose Featured, reorder photos, mark Sold, and archive/restore records. Database changes appear after a visitor refreshes or navigates to the page; a build is not needed. The original filmed hero remains unchanged. Database and uploaded-file backups must be retained together. Never rerun `migrate:fresh` on a live site. Repeating the initial seeder will not overwrite owner edits.

The enquiry forms continue through WhatsApp. No email service, payment gateway, customer-login system or lead CRM is configured because these were not part of this inventory request.

References: [Laravel deployment](https://laravel.com/framework/docs/deployment), [Laravel public file storage](https://laravel.com/framework/docs/13.x/filesystem), [Hostinger framework support](https://www.hostinger.com/support/which-programming-languages-and-frameworks-are-supported-at-hostinger/).
