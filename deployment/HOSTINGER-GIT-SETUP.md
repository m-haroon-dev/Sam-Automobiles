# SAM Automobiles: Hostinger from GitHub, with MySQL

For **https://samautomobiles.co** using the repository https://github.com/m-haroon-dev/Sam-Automobiles.
The app is cloned beside `public_html`, and `public_html` points at the app's `public` folder, so `.env`, code and
uploads are never inside the web root. The compiled frontend (`public/build`) is in the repository, so the server
needs PHP 8.4 and Composer but not Node.

## 1. hPanel (once)

1. **Websites → samautomobiles.co → Advanced → PHP Configuration:** choose PHP **8.4**. Under PHP extensions, keep
   `pdo_mysql`, `gd`, `exif`, `fileinfo`, `mbstring`, `intl` and `openssl` on.
2. **Databases → Management:** create a MySQL database and user. Note the full names (Hostinger adds a prefix such
   as `u123456789_sam`) and the password.
3. **Advanced → SSH Access:** enable SSH and note the host, port and username.
4. **Security → SSL:** make sure the certificate for samautomobiles.co is active.
5. Back up anything currently in `public_html` (File Manager → compress → download).

## 2. Install over SSH (once)

```sh
ssh -p PORT USERNAME@HOST
php -v                      # must say 8.4; otherwise use /opt/alt/php84/usr/bin/php in place of php below
cd ~/domains/samautomobiles.co
git clone https://github.com/m-haroon-dev/Sam-Automobiles.git sam-app
cd sam-app
composer install --no-dev --optimize-autoloader
cp deployment/.env.hostinger.example .env
nano .env
```

In `.env`, fill in the database from step 1 and **delete the `APP_PUBLIC_PATH` line** (it belongs to the ZIP method):

```dotenv
APP_URL=https://samautomobiles.co
DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=u123456789_sam
DB_USERNAME=u123456789_sam
DB_PASSWORD="your-database-password"
```

Then set up the database, the first admin and the web root:

```sh
php artisan key:generate --force
php artisan migrate --seed --force
php artisan sam:create-admin your-email@example.com
cp deployment/hostinger.user.ini public/.user.ini
php artisan storage:link
php artisan optimize

cd ~/domains/samautomobiles.co
mv public_html public_html_old
ln -s sam-app/public public_html
```

Open https://samautomobiles.co and https://samautomobiles.co/admin/login. When everything works, delete
`public_html_old` (keep its `.well-known` folder if Hostinger placed one there).

## 3. Every update

On your computer, commit and push as usual. If you changed anything in `resources/js` or `resources/css`, run
`pnpm run build` first so the new `public/build` is committed. Then on the server:

```sh
cd ~/domains/samautomobiles.co/sam-app
bash deployment/deploy.sh
```

The script briefly puts the site in maintenance mode, pulls `main`, installs Composer packages, runs new migrations
and rebuilds Laravel's caches.

## Notes

- `.env` and uploaded photos (`storage/app/public`) exist only on the server. Back up the MySQL database (hPanel →
  Databases → phpMyAdmin → Export) together with `sam-app/storage/app/public`.
- Never run `migrate:fresh` on the live site; it erases every car and user.
- The seed only loads the starting inventory. Cars and users added on a local computer are not copied to the live
  database.
