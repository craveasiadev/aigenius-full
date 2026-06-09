<?php

namespace App\Providers;

use App\Mail\Transport\MailerSendApiTransport;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Mail;

class MailerSendServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        Mail::extend('mailersend', function (array $config) {
            return new MailerSendApiTransport(
                $config['api_key'] ?? config('services.mailersend.api_key')
            );
        });
    }
}
