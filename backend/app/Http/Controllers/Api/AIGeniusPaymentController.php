<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AIGeniusPurchase;
use App\Models\AIpreneurPricingPackage;
use App\Models\AIpreneurReward;
use App\Models\GeniusProfile;
use App\Services\AIpreneurPricingService;
use App\Services\FiuuPaymentService;
use App\Services\PaymentGatewayModeService;
use App\Services\ToyyibPayService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * AI Genius Payment Controller
 *
 * Handles AI Token and Coin purchases for the AI Genius platform.
 * Separated from the main PaymentController to avoid conflicts with other projects.
 */
class AIGeniusPaymentController extends Controller
{
    protected FiuuPaymentService $fiuuService;
    protected ToyyibPayService $toyyibPayService;
    protected PaymentGatewayModeService $gatewayModeService;
    protected AIpreneurPricingService $pricingService;

    public function __construct(
        FiuuPaymentService $fiuuService,
        ToyyibPayService $toyyibPayService,
        PaymentGatewayModeService $gatewayModeService,
        AIpreneurPricingService $pricingService
    )
    {
        $this->fiuuService = $fiuuService;
        $this->toyyibPayService = $toyyibPayService;
        $this->gatewayModeService = $gatewayModeService;
        $this->pricingService = $pricingService;
    }

