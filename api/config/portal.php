<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Portal Example settings
    |--------------------------------------------------------------------------
    */

    'name' => env('APP_NAME', 'Portal Example'),

    // The Next.js app. Used for CORS and for links back to the portal.
    'frontend_url' => env('FRONTEND_URL', 'http://localhost:3000'),

    // Where uploaded versions are stored. Any disk in config/filesystems.php
    // works; use "s3" in production. The "local" disk is private
    // (storage/app/private) so files are only reachable through the API.
    'disk' => env('PORTAL_DISK', 'local'),

    // Largest single upload, in megabytes. PHP's upload_max_filesize and
    // post_max_size (and your web server's body limit) must allow it too.
    'max_upload_mb' => (int) env('PORTAL_MAX_UPLOAD_MB', 100),

    // Extensions refused outright, whatever their content.
    'blocked_extensions' => [
        'php', 'php3', 'php4', 'php5', 'phtml', 'phar', 'cgi', 'pl',
        'exe', 'msi', 'bat', 'cmd', 'com', 'scr', 'jar', 'vbs', 'ps1',
    ],

];
