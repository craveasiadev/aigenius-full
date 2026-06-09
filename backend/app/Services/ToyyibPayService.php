<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;

class ToyyibPayService
{
    private const BILL_NAME_MAX_LENGTH = 30;

    private string $secretKey;
    private string $categoryCode;
    private string $baseUrl;

    public function __construct()
    {
        $cfg = config('services.toyyibpay', []);

        $this->secretKey = (string) ($cfg['secret'] ?? '');
        $this->categoryCode = (string) ($cfg['category'] ?? '');
        $this->baseUrl = rtrim((string) ($cfg['url'] ?? 'https://dev.toyyibpay.com'), '/');
    }

    public function isConfigured(): bool
    {
        return $this->secretKey !== '' && $this->categoryCode !== '';
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function createBill(array $payload): array
    {
        if (!$this->isConfigured()) {
            throw new RuntimeException('ToyyibPay is not configured. Please set TOYYIBPAY_SECRET and TOYYIBPAY_CATEGORY.');
        }

        $amountInCents = max(1, (int) round(((float) ($payload['amount'] ?? 0)) * 100));
        $phone = preg_replace('/\D+/', '', (string) ($payload['customer_phone'] ?? '')) ?: '0123456789';
        $billName = $this->normalizeBillName((string) ($payload['bill_name'] ?? 'Payment'));
        $billDescription = $this->normalizeBillDescription((string) ($payload['bill_description'] ?? $billName), $billName);

        $requestPayload = [
            'userSecretKey' => $this->secretKey,
            'categoryCode' => $this->categoryCode,
            'billName' => $billName,
            'billDescription' => $billDescription,
            'billPriceSetting' => 1,
            'billPayorInfo' => 1,
            'billAmount' => $amountInCents,
            'billReturnUrl' => (string) ($payload['return_url'] ?? ''),
            'billCallbackUrl' => (string) ($payload['callback_url'] ?? ''),
            'billExternalReferenceNo' => (string) ($payload['external_reference'] ?? ''),
            'billTo' => (string) ($payload['customer_name'] ?? 'Customer'),
            'billEmail' => (string) ($payload['customer_email'] ?? 'customer@example.com'),
            'billPhone' => $phone,
            'billSplitPayment' => 0,
            'billSplitPaymentArgs' => '',
            // Keep channel open so payer can choose available methods on ToyyibPay page.
            // Docs: 0 = all channels, 1 = FPX only, 2 = card only.
            'billPaymentChannel' => 0,
            'billContentEmail' => (string) ($payload['email_content'] ?? 'Thank you for your payment.'),
            'billChargeToCustomer' => 1,
        ];

        $response = Http::asForm()
            ->timeout(30)
            ->post("{$this->baseUrl}/index.php/api/createBill", $requestPayload);

        $json = $response->json();
        $billCode = is_array($json) ? ($json[0]['BillCode'] ?? $json['BillCode'] ?? null) : null;

        if (!$response->successful() || !$billCode) {
            Log::error('[ToyyibPay] Failed to create bill', [
                'status' => $response->status(),
                'response' => $json,
                'payload' => $requestPayload,
            ]);

            throw new RuntimeException('ToyyibPay createBill failed.');
        }

        return [
            'bill_code' => (string) $billCode,
            'payment_url' => "{$this->baseUrl}/{$billCode}",
            'amount_cents' => $amountInCents,
            'raw_response' => $json,
        ];
    }

    private function normalizeBillName(string $rawBillName): string
    {
        $clean = trim($rawBillName);
        if ($clean === '') {
            $clean = 'Payment';
        }

        return (string) Str::of($clean)->squish()->limit(self::BILL_NAME_MAX_LENGTH, '');
    }

    private function normalizeBillDescription(string $rawBillDescription, string $fallback): string
    {
        $clean = trim($rawBillDescription);
        if ($clean === '') {
            $clean = $fallback;
        }

        // Keep payload compact and avoid gateway-side truncation issues.
        return (string) Str::of($clean)->squish()->limit(200, '');
    }

    /**
     * @return array<string, string|null>
     */
    public function parseCallbackData(Request $request): array
    {
        $statusCode = (string) ($request->input('status_id', $request->input('status', '0')));

        $externalReference = $this->firstNonEmpty([
            (string) $request->input('order_id', ''),
            (string) $request->input('external_reference', ''),
            (string) $request->input('billExternalReferenceNo', ''),
            (string) $request->query('order_id', ''),
        ]);

        $billCode = $this->firstNonEmpty([
            (string) $request->input('billcode', ''),
            (string) $request->input('BillCode', ''),
            (string) $request->input('bill_code', ''),
            (string) $request->input('refno', ''),
        ]);

        $transactionId = $this->firstNonEmpty([
            (string) $request->input('refno', ''),
            (string) $request->input('transaction_id', ''),
            (string) $request->input('txn_id', ''),
            $billCode ?? '',
        ]);

        $normalizedStatus = match ($statusCode) {
            '1' => 'success',
            '2' => 'pending',
            '3' => 'failed',
            default => 'failed',
        };

        return [
            'bill_code' => $billCode,
            'external_reference' => $externalReference,
            'transaction_id' => $transactionId,
            'status_code' => $statusCode,
            'status' => $normalizedStatus,
        ];
    }

    /**
     * @param array<int, string> $values
     */
    private function firstNonEmpty(array $values): ?string
    {
        foreach ($values as $value) {
            $trimmed = trim($value);
            if ($trimmed !== '') {
                return $trimmed;
            }
        }

        return null;
    }
}