    /**
     * Initiate AI Genius payment
     */
    public function initiate(Request $request)
    {
        try {
            $validated = $request->validate([
                'student_id' => 'required|uuid|exists:genius_profiles,id',
                'order_id' => 'required|string',
                'amount' => 'nullable|numeric|min:0.01',
                'payment_method' => 'required|string|in:fpx,card,tng,grabpay,boost',
                'product_id' => 'nullable|string|max:120',
                'package_type' => 'nullable|string|in:ai_tokens,coins',
                'package_name' => 'nullable|string|max:255',
                'package_amount' => 'nullable|integer|min:1',
                'customer_name' => 'required|string',
                'customer_email' => 'required|email',
                'frontend_url' => 'required|string',
            ]);

            $package = $this->resolveRequestedPackage($validated);
            if (!$package) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid or inactive package.',
                ], 422);
            }

            $normalizedAmount = (float) $package->price_rm;
            $normalizedPackageAmount = (int) $package->tokens_amount + (int) $package->bonus_tokens;
            $normalizedPackageName = $package->name;
            $normalizedPackageType = 'ai_tokens';

            if (
                array_key_exists('amount', $validated)
                && $validated['amount'] !== null
                && abs((float) $validated['amount'] - $normalizedAmount) > 0.001
            ) {
                return response()->json([
                    'success' => false,
                    'message' => 'Price mismatch for selected package.',
                ], 422);
            }

            if (
                array_key_exists('package_amount', $validated)
                && $validated['package_amount'] !== null
                && (int) $validated['package_amount'] !== $normalizedPackageAmount
            ) {
                return response()->json([
                    'success' => false,
                    'message' => 'Token amount mismatch for selected package.',
                ], 422);
            }

            Log::info('[AIGenius Payment] Initiation request', array_merge($validated, [
                'resolved_package_code' => $package->code,
                'resolved_amount' => $normalizedAmount,
                'resolved_package_amount' => $normalizedPackageAmount,
            ]));

            // Get current balance
            $reward = AIpreneurReward::where('student_id', $validated['student_id'])->first();
            if ($reward && (int) ($reward->coins ?? 0) > 0) {
                $reward->ai_tokens = (int) ($reward->ai_tokens ?? 0) + (int) $reward->coins;
                $reward->coins = 0;
                $reward->save();
                $reward->refresh();
            }
            // Legacy "coins" package type is now treated as AI tokens.
            $currentBalance = $reward->ai_tokens ?? 0;

            // Create purchase record
            $purchase = AIGeniusPurchase::create([
                'student_id' => $validated['student_id'],
                'order_id' => $validated['order_id'],
                'package_type' => $normalizedPackageType,
                'package_name' => $normalizedPackageName,
                'package_amount' => $normalizedPackageAmount,
                'amount_paid' => $normalizedAmount,
                'payment_method' => $validated['payment_method'],
                'status' => 'pending',
                'balance_before' => $currentBalance,
            ]);

            Log::info('[AIGenius Payment] Purchase record created', [
                'purchase_id' => $purchase->id,
                'order_id' => $validated['order_id']
            ]);

            $gatewayMode = $this->gatewayModeService->getMode();

            if ($gatewayMode === PaymentGatewayModeService::MODE_SANDBOX) {
                $callbackUrl = config('app.url') . '/aigenius/payments/callback?gateway=toyyibpay&order_id=' . urlencode($validated['order_id']);
                $returnUrl = config('app.url') . '/aigenius/payments/return?gateway=toyyibpay&order_id=' . urlencode($validated['order_id']) . '&frontend_url=' . urlencode($validated['frontend_url']);

                $billData = $this->toyyibPayService->createBill([
                    'amount' => $normalizedAmount,
                    'payment_method' => $validated['payment_method'],
                    'bill_name' => $normalizedPackageName,
                    'bill_description' => $normalizedPackageName,
                    'external_reference' => $validated['order_id'],
                    'customer_name' => $validated['customer_name'],
                    'customer_email' => $validated['customer_email'],
                    'customer_phone' => $request->input('customer_phone', '0123456789'),
                    'callback_url' => $callbackUrl,
                    'return_url' => $returnUrl,
                ]);

                $purchase->update([
                    'fiuu_transaction_id' => $billData['bill_code'],
                    'fiuu_status_code' => 'PENDING',
                    'fiuu_response' => [
                        'provider' => 'toyyibpay',
                        'gateway_mode' => $gatewayMode,
                        'create_bill_response' => $billData['raw_response'],
                    ],
                ]);

                return response()->json([
                    'success' => true,
                    'data' => [
                        'purchase_id' => $purchase->id,
                        'payment_url' => $billData['payment_url'],
                        'payment_data' => (object) [],
                        'order_id' => $validated['order_id'],
                        'provider' => 'toyyibpay',
                        'gateway_mode' => $gatewayMode,
                    ]
                ], 201);
            }

            // Production mode uses Fiuu.
            $paymentData = $this->fiuuService->generatePaymentData(
                $normalizedAmount,
                $validated['order_id'],
                $validated['customer_name'],
                $validated['customer_email'],
                $request->input('customer_phone', '0123456789'),
                $normalizedPackageName,
                'MY',
                $validated['payment_method'],
                config('app.url') . '/aigenius/payments/callback',
                config('app.url') . '/aigenius/payments/return?frontend_url=' . urlencode($validated['frontend_url'])
            );

            return response()->json([
                'success' => true,
                'data' => [
                    'purchase_id' => $purchase->id,
                    'payment_url' => $paymentData['payment_url'],
                    'payment_data' => $paymentData['form_data'],
                    'order_id' => $validated['order_id'],
                    'provider' => 'fiuu',
                    'gateway_mode' => $gatewayMode,
                ]
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('[AIGenius Payment] Validation failed', ['errors' => $e->errors()]);
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('[AIGenius Payment] Initiation failed: ' . $e->getMessage(), [
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
     * Handle Fiuu callback (server-to-server webhook)
     */
    public function callback(Request $request)
    {
        try {
            Log::info('[AIGenius Payment] Callback received', $request->all());
            $gateway = $this->resolveGateway($request);

            if ($gateway === 'toyyibpay') {
                $callbackData = $this->toyyibPayService->parseCallbackData($request);
                $orderId = $callbackData['external_reference'] ?? $request->query('order_id');
                $billCode = $callbackData['bill_code'];

                $purchase = null;
                if ($orderId) {
                    $purchase = AIGeniusPurchase::where('order_id', $orderId)->first();
                }
                if (!$purchase && $billCode) {
                    $purchase = AIGeniusPurchase::where('fiuu_transaction_id', $billCode)->latest()->first();
                }

                if (!$purchase) {
                    Log::error('[AIGenius Payment][ToyyibPay] Purchase not found', [
                        'order_id' => $orderId,
                        'bill_code' => $billCode,
                    ]);
                    return response('PURCHASE NOT FOUND', 404);
                }

                $paymentStatus = match ($callbackData['status']) {
                    'success' => 'completed',
                    'pending' => 'pending',
                    default => 'failed',
                };

                $alreadyCompleted = $purchase->status === 'completed';
                if ($alreadyCompleted) {
                    Log::info('[AIGenius Payment][ToyyibPay] Callback ignored (already completed)', [
                        'order_id' => $purchase->order_id,
                        'bill_code' => $billCode,
                    ]);
                    return response('OK', 200);
                }

                $purchase->update([
                    'status' => $paymentStatus,
                    'fiuu_transaction_id' => $billCode ?: $purchase->fiuu_transaction_id,
                    'fiuu_status_code' => $callbackData['status_code'] ?: $purchase->fiuu_status_code,
                    'fiuu_response' => array_merge($request->all(), ['provider' => 'toyyibpay']),
                    'completed_at' => $paymentStatus === 'completed'
                        ? ($purchase->completed_at ?? now())
                        : null,
                ]);

                if ($paymentStatus === 'completed') {
                    $this->updateStudentBalance($purchase->fresh());
                }

                Log::info('[AIGenius Payment][ToyyibPay] Callback processed', [
                    'order_id' => $purchase->order_id,
                    'status' => $paymentStatus,
                    'bill_code' => $billCode,
                ]);

                return response('OK', 200);
            }

            // Default gateway: Fiuu
            $isValid = $this->fiuuService->verifyCallback($request->all());
            if (!$isValid) {
                Log::error('[AIGenius Payment] Invalid callback signature');
                return response('INVALID SIGNATURE', 400);
            }

            $orderId = $request->input('orderid');
            $status = $request->input('status');
            $tranID = $request->input('tranID');
            $statusCode = $request->input('status_code', $status);

            $purchase = AIGeniusPurchase::where('order_id', $orderId)->first();
            if (!$purchase) {
                Log::error('[AIGenius Payment] Purchase not found: ' . $orderId);
                return response('PURCHASE NOT FOUND', 404);
            }

            $paymentStatus = ($status == '1' || $statusCode == '00') ? 'completed' : 'failed';
            $alreadyCompleted = $purchase->status === 'completed';
            if ($alreadyCompleted) {
                Log::info('[AIGenius Payment] Callback ignored (already completed)', [
                    'order_id' => $orderId,
                ]);
                return response('RECEIVEOK', 200);
            }

            $purchase->update([
                'status' => $paymentStatus,
                'fiuu_transaction_id' => $tranID,
                'fiuu_status_code' => $statusCode,
                'fiuu_response' => $request->all(),
                'completed_at' => $paymentStatus === 'completed'
                    ? ($purchase->completed_at ?? now())
                    : null,
            ]);

            Log::info("[AIGenius Payment] Payment {$paymentStatus} for order: {$orderId}");

            if ($paymentStatus === 'completed') {
                $this->updateStudentBalance($purchase->fresh());
            }

            return response('RECEIVEOK', 200);

        } catch (\Exception $e) {
            Log::error('[AIGenius Payment] Callback error: ' . $e->getMessage());
            return response('ERROR', 500);
        }
    }

    /**
     * Handle return from payment gateway (user redirect)
     */
    public function return(Request $request)
    {
        try {
            $gateway = $this->resolveGateway($request);
            $frontendUrl = $request->input('frontend_url', config('app.frontend_url'));

            $orderId = null;
            $paymentStatus = 'failed';
            $tranID = null;
            $purchase = null;

            if ($gateway === 'toyyibpay') {
                $callbackData = $this->toyyibPayService->parseCallbackData($request);
                $orderId = $callbackData['external_reference'] ?? $request->query('order_id');
                $tranID = $callbackData['transaction_id'] ?? $callbackData['bill_code'];
                $paymentStatus = $callbackData['status'] === 'success' ? 'success' : 'failed';

                if ($orderId) {
                    $purchase = AIGeniusPurchase::where('order_id', $orderId)->first();
                }
                if (!$purchase && !empty($callbackData['bill_code'])) {
                    $purchase = AIGeniusPurchase::where('fiuu_transaction_id', $callbackData['bill_code'])->latest()->first();
                }

                if ($purchase && $paymentStatus === 'success' && $purchase->status !== 'completed') {
                    $purchase->update([
                        'status' => 'completed',
                        'fiuu_transaction_id' => $callbackData['bill_code'] ?: $purchase->fiuu_transaction_id,
                        'fiuu_status_code' => $callbackData['status_code'] ?: $purchase->fiuu_status_code,
                        'fiuu_response' => array_merge($request->all(), ['provider' => 'toyyibpay', 'source' => 'return']),
                        'completed_at' => $purchase->completed_at ?? now(),
                    ]);

                    $this->updateStudentBalance($purchase->fresh());
                }
            } else {
                $orderId = $request->input('orderid');
                $status = $request->input('status');
                $statusCode = $request->input('status_code', $status);
                $tranID = $request->input('tranID');
                $paymentStatus = ($status == '1' || $statusCode == '00') ? 'success' : 'failed';

                $purchase = AIGeniusPurchase::where('order_id', $orderId)->first();
                if ($purchase && $paymentStatus === 'success' && $purchase->status !== 'completed') {
                    $purchase->update([
                        'status' => 'completed',
                        'fiuu_transaction_id' => $tranID ?: $purchase->fiuu_transaction_id,
                        'fiuu_status_code' => $statusCode ?? '00',
                        'fiuu_response' => $request->all(),
                        'completed_at' => $purchase->completed_at ?? now(),
                    ]);

                    $this->updateStudentBalance($purchase->fresh());
                }
            }

            Log::info('[AIGenius Payment] Return received', [
                'gateway' => $gateway,
                'order_id' => $orderId,
                'status' => $paymentStatus,
                'frontend_url' => $frontendUrl,
            ]);

            $safeOrderId = $orderId ?? 'unknown';
            $redirectUrl = "{$frontendUrl}/payment/callback?order_id={$safeOrderId}&status={$paymentStatus}";

            if ($purchase) {
                $redirectUrl .= "&amount={$purchase->amount_paid}";
                $redirectUrl .= "&package_type={$purchase->package_type}";
                $redirectUrl .= "&package_amount={$purchase->package_amount}";
            }

            if ($tranID) {
                $redirectUrl .= "&tran_id={$tranID}";
            }

            return redirect($redirectUrl);

        } catch (\Exception $e) {
            Log::error('[AIGenius Payment] Return error: ' . $e->getMessage());

            $frontendUrl = $request->input('frontend_url', config('app.frontend_url'));
            $orderId = $request->input('orderid', $request->query('order_id', 'unknown'));

            return redirect("{$frontendUrl}/payment/callback?status=failed&order_id={$orderId}&error=system_error");
        }
    }

    /**
     * Resolve package from request payload.
     * Prefers canonical package code (`product_id`) and falls back to legacy package_name matching.
     */
    private function resolveRequestedPackage(array $validated): ?AIpreneurPricingPackage
    {
        $requestedCode = trim((string) ($validated['product_id'] ?? ''));
        if ($requestedCode !== '') {
            return $this->pricingService->getPackageByCode($requestedCode);
        }

        $requestedName = strtolower(trim((string) ($validated['package_name'] ?? '')));
        if ($requestedName !== '') {
            $allActive = $this->pricingService->getActivePackages();
            return $allActive->first(function (AIpreneurPricingPackage $candidate) use ($requestedName) {
                $candidateName = strtolower(trim((string) $candidate->name));
                return $requestedName === $candidateName
                    || str_starts_with($requestedName, $candidateName . ' -');
            });
        }

        return null;
    }

    /**
     * Resolve gateway provider from callback/return payload.
     */
    private function resolveGateway(Request $request): string
    {
        $explicit = strtolower((string) $request->input('gateway', $request->query('gateway', '')));
        if (in_array($explicit, ['fiuu', 'toyyibpay'], true)) {
            return $explicit;
        }

        if ($request->has('billcode') || $request->has('BillCode') || $request->has('status_id') || $request->has('refno')) {
            return 'toyyibpay';
        }

        return 'fiuu';
    }

    /**
     * Update student's AI tokens or coins balance
     */
    private function updateStudentBalance(AIGeniusPurchase $purchase)
    {
        try {
            $reward = AIpreneurReward::where('student_id', $purchase->student_id)->first();

            if (!$reward) {
                Log::error('[AIGenius Payment] Reward record not found for student: ' . $purchase->student_id);
                return;
            }

            $previousBalance = $reward->ai_tokens ?? 0;

            // Add purchased balance as AI tokens (including legacy "coins" packages).
            $reward->addAITokens($purchase->package_amount);
            $newBalance = $reward->ai_tokens ?? 0;

            // Update balance_after on purchase record
            $purchase->update(['balance_after' => $newBalance]);

            Log::info('[AIGenius Payment] Balance updated', [
                'student_id' => $purchase->student_id,
                'package_type' => $purchase->package_type,
                'amount_added' => $purchase->package_amount,
                'previous_balance' => $previousBalance,
                'new_balance' => $newBalance
            ]);

        } catch (\Exception $e) {
            Log::error('[AIGenius Payment] Error updating balance: ' . $e->getMessage());
        }
    }

    /**
     * Get purchase history for a student
     */
    public function history(Request $request)
    {
        try {
            $studentId = $request->input('student_id');

            if (!$studentId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Student ID is required'
                ], 400);
            }

            $purchases = AIGeniusPurchase::where('student_id', $studentId)
                ->orderBy('created_at', 'desc')
                ->limit(50)
                ->get();

            return response()->json([
                'success' => true,
                'data' => $purchases
            ]);

        } catch (\Exception $e) {
            Log::error('[AIGenius Payment] History error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to get purchase history'
            ], 500);
        }
    }

    /**
     * Manual complete for testing (when Fiuu callback can't reach localhost)
     */
    public function manualComplete(Request $request, $orderId)
    {
        try {
            Log::info('[AIGenius Payment] Manual complete requested', ['order_id' => $orderId]);

            $purchase = AIGeniusPurchase::where('order_id', $orderId)->first();

            if (!$purchase) {
                return response()->json([
                    'success' => false,
                    'message' => 'Purchase not found'
                ], 404);
            }

            if ($purchase->status === 'completed') {
                return response()->json([
                    'success' => false,
                    'message' => 'Purchase already completed'
                ], 400);
            }

            // Update purchase to completed
            $purchase->update([
                'status' => 'completed',
                'fiuu_transaction_id' => 'MANUAL-' . time(),
                'fiuu_status_code' => '00',
                'completed_at' => now(),
            ]);

            // Update student balance
            $this->updateStudentBalance($purchase);

            return response()->json([
                'success' => true,
                'message' => 'Purchase completed manually',
                'data' => $purchase->fresh()
            ]);

        } catch (\Exception $e) {
            Log::error('[AIGenius Payment] Manual complete error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to complete purchase',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get current balance for a student
     */
    public function balance(Request $request)
    {
        try {
            $studentId = $request->input('student_id');

            if (!$studentId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Student ID is required'
                ], 400);
            }

            $reward = AIpreneurReward::where('student_id', $studentId)->first();

            if (!$reward) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'ai_tokens' => 0,
                        'coins' => 0
                    ]
                ]);
            }

            if ((int) ($reward->coins ?? 0) > 0) {
                $reward->ai_tokens = (int) ($reward->ai_tokens ?? 0) + (int) $reward->coins;
                $reward->coins = 0;
                $reward->save();
                $reward->refresh();
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'ai_tokens' => $reward->ai_tokens ?? 0,
                    'coins' => 0
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('[AIGenius Payment] Balance error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to get balance'
            ], 500);
        }
    }
}
