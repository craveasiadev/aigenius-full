<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    'paths' => ['*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_filter(array_merge([
        // Production domains
        'https://app.wonderpark.my',
        'https://app.aigenius.com.my',
        'https://aig.aigenius.com.my',
        'https://art.aigenius.com.my',

        // Local development
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
        'http://localhost:3000',
        'http://artventure.test',
        'https://artventure.test',
    ], array_filter(explode(',', env('CORS_ALLOWED_ORIGINS', ''))))),

    // Must be valid PCRE patterns with delimiters (e.g. /^https:\/\/example\.com$/).
    'allowed_origins_patterns' => [
        '/^https:\/\/.*\.ngrok-free\.app$/',
        '/^https:\/\/.*\.ngrok\.io$/',
        '/^http:\/\/localhost(:\d+)?$/',
        '/^https?:\/\/127\.0\.0\.1(:\d+)?$/',
        '/^https?:\/\/.*\.wonderpark\.my$/',
        '/^https?:\/\/.*\.aigenius\.com\.my$/',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,
];
