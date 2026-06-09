<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Default WPay App Source
    |--------------------------------------------------------------------------
    |
    | Identifies which frontend/application a WPay request belongs to.
    | This prevents data from multiple frontends from being mixed.
    |
    */
    'default_app_source' => env('WPAY_DEFAULT_APP_SOURCE', 'wonderstar'),

    /*
    |--------------------------------------------------------------------------
    | Superadmin WPay Source
    |--------------------------------------------------------------------------
    |
    | Superadmin pages in this backend should only read WPay transactions
    | belonging to this source.
    |
    */
    'superadmin_app_source' => env('SUPERADMIN_WPAY_APP_SOURCE', 'artventure'),
];

