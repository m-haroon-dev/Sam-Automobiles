<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));
$privateRoot = dirname(__DIR__).'/sam-app';
if (file_exists($maintenance = $privateRoot.'/storage/framework/maintenance.php')) {
    require $maintenance;
}
require $privateRoot.'/vendor/autoload.php';
/** @var Application $app */
$app = require_once $privateRoot.'/bootstrap/app.php';
$app->usePublicPath(__DIR__);
$app->handleRequest(Request::capture());
