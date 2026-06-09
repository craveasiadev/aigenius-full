<?php

namespace App\Mail\Transport;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Symfony\Component\Mailer\SentMessage;
use Symfony\Component\Mailer\Transport\AbstractTransport;
use Symfony\Component\Mime\MessageConverter;

class MailerSendApiTransport extends AbstractTransport
{
    protected string $apiKey;

    public function __construct(string $apiKey)
    {
        parent::__construct();
        $this->apiKey = $apiKey;
    }

    protected function doSend(SentMessage $message): void
    {
        $email = MessageConverter::toEmail($message->getOriginalMessage());

        $from = $email->getFrom()[0];
        $to = $email->getTo()[0];

        $payload = [
            'from' => [
                'email' => $from->getAddress(),
                'name' => $from->getName() ?? config('mail.from.name'),
            ],
            'to' => [
                [
                    'email' => $to->getAddress(),
                    'name' => $to->getName() ?? '',
                ]
            ],
            'subject' => $email->getSubject(),
            'html' => $email->getHtmlBody(),
            'text' => $email->getTextBody() ?? strip_tags($email->getHtmlBody()),
        ];

        Log::info('[MailerSend API] Sending email', [
            'to' => $to->getAddress(),
            'subject' => $email->getSubject(),
            'from' => $from->getAddress(),
        ]);

        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . $this->apiKey,
            'Content-Type' => 'application/json',
            'X-Requested-With' => 'XMLHttpRequest',
        ])->post('https://api.mailersend.com/v1/email', $payload);

        if (!$response->successful()) {
            Log::error('[MailerSend API] Failed to send email', [
                'status' => $response->status(),
                'body' => $response->body(),
                'to' => $to->getAddress(),
            ]);

            throw new \Exception('MailerSend API error: ' . $response->body());
        }

        Log::info('[MailerSend API] Email sent successfully', [
            'to' => $to->getAddress(),
            'message_id' => $response->json()['message_id'] ?? 'unknown',
        ]);
    }

    public function __toString(): string
    {
        return 'mailersend';
    }
}
