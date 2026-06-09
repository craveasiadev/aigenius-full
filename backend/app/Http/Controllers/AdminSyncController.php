<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Models\WPayTransaction;

class AdminSyncController extends Controller
{
    protected function resolveAppSource(Request $request): string
    {
        $fallback = strtolower((string) config('wpay.default_app_source', 'wonderstar'));
        $raw = $request->input('app_source') ?? $request->query('app_source') ?? $request->header('X-App-Source');
        $normalized = strtolower(trim((string) ($raw ?? '')));

        if ($normalized === '') {
            return $fallback;
        }

        $normalized = preg_replace('/[^a-z0-9._-]/', '', $normalized) ?: '';

        return $normalized !== '' ? $normalized : $fallback;
    }

    /**
     * Sync payment status from WPay transactions to Supabase shop_orders
     * This reconciles any mismatched payment_status between Laravel WPay and Supabase
     */
    public function syncPaymentStatus(Request $request)
    {
        try {
            $appSource = $this->resolveAppSource($request);
            $supabaseUrl = env('SUPABASE_URL');
            $supabaseKey = env('SUPABASE_SERVICE_KEY');

            if (!$supabaseUrl || !$supabaseKey) {
                return response()->json([
                    'success' => false,
                    'error' => 'Supabase not configured'
                ], 500);
            }

            // Get all pending orders from Supabase
            $pendingResponse = Http::withHeaders([
                'apikey' => $supabaseKey,
                'Authorization' => 'Bearer ' . $supabaseKey,
            ])->get("{$supabaseUrl}/rest/v1/shop_orders", [
                'payment_status' => 'eq.pending',
                'select' => 'id,order_number,payment_status,created_at'
            ]);

            if (!$pendingResponse->successful()) {
                return response()->json([
                    'success' => false,
                    'error' => 'Failed to fetch pending orders from Supabase'
                ], 500);
            }

            $pendingOrders = $pendingResponse->json();
            $updated = 0;
            $notFound = 0;
            $stillPending = 0;

            foreach ($pendingOrders as $order) {
                $orderNumber = $order['order_number'];

                // Check WPay transaction status
                $wpayTxn = WPayTransaction::where('order_id', $orderNumber)
                    ->where('app_source', $appSource)
                    ->first();

                if (!$wpayTxn) {
                    $notFound++;
                    continue;
                }

                // If WPay shows success but Supabase shows pending, update Supabase
                if ($wpayTxn->status === 'success') {
                    $updateResponse = Http::withHeaders([
                        'apikey' => $supabaseKey,
                        'Authorization' => 'Bearer ' . $supabaseKey,
                        'Content-Type' => 'application/json',
                        'Prefer' => 'return=minimal'
                    ])->patch("{$supabaseUrl}/rest/v1/shop_orders?id=eq.{$order['id']}", [
                        'payment_status' => 'paid',
                        'status' => 'ready',
                        'confirmed_at' => now()->toISOString(),
                    ]);

                    if ($updateResponse->successful()) {
                        $updated++;
                        Log::info('[AdminSync] Updated payment status to paid', [
                            'order_id' => $order['id'],
                            'order_number' => $orderNumber
                        ]);
                    }
                } else {
                    $stillPending++;
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Payment status sync completed',
                'total_pending' => count($pendingOrders),
                'updated_to_paid' => $updated,
                'still_pending' => $stillPending,
                'not_found_in_wpay' => $notFound
            ]);

        } catch (\Exception $e) {
            Log::error('[AdminSync] Exception during payment sync', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Sync old wallet topups to shop_orders table
     * This is a one-time migration to create shop_order records for old topups
     */
    public function syncOldTopups(Request $request)
    {
        try {
            $appSource = $this->resolveAppSource($request);
            $supabaseUrl = env('SUPABASE_URL');
            $supabaseKey = env('SUPABASE_SERVICE_KEY');

            if (!$supabaseUrl || !$supabaseKey) {
                return response()->json([
                    'success' => false,
                    'error' => 'Supabase not configured'
                ], 500);
            }

            // Get all wallet_transactions from Supabase
            $response = Http::withHeaders([
                'apikey' => $supabaseKey,
                'Authorization' => 'Bearer ' . $supabaseKey,
            ])->get("{$supabaseUrl}/rest/v1/wallet_transactions", [
                'transaction_type' => 'eq.topup',
                'status' => 'eq.success'
            ]);

            if (!$response->successful()) {
                return response()->json([
                    'success' => false,
                    'error' => 'Failed to fetch wallet transactions'
                ], 500);
            }

            $walletTransactions = $response->json();
            $synced = 0;
            $skipped = 0;
            $errors = [];

            foreach ($walletTransactions as $txn) {
                $orderId = $txn['metadata']['order_number'] ?? null;

                if (!$orderId) {
                    $skipped++;
                    $errors[] = "Wallet transaction {$txn['id']} missing order_number";
                    continue;
                }

                // Check if shop_order already exists
                $checkResponse = Http::withHeaders([
                    'apikey' => $supabaseKey,
                    'Authorization' => 'Bearer ' . $supabaseKey,
                ])->get("{$supabaseUrl}/rest/v1/shop_orders", [
                    'order_number' => 'eq.' . $orderId
                ]);

                if ($checkResponse->successful() && count($checkResponse->json()) > 0) {
                    $skipped++;
                    continue; // Already exists
                }

                // Get WPay transaction details from Laravel
                $wpayTxn = WPayTransaction::where('order_id', $orderId)
                    ->where('app_source', $appSource)
                    ->first();

                if (!$wpayTxn) {
                    $skipped++;
                    $errors[] = "WPay transaction not found for order {$orderId}";
                    continue;
                }

                // Create shop_order
                $amount = $txn['amount'] ?? 0;
                $bonusAmount = $txn['metadata']['bonus_amount'] ?? 0;

                $shopOrderData = [
                    'user_id' => $txn['user_id'],
                    'outlet_id' => null,
                    'order_number' => $orderId,
                    'items' => [
                        [
                            'product_id' => 'wpay-topup',
                            'product_name' => "W-Balance Top-up RM{$amount}",
                            'quantity' => 1,
                            'unit_price' => (float) $amount,
                            'total_price' => (float) $amount,
                        ]
                    ],
                    'subtotal' => (float) $amount,
                    'discount_amount' => 0,
                    'bonus_discount_amount' => 0,
                    'permanent_discount_amount' => 0,
                    'gross_sales' => (float) $amount,
                    'total_amount' => (float) $amount,
                    'payment_method' => 'card', // Use 'card' instead of 'online' to match Supabase constraint
                    'payment_type' => 'topup',
                    'status' => 'completed',
                    'payment_status' => 'paid',
                    'created_at' => $txn['created_at'],
                    'metadata' => [
                        'is_topup' => true,
                        'wpay_order_id' => $orderId,
                        'wpay_transaction_id' => $wpayTxn->id,
                        'topup_amount' => (float) $amount,
                        'bonus_awarded' => (float) $bonusAmount,
                        'stars_awarded' => $txn['metadata']['base_stars'] ?? 0,
                        'completed_at' => $txn['created_at'],
                        'retroactive_sync' => true,
                    ],
                ];

                $createResponse = Http::withHeaders([
                    'apikey' => $supabaseKey,
                    'Authorization' => 'Bearer ' . $supabaseKey,
                    'Content-Type' => 'application/json',
                    'Prefer' => 'return=representation',
                ])->post("{$supabaseUrl}/rest/v1/shop_orders", $shopOrderData);

                if ($createResponse->successful()) {
                    $synced++;
                    Log::info('[AdminSync] Created shop_order for old topup', ['order_id' => $orderId]);
                } else {
                    $errors[] = "Failed to create shop_order for {$orderId}: " . $createResponse->body();
                    Log::error('[AdminSync] Failed to create shop_order', [
                        'order_id' => $orderId,
                        'status' => $createResponse->status(),
                        'body' => $createResponse->body()
                    ]);
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Old topups sync completed',
                'synced' => $synced,
                'skipped' => $skipped,
                'total_processed' => count($walletTransactions),
                'errors' => $errors
            ]);

        } catch (\Exception $e) {
            Log::error('[AdminSync] Exception during sync', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
