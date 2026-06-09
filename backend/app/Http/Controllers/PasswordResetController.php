<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use App\Mail\PasswordResetMail;

class PasswordResetController extends Controller
{
    /**
     * Send password reset email
     */
    public function sendResetLink(Request $request)
    {
        $request->validate([
            'email' => 'required|email'
        ]);

        $email = $request->input('email');

        Log::info('[Password Reset] Reset request', ['email' => $email]);

        try {
            // Check if user exists in Supabase
            $supabaseUrl = env('SUPABASE_URL');
            $supabaseKey = env('SUPABASE_SERVICE_KEY');

            Log::info('[Password Reset] Supabase Config Check', [
                'supabase_url' => $supabaseUrl ? 'SET' : 'MISSING',
                'supabase_key' => $supabaseKey ? 'SET (length: ' . strlen($supabaseKey) . ')' : 'MISSING',
                'email' => $email
            ]);

            if (!$supabaseUrl || !$supabaseKey) {
                Log::error('[Password Reset] Supabase configuration missing');
                throw new \Exception('Supabase configuration missing');
            }

            // Build the API endpoint
            $apiEndpoint = $supabaseUrl . '/rest/v1/users';

            Log::info('[Password Reset] Querying Supabase', [
                'endpoint' => $apiEndpoint,
                'email_filter' => 'eq.' . $email
            ]);

            // Query Supabase to check if user exists
            $response = Http::withHeaders([
                'apikey' => $supabaseKey,
                'Authorization' => 'Bearer ' . $supabaseKey,
                'Content-Type' => 'application/json',
                'Prefer' => 'return=representation'
            ])->get($apiEndpoint, [
                'email' => 'eq.' . $email,
                'select' => 'id,email,name,auth_id'  // Added auth_id - needed for password reset
            ]);

            Log::info('[Password Reset] Supabase Response', [
                'status' => $response->status(),
                'headers' => $response->headers(),
                'body' => $response->body(),
                'successful' => $response->successful()
            ]);

            if (!$response->successful()) {
                Log::error('[Password Reset] Supabase query failed', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                    'headers' => $response->headers()
                ]);
                throw new \Exception('Failed to verify user: HTTP ' . $response->status());
            }

            $users = $response->json();

            Log::info('[Password Reset] Users found', [
                'count' => is_array($users) ? count($users) : 0,
                'users' => $users
            ]);

            if (empty($users)) {
                // Don't reveal if user exists or not for security
                Log::info('[Password Reset] User not found', ['email' => $email]);
                return response()->json([
                    'success' => true,
                    'message' => 'If an account exists with this email, you will receive a password reset link.'
                ]);
            }

            $user = $users[0];

            // Generate reset token (valid for 1 hour)
            $resetToken = Str::random(64);
            $expiresAt = time() + 3600; // 1 hour

            // Store reset token in file cache
            $tokenKey = 'password_reset_' . md5($email);
            $tokenFile = storage_path('framework/cache/data/' . $tokenKey);
            $tokenData = [
                'value' => [
                    'token' => $resetToken,
                    'email' => $email,
                    'user_id' => $user['id'],
                    'auth_id' => $user['auth_id'],  // Store auth_id for Supabase Auth API
                    'expires_at' => $expiresAt
                ],
                'expires_at' => $expiresAt
            ];

            // Ensure directory exists
            $dir = dirname($tokenFile);
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }

            file_put_contents($tokenFile, serialize($tokenData));

            // Generate reset URL
            $resetUrl = config('app.frontend_url') . '/reset-password?token=' . $resetToken . '&email=' . urlencode($email);

            // Log email configuration for debugging
            Log::info('[Password Reset] Email Configuration', [
                'from_address' => config('mail.from.address'),
                'from_name' => config('mail.from.name'),
                'to_email' => $email,
                'mailer' => config('mail.default'),
                'host' => config('mail.mailers.smtp.host'),
            ]);

            // Send email via MailerSend
            try {
                Mail::to($email)->send(new PasswordResetMail($user['name'] ?? 'User', $resetUrl));
                Log::info('[Password Reset] Reset email sent successfully', ['email' => $email]);
            } catch (\Exception $mailError) {
                Log::error('[Password Reset] Mail sending failed', [
                    'error' => $mailError->getMessage(),
                    'trace' => $mailError->getTraceAsString()
                ]);
                throw new \Exception('Failed to send email: ' . $mailError->getMessage());
            }

