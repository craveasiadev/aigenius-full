<?php

namespace App\Services;

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;

class FiuuPaymentService
{
    protected $merchantId;
    protected $verifyKey;
    protected $secretKey;
    protected $basePaymentUrl;

    public function __construct()
    {
        $this->merchantId = config('fiuu.merchant_id');
        $this->verifyKey = config('fiuu.verify_key');
        $this->secretKey = config('fiuu.secret_key');
        // Was hard-coded to the sandbox URL — that's why every wpay
        // transaction was routing to sandbox-payment.fiuu.com no
        // matter what the env said. Now reads from config so prod
        // and sandbox are a one-line env flip.
        $this->basePaymentUrl = rtrim(config('fiuu.base_payment_url'), '/');
    }

    /**
     * Generate vcode for payment request
     */
    public function generateVCode($amount, $orderId)
    {
        $string = $amount . $this->merchantId . $orderId . $this->verifyKey;
        return md5($string);
    }

    /**
     * Get payment method path for Fiuu URL
     */
    public function getPaymentMethodPath($paymentMethod)
    {
        $methodMap = [
            'card' => 'index.php',           // Credit/Debit Card
            'credit' => 'index.php',         // Credit Card
            'debit' => 'index.php',          // Debit Card
            'fpx' => 'fpx.php',              // FPX Online Banking
            'grabpay' => 'GrabPay.php',      // GrabPay
            'tng' => 'TNG-EWALLET.php',      // Touch 'n Go eWallet
            'boost' => 'BOOST.php',          // Boost
        ];

        return $methodMap[$paymentMethod] ?? 'index.php';
    }

    /**
     * Get payment channel code (for form data if needed)
     */
    public function getChannelCode($paymentMethod)
    {
        // These are used in the form data
        $channelMap = [
            'card' => 'credit',
            'credit' => 'credit',
            'debit' => 'credit',
            'fpx' => 'fpx',
            'grabpay' => 'GrabPay',
            'tng' => 'TNG-EWALLET',
            'boost' => 'BOOST',
        ];

        return $channelMap[$paymentMethod] ?? 'credit';
    }

    /**
     * Build the payment URL based on payment method
     */
    public function buildPaymentUrl($paymentMethod)
    {
        $methodPath = $this->getPaymentMethodPath($paymentMethod);
        return "{$this->basePaymentUrl}/{$this->merchantId}/{$methodPath}?";
    }

    /**
     * Generate complete payment data including URL and form fields
     */
    public function generatePaymentData($amount, $orderId, $name, $email, $phone, $description, $country, $paymentMethod, $customCallbackUrl = null, $customReturnUrl = null)
    {
        $amountFormatted = number_format($amount, 2, '.', '');
        $vcode = $this->generateVCode($amountFormatted, $orderId);

        // Build the correct payment URL based on payment method
        $paymentUrl = $this->buildPaymentUrl($paymentMethod);

        // Use custom URLs if provided, otherwise default to old payment routes
        $returnUrl = $customReturnUrl ?? config('app.url') . '/payments/return';
        $callbackUrl = $customCallbackUrl ?? config('app.url') . '/payments/callback';

        $formData = [
            'MerchantCode' => $this->merchantId,
            'amount' => $amountFormatted,
            'orderid' => $orderId,
            'bill_name' => $name,
            'bill_email' => $email,
            'bill_mobile' => $phone,
            'bill_desc' => $description,
            'country' => $country,
            'vcode' => $vcode,
            'currency' => 'MYR',
            'returnurl' => $returnUrl,
            'callbackurl' => $callbackUrl,
        ];

        Log::info('Payment data generated', [
            'payment_method' => $paymentMethod,
            'payment_url' => $paymentUrl,
            'order_id' => $orderId,
            'amount' => $amountFormatted,
            'return_url' => $returnUrl,
            'callback_url' => $callbackUrl,
        ]);

        return [
            'payment_url' => $paymentUrl,
            'form_data' => $formData,
        ];
    }

    /**
     * Verify callback signature from FiuuPay
     */
    public function verifyCallback($data)
    {
        try {
            $tranID = $data['tranID'] ?? '';
            $orderId = $data['orderid'] ?? '';
            $status = $data['status'] ?? '';
            $domain = $data['domain'] ?? '';
            $amount = $data['amount'] ?? '';
            $currency = $data['currency'] ?? '';
            $appcode = $data['appcode'] ?? '';
            $paydate = $data['paydate'] ?? '';
            $skey = $data['skey'] ?? '';

            $string = $tranID . $orderId . $status . $domain . $amount . $currency . $appcode . $paydate . $this->secretKey;
            $expectedSkey = md5($string);

            Log::info('Callback verification', [
                'received_skey' => $skey,
                'expected_skey' => $expectedSkey,
                'order_id' => $orderId
            ]);

            return $skey === $expectedSkey;
        } catch (\Exception $e) {
            Log::error('Callback verification error: ' . $e->getMessage());
            return false;
        }
    }
}
