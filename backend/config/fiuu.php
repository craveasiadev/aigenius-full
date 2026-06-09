<?php
// config/fiuu.php

return [
    /*
    |--------------------------------------------------------------------------
    | FiuuPay / RMS Configuration
    |--------------------------------------------------------------------------
    */

    'merchant_id' => env('FIUU_MERCHANT_ID', 'craveasia'),
    'verify_key' => env('FIUU_VERIFY_KEY', '2e2677c637828aced077ee3a8caba14b'),
    'secret_key' => env('FIUU_SECRET_KEY', 'your_secret_key_here'),

    // Base URL — FiuuPaymentService appends `/{merchant_id}/{method}`
    // itself, so do NOT include the merchant or a trailing slash here.
    //   Production: https://pay.fiuu.com/RMS/pay
    //   Sandbox:    https://sandbox-payment.fiuu.com/RMS/pay
    'base_payment_url' => env('FIUU_BASE_PAYMENT_URL', 'https://pay.fiuu.com/RMS/pay'),

    // Legacy key — older code may still expect a merchant-suffixed URL.
    'payment_url' => env('FIUU_PAYMENT_URL', 'https://pay.fiuu.com/RMS/pay/' . env('FIUU_MERCHANT_ID', 'craveasia') . '/'),
];