            return response()->json([
                'success' => true,
                'message' => 'Password reset link sent successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('[Password Reset] Exception', [
                'error' => $e->getMessage(),
                'email' => $email
            ]);

            return response()->json([
                'error' => 'Failed to send reset email: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reset password with token
     */
    public function resetPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'token' => 'required|string',
            'password' => 'required|string|min:6'
        ]);

        $email = $request->input('email');
        $token = $request->input('token');
        $newPassword = $request->input('password');

        Log::info('[Password Reset] Reset password attempt', ['email' => $email]);

        try {
            // Get stored token from file
            $tokenKey = 'password_reset_' . md5($email);
            $tokenFile = storage_path('framework/cache/data/' . $tokenKey);

            if (!file_exists($tokenFile)) {
                Log::warning('[Password Reset] No token found', ['email' => $email]);
                return response()->json([
                    'error' => 'Invalid or expired reset token'
                ], 400);
            }

            $tokenData = unserialize(file_get_contents($tokenFile));
            $storedData = $tokenData['value'];

            // Check if token has expired
            if (time() > $storedData['expires_at']) {
                unlink($tokenFile); // Delete expired file
                Log::warning('[Password Reset] Token expired', ['email' => $email]);
                return response()->json([
                    'error' => 'Reset token has expired. Please request a new one.'
                ], 400);
            }

            // Verify the token
            if ($storedData['token'] !== $token || $storedData['email'] !== $email) {
                Log::warning('[Password Reset] Invalid token', ['email' => $email]);
                return response()->json([
                    'error' => 'Invalid reset token'
                ], 400);
            }

            // Update password in Supabase using Admin API
            $supabaseUrl = env('SUPABASE_URL');
            $supabaseKey = env('SUPABASE_SERVICE_KEY');

            if (!$supabaseUrl || !$supabaseKey) {
                throw new \Exception('Supabase configuration missing');
            }

            // Use Supabase Admin API to update user password
            // IMPORTANT: Must use auth_id, not database id
            $authId = $storedData['auth_id'] ?? $storedData['user_id'];  // Fallback for old tokens

            Log::info('[Password Reset] Updating password', [
                'auth_id' => $authId,
                'email' => $email
            ]);

            $response = Http::withHeaders([
                'apikey' => $supabaseKey,
                'Authorization' => 'Bearer ' . $supabaseKey,
                'Content-Type' => 'application/json'
            ])->put($supabaseUrl . '/auth/v1/admin/users/' . $authId, [
                'password' => $newPassword
            ]);

            if (!$response->successful()) {
                Log::error('[Password Reset] Supabase password update failed', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                throw new \Exception('Failed to update password');
            }

            // Delete the used token
            unlink($tokenFile);

            Log::info('[Password Reset] Password reset successful', ['email' => $email]);

            return response()->json([
                'success' => true,
                'message' => 'Password reset successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('[Password Reset] Exception resetting password', [
                'error' => $e->getMessage(),
                'email' => $email
            ]);

            return response()->json([
                'error' => 'Failed to reset password: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Verify reset token (optional - for frontend validation)
     */
    public function verifyToken(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'token' => 'required|string'
        ]);

        $email = $request->input('email');
        $token = $request->input('token');

        try {
            $tokenKey = 'password_reset_' . md5($email);
            $tokenFile = storage_path('framework/cache/data/' . $tokenKey);

            if (!file_exists($tokenFile)) {
                return response()->json([
                    'valid' => false,
                    'message' => 'Invalid or expired token'
                ]);
            }

            $tokenData = unserialize(file_get_contents($tokenFile));
            $storedData = $tokenData['value'];

            // Check if token has expired
            if (time() > $storedData['expires_at']) {
                unlink($tokenFile);
                return response()->json([
                    'valid' => false,
                    'message' => 'Token has expired'
                ]);
            }

            // Verify the token
            if ($storedData['token'] !== $token || $storedData['email'] !== $email) {
                return response()->json([
                    'valid' => false,
                    'message' => 'Invalid token'
                ]);
            }

            return response()->json([
                'valid' => true,
                'message' => 'Token is valid'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'valid' => false,
                'message' => 'Error verifying token'
            ], 500);
        }
    }
}
