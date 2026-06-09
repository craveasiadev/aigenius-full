<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class OTPController extends Controller
{
    /**
     * Send OTP via SMS
     */
    public function sendOTP(Request $request)
    {
        $request->validate([
            'phone' => 'required|string|starts_with:+60'
        ]);

        $phone = $request->input('phone');

        Log::info('[OTP] Send OTP request', ['phone' => $phone]);

        // Check rate limiting (max 3 SMS per hour per phone)
        // Using file cache to avoid database dependency
        $rateLimitKey = 'otp_rate_limit_' . md5($phone);
        $rateLimitFile = storage_path('framework/cache/data/' . $rateLimitKey);

        $attempts = 0;
        if (file_exists($rateLimitFile)) {
            $cacheData = unserialize(file_get_contents($rateLimitFile));
            if ($cacheData['expires_at'] > time()) {
                $attempts = $cacheData['value'];
            }
        }

        if ($attempts >= 3) {
            Log::warning('[OTP] Rate limit exceeded', ['phone' => $phone]);
            return response()->json([
                'error' => 'Rate limit exceeded. Maximum 3 SMS per hour. Please try again later.'
            ], 429);
        }

        // Generate 6-digit OTP
        $otpCode = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);
        $message = "Your WonderStars verification code is: $otpCode. Valid for 5 minutes. Do not share this code.";

        Log::info('[OTP] Generated OTP', ['phone' => $phone, 'code' => $otpCode]);

        // Send SMS via ISMS
        $url = 'https://ww3.isms.com.my/isms_send_all_id.php';

        try {
            $response = Http::asForm()->post($url, [
                'un' => env('ISMS_USERNAME', 'fitriwp'),
                'pwd' => env('ISMS_PASSWORD', 'wp2025'),
                'dstno' => $phone,
                'msg' => $message,
                'type' => '1',
                'agreedterm' => 'YES',
                'sendid' => env('ISMS_SENDER_ID', '63001'),
            ]);

            $responseBody = $response->body();
            Log::info('[OTP] ISMS API Response', [
                'status' => $response->status(),
                'body' => $responseBody
            ]);

            // Check if SMS was sent successfully
            if (strpos($responseBody, '2000') !== false || strpos(strtolower($responseBody), 'success') !== false) {
                // Store OTP in file for 5 minutes
                $otpKey = 'otp_' . md5($phone);
                $otpFile = storage_path('framework/cache/data/' . $otpKey);
                $otpData = [
                    'value' => [
                        'code' => $otpCode,
                        'expires_at' => time() + 300 // 5 minutes
                    ],
                    'expires_at' => time() + 300
                ];

                // Ensure directory exists
                $dir = dirname($otpFile);
                if (!is_dir($dir)) {
                    mkdir($dir, 0755, true);
                }

                file_put_contents($otpFile, serialize($otpData));

                // Increment rate limit counter (expires in 1 hour)
                $rateLimitData = [
                    'value' => $attempts + 1,
                    'expires_at' => time() + 3600 // 1 hour
                ];
                file_put_contents($rateLimitFile, serialize($rateLimitData));

                Log::info('[OTP] SMS sent successfully', ['phone' => $phone]);

                return response()->json([
                    'success' => true,
                    'message' => 'Verification code sent successfully',
                    'expiresIn' => 300
                ]);
            } else {
                Log::error('[OTP] SMS send failed', ['response' => $responseBody]);
                return response()->json([
                    'error' => 'Failed to send SMS: ' . $responseBody
                ], 500);
            }
        } catch (\Exception $e) {
            Log::error('[OTP] Exception sending SMS', [
                'error' => $e->getMessage(),
                'phone' => $phone
            ]);

            return response()->json([
                'error' => 'Failed to send SMS: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Verify OTP
     */
    public function verifyOTP(Request $request)
    {
        $request->validate([
            'phone' => 'required|string|starts_with:+60',
            'code' => 'required|string|size:6'
        ]);

        $phone = $request->input('phone');
        $code = $request->input('code');

        Log::info('[OTP] Verify OTP request', ['phone' => $phone, 'code' => $code]);

        // Get stored OTP from file
        $otpKey = 'otp_' . md5($phone);
        $otpFile = storage_path('framework/cache/data/' . $otpKey);

        if (!file_exists($otpFile)) {
            Log::warning('[OTP] No OTP found', ['phone' => $phone]);
            return response()->json([
                'error' => 'No verification code found. Please request a new code.'
            ], 404);
        }

        $otpData = unserialize(file_get_contents($otpFile));
        $storedData = $otpData['value'];

        // Check if OTP has expired
        if (time() > $storedData['expires_at']) {
            unlink($otpFile); // Delete expired file
            Log::warning('[OTP] OTP expired', ['phone' => $phone]);
            return response()->json([
                'error' => 'Verification code has expired. Please request a new code.'
            ], 400);
        }

        // Verify the code
        if ($storedData['code'] !== $code) {
            Log::warning('[OTP] Invalid OTP', ['phone' => $phone, 'provided' => $code]);
            return response()->json([
                'error' => 'Invalid verification code. Please try again.'
            ], 400);
        }

        // OTP is valid - remove the file
        unlink($otpFile);

        Log::info('[OTP] OTP verified successfully', ['phone' => $phone]);

        return response()->json([
            'success' => true,
            'message' => 'Phone number verified successfully'
        ]);
    }
}
