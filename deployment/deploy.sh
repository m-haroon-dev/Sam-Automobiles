#!/usr/bin/env bash
# Updates the live site from GitHub. On Hostinger, from the app folder: bash deployment/deploy.sh
# Set PHP=/path/to/php84 when the default `php` on the server is older than 8.4.
set -euo pipefail
cd "$(dirname "$0")/.."
PHP="${PHP:-php}"

"$PHP" artisan down --retry=15 || true
trap '"$PHP" artisan up' EXIT

git pull --ff-only origin main
if [ "$PHP" = php ]; then composer install --no-dev --optimize-autoloader --no-interaction
else "$PHP" "$(command -v composer)" install --no-dev --optimize-autoloader --no-interaction; fi
[ -f public/.user.ini ] || cp deployment/hostinger.user.ini public/.user.ini
[ -e public/storage ] || "$PHP" artisan storage:link
"$PHP" artisan migrate --force
"$PHP" artisan optimize

echo "Deployed $(git log -1 --format='%h %s')"
