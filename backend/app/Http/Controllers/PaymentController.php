<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Models\PaymentTransaction;
use App\Models\Customer;
use App\Models\Product;
use App\Services\FiuuPaymentService;

class PaymentController extends Controller
{
    protected $fiuuService;

    public function __construct(FiuuPaymentService $fiuuService)
    {
        $this->fiuuService = $fiuuService;
    }

    /**
     * Initiate payment transaction
     */
    public function initiate(Request $request)
    {
        try {
            $validated = $request->validate([
                'customer_id' => '', // Changed from exists:customers,id
                'product_id' => '',  // Changed from exists:products,id
                'order_id' => '',
                'amount' => '',
                'payment_method' => '',
                'shop_order_id' => 'nullable',  // ✅ ADD THIS
                'wallet_transaction_id' => 'nullable',  // ✅ ADD THIS
            ]);

            Log::info('Payment initiation request', $validated);

            // Get payment channel code
            $channel = $this->fiuuService->getChannelCode($validated['payment_method']);

            // Create payment transaction record
            $transaction = PaymentTransaction::create([
                'customer_id' => $validated['customer_id'],
                'product_id' => $validated['product_id'],
                'order_id' => $validated['order_id'],
                'amount' => $validated['amount'],
                'currency' => 'MYR',
                'payment_method' => $validated['payment_method'],
                'payment_channel' => $channel,
                'status' => 'pending',
                'shop_order_id' => $validated['shop_order_id'] ?? null,  // ✅ ADD THIS
                'wallet_transaction_id' => $validated['wallet_transaction_id'] ?? null,  // ✅ ADD THIS
                'user_id' => $validated['customer_id'],  // ✅ ADD THIS
            ]);

            Log::info('Payment transaction created', [
                'transaction_id' => $transaction->id,
                'order_id' => $validated['order_id']
            ]);

            // Generate payment URL with vcode
            // You need to get customer details from request
            $customerName = $request->input('customer_name', 'Customer');
            $customerEmail = $request->input('customer_email', 'customer@example.com');
            $customerPhone = $request->input('customer_phone', '0123456789');
            $productName = $request->input('product_name', 'Product');
            $customerCountry = $request->input('customer_country', 'MY');

            $paymentData = $this->fiuuService->generatePaymentData(
                $validated['amount'],
                $validated['order_id'],
                $customerName,
                $customerEmail,
                $customerPhone,
                $productName,
                $customerCountry,
                $validated['payment_method']  // ← Pass the original payment method here
            );

            return response()->json([
                'success' => true,
                'data' => [
                    'transaction_id' => $transaction->id,
                    'payment_url' => $paymentData['payment_url'],
                    'payment_data' => $paymentData['form_data'],
                    'order_id' => $validated['order_id'],
                ]
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Validation failed', ['errors' => $e->errors()]);
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Payment initiation failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Payment initiation failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Handle payment callback from FiuuPay (Webhook - Server-to-Server)
     * This webhook updates the payment_transactions table in Laravel's database
     * AND updates the shop_orders table in Supabase directly
     */
    public function callback(Request $request)
    {
        try {
            Log::info('Payment callback received', $request->all());

            // Verify the callback signature
            $isValid = $this->fiuuService->verifyCallback($request->all());

            if (!$isValid) {
                Log::error('Invalid payment callback signature');
                return response('INVALID SIGNATURE', 400);
            }

            // Get transaction details
            $orderId = $request->input('orderid');
            $status = $request->input('status');
            $tranID = $request->input('tranID');
            $statusCode = $request->input('status_code', $status);

            $transaction = PaymentTransaction::where('order_id', $orderId)->first();

            if (!$transaction) {
                Log::error('Transaction not found: ' . $orderId);
                return response('TRANSACTION NOT FOUND', 404);
            }

            // Update transaction status in Laravel database
            $paymentStatus = ($status == '1' || $statusCode == '00') ? 'completed' : 'failed';

            $transaction->update([
                'status' => $paymentStatus,
                'fiuu_transaction_id' => $tranID,
                'fiuu_status_code' => $statusCode,
                'fiuu_response' => json_encode($request->all()),
                'completed_at' => $paymentStatus === 'completed' ? now() : null,
            ]);

            Log::info("Payment {$paymentStatus} for order: {$orderId}", [
                'shop_order_id' => $transaction->shop_order_id,
                'wallet_transaction_id' => $transaction->wallet_transaction_id
            ]);

            // CRITICAL: Update Supabase shop_orders directly from backend
            // This ensures the order status is updated even if frontend redirect fails
            if ($transaction->shop_order_id) {
                $this->updateSupabaseShopOrder($transaction->shop_order_id, $paymentStatus, $tranID);
            }

            // Update wallet_transaction if this is a topup
            if ($transaction->wallet_transaction_id) {
                $this->updateSupabaseWalletTransaction($transaction->wallet_transaction_id, $paymentStatus);
            }

            // Return success response to FiuuPay
            return response('RECEIVEOK', 200);
        } catch (\Exception $e) {
            Log::error('Payment callback error: ' . $e->getMessage());
            return response('ERROR', 500);
        }
    }

    /**
     * Update shop_order in Supabase directly
     */
    private function updateSupabaseShopOrder($shopOrderId, $paymentStatus, $tranId = null)
    {
        try {
            $supabaseUrl = env('SUPABASE_URL');
            $supabaseKey = env('SUPABASE_SERVICE_KEY');

            if (!$supabaseUrl || !$supabaseKey) {
                Log::warning('[Payment Callback] Supabase config missing, skipping direct update');
                return;
            }

            // Determine the correct status based on payment result
            if ($paymentStatus === 'completed') {
                $orderStatus = 'ready';  // For shop orders
                $orderPaymentStatus = 'paid';
            } else {
                $orderStatus = 'cancelled';
                $orderPaymentStatus = 'failed';
            }

            $updateData = [
                'status' => $orderStatus,
                'payment_status' => $orderPaymentStatus,
                'confirmed_at' => now()->toISOString(),
            ];

            // Generate QR code if payment is successful
            if ($paymentStatus === 'completed') {
                $updateData['qr_code'] = 'WP-' . $shopOrderId . '-' . time();
            }

            Log::info('[Payment Callback] Updating Supabase shop_order', [
                'shop_order_id' => $shopOrderId,
                'update_data' => $updateData
            ]);

            $response = \Illuminate\Support\Facades\Http::withHeaders([
                'apikey' => $supabaseKey,
                'Authorization' => 'Bearer ' . $supabaseKey,
                'Content-Type' => 'application/json',
                'Prefer' => 'return=minimal'
            ])->patch($supabaseUrl . '/rest/v1/shop_orders?id=eq.' . $shopOrderId, $updateData);

            if ($response->successful()) {
                Log::info('[Payment Callback] ✅ Supabase shop_order updated successfully');
            } else {
                Log::error('[Payment Callback] ❌ Failed to update Supabase shop_order', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
            }
        } catch (\Exception $e) {
            Log::error('[Payment Callback] Exception updating Supabase: ' . $e->getMessage());
        }
    }

    /**
     * Update wallet_transaction in Supabase directly
     */
    private function updateSupabaseWalletTransaction($walletTransactionId, $paymentStatus)
    {
        try {
            $supabaseUrl = env('SUPABASE_URL');
            $supabaseKey = env('SUPABASE_SERVICE_KEY');

            if (!$supabaseUrl || !$supabaseKey) {
                Log::warning('[Payment Callback] Supabase config missing, skipping wallet update');
                return;
            }

            $walletStatus = ($paymentStatus === 'completed') ? 'success' : 'failed';

            $updateData = [
                'status' => $walletStatus,
            ];

            Log::info('[Payment Callback] Updating Supabase wallet_transaction', [
                'wallet_transaction_id' => $walletTransactionId,
                'new_status' => $walletStatus
            ]);

            $response = \Illuminate\Support\Facades\Http::withHeaders([
                'apikey' => $supabaseKey,
                'Authorization' => 'Bearer ' . $supabaseKey,
                'Content-Type' => 'application/json',
                'Prefer' => 'return=minimal'
            ])->patch($supabaseUrl . '/rest/v1/wallet_transactions?id=eq.' . $walletTransactionId, $updateData);

            if ($response->successful()) {
                Log::info('[Payment Callback] ✅ Supabase wallet_transaction updated successfully');
            } else {
                Log::error('[Payment Callback] ❌ Failed to update Supabase wallet_transaction', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
            }
        } catch (\Exception $e) {
            Log::error('[Payment Callback] Exception updating wallet transaction: ' . $e->getMessage());
        }
    }

    /**
     * Handle return from payment gateway (User redirect after payment)
     * This redirects the user back to the frontend for UX
     */
    public function return(Request $request)
    {
        try {
            $orderId = $request->input('orderid');
            $status = $request->input('status');
            $statusCode = $request->input('status_code', $status);
            $tranID = $request->input('tranID');

            Log::info('Payment return received', [
                'order_id' => $orderId,
                'status' => $status,
                'status_code' => $statusCode,
                'tran_id' => $tranID
            ]);

            // Get transaction to retrieve metadata
            $transaction = PaymentTransaction::where('order_id', $orderId)->first();

            // Determine payment status
            $paymentStatus = ($status == '1' || $statusCode == '00') ? 'success' : 'failed';

            // Build redirect URL to React app's callback route
            $frontendUrl = config('app.frontend_url');
            $redirectUrl = "{$frontendUrl}/payment/callback?order_id={$orderId}&status={$paymentStatus}&amount={$transaction->amount}";

            // Add transaction ID if available
            if ($tranID) {
                $redirectUrl .= "&tran_id={$tranID}";
            }

            // CRITICAL: Add shop_order_id or wallet_transaction_id so frontend knows which record to update
            if ($transaction->shop_order_id) {
                $redirectUrl .= "&shop_order_id={$transaction->shop_order_id}";
            }
            if ($transaction->wallet_transaction_id) {
                $redirectUrl .= "&wallet_transaction_id={$transaction->wallet_transaction_id}";
            }

            // Add user_id for verification
            if ($transaction->user_id) {
                $redirectUrl .= "&user_id={$transaction->user_id}";
            }

            // Add outlet slug if available for better UX
            if ($transaction && isset($transaction->metadata['outlet_slug'])) {
                $redirectUrl .= "&outlet=" . urlencode($transaction->metadata['outlet_slug']);
            }

            Log::info('Redirecting to frontend', ['url' => $redirectUrl]);

            return redirect($redirectUrl);
        } catch (\Exception $e) {
            Log::error('Payment return error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);

            $frontendUrl = config('app.frontend_url');
            $orderId = $request->input('orderid', 'unknown');
            return redirect("{$frontendUrl}/payment/callback?status=failed&order_id={$orderId}&error=system_error");
        }
    }

    /**
     * Get transaction details by order ID
     */
    public function getTransaction($orderId)
    {
        try {
            $transaction = PaymentTransaction::where('order_id', $orderId)
                ->with(['customer', 'product'])
                ->first();

            if (!$transaction) {
                return response()->json([
                    'success' => false,
                    'message' => 'Transaction not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $transaction
            ], 200);
        } catch (\Exception $e) {
            Log::error('Get transaction error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve transaction'
            ], 500);
        }
    }
}
